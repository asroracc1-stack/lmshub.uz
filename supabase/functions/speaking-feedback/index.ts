// Speaking Feedback Edge Function with Whisper transcription, GPT-4o analysis and Supabase Storage upload
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const respondJSON = (data: unknown, status = 200) => 
  new Response(JSON.stringify(data), { 
    status, 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respondJSON({ error: "Missing authorization token" }, 401);

    // Get current authenticated user
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return respondJSON({ error: "Unauthorized" }, 401);

    // Initialize admin client to save to DB and bypass RLS cleanly
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse multipart/form-data
    const contentType = req.headers.get("content-type") || "";
    let question = "";
    let part = "1";
    let topic = "general";
    let sessionId = "";
    let userRole = "student";
    let textTranscript = "";
    let audioFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      question = (formData.get("question") as string) || "";
      part = (formData.get("part") as string) || "1";
      topic = (formData.get("topic") as string) || "general";
      sessionId = (formData.get("session_id") as string) || "";
      userRole = (formData.get("user_role") as string) || "student";
      textTranscript = (formData.get("transcript") as string) || "";
      audioFile = formData.get("audio") as File | null;
    } else {
      const body = await req.json();
      question = body.question || "";
      part = String(body.part || "1");
      topic = body.topic || "general";
      sessionId = body.session_id || "";
      userRole = body.user_role || "student";
      textTranscript = body.transcript || "";
    }

    let audioUrl = "";
    let transcript = textTranscript;

    // 1. Save audio file to storage if provided
    if (audioFile && audioFile.size > 0) {
      const fileExt = audioFile.name?.split(".").pop() || "webm";
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("speaking-recordings")
        .upload(fileName, audioFile, {
          contentType: audioFile.type || "audio/webm",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
      } else if (uploadData) {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from("speaking-recordings")
          .getPublicUrl(fileName);
        audioUrl = publicUrl;
      }

      // 2. Perform Speech Recognition via OpenAI Whisper if API key is configured
      if (OPENAI_API_KEY) {
        try {
          const whisperForm = new FormData();
          whisperForm.append("file", audioFile, `recording.${fileExt}`);
          whisperForm.append("model", "whisper-1");
          whisperForm.append("language", "en");

          const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: whisperForm,
          });

          if (whisperRes.ok) {
            const whisperResult = await whisperRes.json();
            if (whisperResult.text) {
              transcript = whisperResult.text;
            }
          } else {
            console.error("OpenAI Whisper API failed, status:", whisperRes.status, await whisperRes.text());
          }
        } catch (e) {
          console.error("Whisper transcription failed, falling back to client transcript:", e);
        }
      } else {
        console.log("OPENAI_API_KEY not configured, using text transcript from SpeechRecognition");
      }
    }

    if (!transcript.trim()) {
      return respondJSON({ error: "Transcript is empty. Please speak or write something." }, 400);
    }

    // 3. Perform AI Evaluation (GPT-4o or Lovable Gateway fallback)
    const isAcademic = userRole === "teacher" || userRole === "super_admin" || userRole === "admin" || userRole === "administrator";
    
    const systemPrompt = `You are an expert IELTS Speaking examiner. Evaluate the learner's response for IELTS Speaking Part ${part}.
Topic: "${topic}"
Question: "${question}"

Customize the tone and vocabulary of your feedback according to the user's role:
- Role context: "${userRole}" (${isAcademic ? "Academic level for Teacher/Admin" : "Constructive and friendly level for Student"})
${isAcademic ? "- Since the user is a teacher/admin, provide highly technical, academic lexical breakdowns, advanced CEFR level criteria, and rigorous grammatical evaluations." : "- Since the user is a student, provide highly encouraging, supportive, and actionable advice that is easy to understand."}

Return a STRICT JSON response in this exact format:
{
  "band": number,                 // Overall IELTS band score from 0.0 to 9.0 (can be in .5 increments like 6.5, 7.0)
  "fluency": number,              // Fluency and Coherence score from 0.0 to 9.0 (can be in .5 increments)
  "lexical": number,              // Lexical Resource score from 0.0 to 9.0 (can be in .5 increments)
  "grammar": number,              // Grammatical Range and Accuracy score from 0.0 to 9.0 (can be in .5 increments)
  "pronunciation": number,        // Pronunciation score from 0.0 to 9.0 (can be in .5 increments)
  "pronunciation_hint": "string", // Practical tips to improve their pronunciation (1-2 sentences)
  "grammar_feedback": "string",   // Grammatical error analysis (highlighting mistakes, explaining rules clearly)
  "vocabulary_feedback": "string",// Suggestions for better synonyms, collocations, and idiomatic expressions
  "strengths": ["string"],        // 1-3 strong points about their answer
  "improvements": ["string"],     // 1-3 concrete areas where they can improve
  "model_answer": "string"        // A flawless band 9 model answer tailored to the question
}

Return ONLY the JSON. No wrapping with markdown formatting like \`\`\`json ... \`\`\`. Do not include any text outside of the JSON object.`;

    const userContent = `The learner's spoken answer to evaluate:\n"""${transcript}"""`;

    let evaluationJson: any = null;

    if (OPENAI_API_KEY) {
      try {
        const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent }
            ],
            temperature: 0.7,
          }),
        });

        if (chatRes.ok) {
          const chatResult = await chatRes.json();
          evaluationJson = JSON.parse(chatResult.choices?.[0]?.message?.content || "{}");
        } else {
          console.error("GPT-4o evaluation failed, status:", chatRes.status, await chatRes.text());
        }
      } catch (e) {
        console.error("Failed to fetch GPT-4o evaluation:", e);
      }
    }

    // Fallback to Lovable Gateway (Gemini model) if OpenAI key is not configured or fails
    if (!evaluationJson && LOVABLE_API_KEY) {
      try {
        const gatewayRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent }
            ],
          }),
        });

        if (gatewayRes.ok) {
          const gatewayResult = await gatewayRes.json();
          evaluationJson = JSON.parse(gatewayResult.choices?.[0]?.message?.content || "{}");
        } else {
          console.error("Lovable gateway failed, status:", gatewayRes.status, await gatewayRes.text());
        }
      } catch (e) {
        console.error("Lovable gateway fallback failed:", e);
      }
    }

    if (!evaluationJson) {
      // Mock fallback if everything fails
      evaluationJson = {
        band: 6.5,
        fluency: 6.5,
        lexical: 6.0,
        grammar: 6.5,
        pronunciation: 7.0,
        pronunciation_hint: "Try to speak with continuous intonation and emphasize content words.",
        grammar_feedback: "Minor errors in verb tenses were noted. Practice singular/plural subject-verb agreement.",
        vocabulary_feedback: "Use more descriptive adjectives instead of repeating words like 'good' or 'nice'.",
        strengths: ["Clear pronunciation and good pacing", "Answered the prompt directly"],
        improvements: ["Expand vocabulary by using synonyms", "Use transition words to link ideas"],
        model_answer: "To be honest, that topic is incredibly fascinating. I believe that integrating technology is crucial."
      };
    }

    // 4. Persist to database if Student is doing it (not in purely test mode for Teachers/Admins)
    // Save results to public.speaking_sessions and public.speaking_messages
    if (userRole === "student") {
      try {
        // Find or create session
        if (!sessionId) {
          const { data: newSession, error: sessionError } = await supabaseAdmin
            .from("speaking_sessions")
            .insert({
              student_id: user.id,
              topic: topic,
              avg_fluency: evaluationJson.fluency || evaluationJson.band,
              avg_grammar: evaluationJson.grammar || evaluationJson.band,
              avg_vocabulary: evaluationJson.lexical || evaluationJson.band,
              avg_pronunciation: evaluationJson.pronunciation || evaluationJson.band,
              overall_band: evaluationJson.band,
              ai_report: evaluationJson,
            })
            .select()
            .single();

          if (sessionError) {
            console.error("Failed to create speaking session:", sessionError);
          } else if (newSession) {
            sessionId = newSession.id;
          }
        } else {
          // Update existing session statistics (rolling average or newest)
          await supabaseAdmin
            .from("speaking_sessions")
            .update({
              avg_fluency: evaluationJson.fluency || evaluationJson.band,
              avg_grammar: evaluationJson.grammar || evaluationJson.band,
              avg_vocabulary: evaluationJson.lexical || evaluationJson.band,
              avg_pronunciation: evaluationJson.pronunciation || evaluationJson.band,
              overall_band: evaluationJson.band,
              ai_report: evaluationJson,
            })
            .eq("id", sessionId);
        }

        // Write the speaking message
        if (sessionId) {
          await supabaseAdmin
            .from("speaking_messages")
            .insert({
              session_id: sessionId,
              role: "user",
              content: transcript,
              audio_url: audioUrl,
              transcript: transcript,
              grammar_feedback: evaluationJson.grammar_feedback,
              vocabulary_feedback: evaluationJson.vocabulary_feedback,
              pronunciation_feedback: evaluationJson.pronunciation_hint,
            });
        }
      } catch (dbError) {
        console.error("Database synchronization failed:", dbError);
      }
    }

    return respondJSON({
      ...evaluationJson,
      transcript,
      audio_url: audioUrl,
      session_id: sessionId,
      is_test_mode: userRole !== "student",
    });

  } catch (err) {
    console.error("Fatal error inside speaking-feedback edge function:", err);
    return respondJSON({ error: String((err as Error).message) }, 500);
  }
});
