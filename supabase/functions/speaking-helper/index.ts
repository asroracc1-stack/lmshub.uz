// Speaking helper — generates vocabulary, ideas, and sample answers for an IELTS speaking question.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const j = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

type Kind = "vocab" | "ideas" | "answers";

const PROMPTS: Record<Kind, { sys: string; user: (q: string, topic: string, part: number) => string }> = {
  vocab: {
    sys: `You are an IELTS Speaking coach. For the given question, return STRICT JSON with 10 advanced
but natural English vocabulary items (B2-C1) the learner can use in their answer.
Shape:
{
  "items": [
    { "word": string, "type": "noun|verb|adj|adv|phrase", "meaning": string, "example": string }
  ]
}
"meaning" is a short Uzbek translation/definition (1-6 words).
"example" is a short natural English sentence using the word in context. No extra text outside JSON.`,
    user: (q, topic, part) =>
      `Topic: ${topic}\nIELTS Part ${part} question: ${q}\nGenerate 10 useful words/phrases.`,
  },
  ideas: {
    sys: `You are an IELTS Speaking coach. Give the learner 3 strong content ideas they can develop
for the question. Each idea should be a clear angle with a 1-sentence reason and a short
supporting example. Return STRICT JSON:
{
  "items": [
    { "title": string, "explanation": string, "example": string }
  ]
}
"title" is short (max ~6 words). "explanation" 1 sentence English. "example" 1 sentence English.
No extra text outside JSON.`,
    user: (q, topic, part) =>
      `Topic: ${topic}\nIELTS Part ${part} question: ${q}\nGive 3 ideas the candidate can use.`,
  },
  answers: {
    sys: `You are an IELTS Speaking examiner. Produce 4 sample answers at different bands so the
learner can see progression: Band 5, Band 6.5, Band 7.5, Band 8.5. Each answer should match the
expected length for the part (Part 1: 2-3 sentences, Part 2: 4-6 sentences, Part 3: 3-5 sentences).
Return STRICT JSON:
{
  "items": [
    { "band": number, "answer": string, "highlight": string }
  ]
}
"highlight" is one short note in Uzbek explaining what makes this band level (max ~12 words).
No extra text outside JSON.`,
    user: (q, topic, part) =>
      `Topic: ${topic}\nIELTS Part ${part} question: ${q}\nWrite 4 sample answers at Bands 5, 6.5, 7.5, 8.5.`,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return j({ error: "Unauthorized" }, 401);

    const { kind, question = "", topic = "", part = 1 } = (await req.json()) as {
      kind: Kind;
      question?: string;
      topic?: string;
      part?: number;
    };
    if (!kind || !PROMPTS[kind]) return j({ error: "kind required (vocab|ideas|answers)" }, 400);
    if (!question.trim()) return j({ error: "question required" }, 400);

    const cfg = PROMPTS[kind];
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: cfg.sys },
          { role: "user", content: cfg.user(question, topic, part) },
        ],
      }),
    });
    if (r.status === 429) return j({ error: "Rate limit. Iltimos biroz kuting." }, 429);
    if (r.status === 402) return j({ error: "AI kreditlari tugadi" }, 402);
    if (!r.ok) return j({ error: await r.text() }, 500);
    const data = await r.json();
    const text = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { items: [], raw: text };
    }
    if (!Array.isArray(parsed?.items)) parsed.items = [];
    return j(parsed);
  } catch (e) {
    return j({ error: String((e as Error).message) }, 500);
  }
});
