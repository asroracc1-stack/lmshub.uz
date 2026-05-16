// Grades a Writing/Speaking mock answer with Lovable AI; updates the attempt row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const u = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: who } = await u.auth.getUser();
    if (!who?.user) return json({ error: "Unauthorized" }, 401);

    const { attempt_id, prompt, answer, kind = "writing" } = await req.json();
    if (!attempt_id || !answer) return json({ error: "attempt_id, answer required" }, 400);

    const sys = `You are a strict but fair IELTS examiner for ${kind}. Return ONLY JSON: {"band":number(0-9, 0.5 step), "feedback":"markdown 4-6 lines covering Task achievement, Coherence, Lexical, Grammar"}`;
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Prompt:\n${prompt ?? ""}\n\nLearner answer:\n${answer}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (r.status === 429) return json({ error: "Rate limit" }, 429);
    if (r.status === 402) return json({ error: "Credit required" }, 402);
    if (!r.ok) return json({ error: await r.text() }, 500);
    const data = await r.json();
    let parsed: { band: number; feedback: string };
    try { parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}"); }
    catch { return json({ error: "AI returned invalid JSON" }, 500); }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    await admin.from("mock_attempts").update({
      band_score: parsed.band,
      ai_feedback: parsed.feedback,
      status: "graded",
      finished_at: new Date().toISOString(),
    }).eq("id", attempt_id).eq("student_id", who.user.id);

    return json({ ok: true, band: parsed.band, feedback: parsed.feedback });
  } catch (e) { return json({ error: String((e as Error).message) }, 500); }
});
