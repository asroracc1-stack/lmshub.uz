// Parse raw text into structured IELTS Reading or Listening test
// Input: { kind: 'reading'|'listening', raw_text: string }
// Output: { sections: [{ title, passage?, questions: [{prompt, qtype, options?, correct_answer, points, explanation?}] }] }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are a professional IELTS exam content extractor. The user will paste raw IELTS test material. Input may be plain text OR HTML (with tags like <input>, <span>, <p>, <div>, etc.). Strip all HTML tags but PRESERVE the text content and structure (line breaks, ordering).

Return STRICT JSON only with this schema:
{
  "sections": [
    {
      "title": "Section/Passage title (e.g. 'Volunteer work application form: Grace Brown' or 'Section 1')",
      "passage": "Full passage text for Reading. For Listening: leave empty string \"\".",
      "questions": [
        {
          "prompt": "FULL line text with the blank marked as exactly three underscores ___",
          "qtype": "mcq" | "tfng" | "ynng" | "fill" | "short" | "matching" | "headings",
          "options": ["A","B","C","D"],
          "correct_answer": "exact answer",
          "points": 1,
          "explanation": ""
        }
      ]
    }
  ]
}

CRITICAL EXTRACTION RULES:
1. Extract EVERY single word from the source. NEVER use "[...]", "[…]", "..." or any placeholder. NEVER truncate. NEVER summarize.
2. The blank in a question is ALWAYS marked as "___" (exactly three underscores). Do not use "[1]", "[ ]", "_____", "[...]", or anything else.
3. For form / note / table / flow-chart completion (Listening Part 1 & 2 typically): each numbered blank = one "fill" question. The "prompt" must be the COMPLETE original line/row, including ALL surrounding words exactly as written, with the blank as ___. Examples:
   - Source: "Email address: graceb@1 [1] co.nz"  ->  prompt: "Email address: graceb@1 ___ co.nz"
   - Source: "- a diploma in [2]"  ->  prompt: "- a diploma in ___"
   - Source: "- from [3] am to 2pm Monday to Friday"  ->  prompt: "- from ___ am to 2pm Monday to Friday"
   - Source: "- likes to work in her [6]"  ->  prompt: "- likes to work in her ___"
4. Reading: 3 passages × 13-14 questions = 40 total. Listening: 4 sections × 10 questions = 40 total.
5. Preserve original numbering / ordering. Section title goes in "title".
6. If an answer key is included, fill "correct_answer" precisely (TRUE/FALSE/NOT GIVEN, YES/NO/NOT GIVEN, exact word, option letter). If not, leave "".
7. For MCQ: options must be the actual answer choices (full text), not just "A,B,C,D".
8. Output JSON only — no markdown fences, no comments, no explanations outside JSON.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { kind, raw_text } = await req.json();
    if (!raw_text || raw_text.length < 50) {
      return new Response(JSON.stringify({ error: "raw_text too short" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Test type: ${kind}\n\nRAW MATERIAL:\n${raw_text}` },
        ],
      }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const data = await r.json();
    let text = data?.choices?.[0]?.message?.content ?? "";
    text = text.replace(/^```json\s*|```$/gim, "").trim();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch {/**/}
    }
    if (!parsed?.sections) return new Response(JSON.stringify({ error: "AI returned invalid JSON", raw: text }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
