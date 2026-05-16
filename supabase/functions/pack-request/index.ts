// pack-request edge function
// Sends a pack purchase request to the configured Telegram chat (Ahror @mr_ahror_70)
// Body: { pack_id: string, sub_id?: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

const PACK_ADMIN_CHAT_ID = "1083084617";
const PACK_ADMIN_USERNAME = "mr_ahror_70";
const CARD_NUMBER = "9860 1701 0590 7738";
const CARD_OWNER = "Ahror Fayzullayev";

const j = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!BOT_TOKEN) return j({ error: "TELEGRAM_BOT_TOKEN not configured" }, 500);

    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);
    const token = auth.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) return j({ error: "Unauthorized" }, 401);
    const uid = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const packId = String(body?.pack_id ?? "");
    if (!packId) return j({ error: "pack_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const [{ data: pack }, { data: prof }] = await Promise.all([
      admin.from("subscription_packs").select("*").eq("id", packId).maybeSingle(),
      admin.from("profiles").select("full_name, username, phone, telegram_username").eq("id", uid).maybeSingle(),
    ]);
    if (!pack) return j({ error: "Pack not found" }, 404);

    const name = prof?.full_name || prof?.username || "Foydalanuvchi";
    const tg = prof?.telegram_username ? `\n💬 <b>Telegram:</b> @${String(prof.telegram_username).replace(/^@/, "")}` : "";
    const phone = prof?.phone ? `\n📞 <b>Telefon:</b> <code>${prof.phone}</code>` : "";

    const text =
      `╔═══════════════════════╗\n` +
      `   <b>👑 YANGI PACK SO'ROVI</b>\n` +
      `╚═══════════════════════╝\n\n` +
      `🎯 <b>Pack:</b> ${pack.name}\n` +
      `💰 <b>Narx:</b> <code>${Number(pack.price_uzs).toLocaleString("uz-UZ")} UZS</code>\n` +
      `⏳ <b>Muddat:</b> ${pack.duration_days} kun\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Foydalanuvchi:</b> ${name}${tg}${phone}\n\n` +
      `💳 <b>Karta:</b> <code>${CARD_NUMBER}</code>\n` +
      `🧑‍💼 <b>Egasi:</b> ${CARD_OWNER}\n\n` +
      `⏳ <i>To'lov tasdiqlangach paket avtomatik faollashadi.</i>`;

    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: PACK_ADMIN_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const tgRes = await r.json();
    if (!tgRes.ok) return j({ error: "Telegram failed", detail: tgRes }, 500);

    return j({ ok: true, recipient: PACK_ADMIN_USERNAME });
  } catch (e) {
    return j({ error: String((e as Error).message ?? e) }, 500);
  }
});
