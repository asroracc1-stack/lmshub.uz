// telegram-notify edge function
// Sends a beautifully formatted payment receipt to the SELECTED recipient
// (admin or administrator chosen by student) on Telegram.
// Body: { payment_id: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const APP_URL = Deno.env.get("APP_URL") ?? "https://lmshub.lovable.app";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function tgRequest(method: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!BOT_TOKEN) return json({ error: "TELEGRAM_BOT_TOKEN not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const paymentId = String(body?.payment_id ?? "");
    if (!paymentId) return json({ error: "payment_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: payment, error: pErr } = await admin
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();
    if (pErr || !payment) return json({ error: "Payment not found" }, 404);

    if (payment.student_id !== callerId) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role, organization_id")
        .eq("user_id", callerId);
      const isManager = (roles ?? []).some(
        (r) =>
          ["admin", "administrator", "super_admin"].includes(r.role) &&
          (r.role === "super_admin" || r.organization_id === payment.organization_id),
      );
      if (!isManager) return json({ error: "Forbidden" }, 403);
    }

    const { data: student } = await admin
      .from("profiles")
      .select("full_name, username, phone")
      .eq("id", payment.student_id)
      .maybeSingle();

    const { data: org } = await admin
      .from("organizations")
      .select("name, telegram_chat_id")
      .eq("id", payment.organization_id)
      .maybeSingle();

    // Determine target chat IDs
    const chatIds = new Set<string>();
    let recipientName = "";

    if (payment.receiver_id) {
      // Super-admin managed payment receiver (payment_receivers table)
      const { data: rec } = await admin
        .from("payment_receivers")
        .select("telegram_chat_id, telegram_username, full_name")
        .eq("id", payment.receiver_id)
        .maybeSingle();
      if (rec?.telegram_chat_id) chatIds.add(String(rec.telegram_chat_id));
      recipientName = rec?.full_name || (rec?.telegram_username ? `@${rec.telegram_username}` : "");
    } else if (payment.recipient_id) {
      // Send to the chosen profile recipient ONLY
      const { data: rec } = await admin
        .from("profiles")
        .select("telegram_chat_id, full_name, username")
        .eq("id", payment.recipient_id)
        .maybeSingle();
      if (rec?.telegram_chat_id) chatIds.add(String(rec.telegram_chat_id));
      recipientName = rec?.full_name || rec?.username || "";
    } else {
      // Fallback: notify all org managers
      const { data: orgAdmins } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("organization_id", payment.organization_id)
        .in("role", ["admin", "administrator"]);
      const adminIds = (orgAdmins ?? []).map((r) => r.user_id);
      const { data: adminProfiles } = adminIds.length
        ? await admin.from("profiles").select("telegram_chat_id").in("id", adminIds)
        : { data: [] as any[] };
      (adminProfiles ?? []).forEach((p: any) => {
        if (p.telegram_chat_id) chatIds.add(String(p.telegram_chat_id));
      });
      if (org?.telegram_chat_id) chatIds.add(String(org.telegram_chat_id));
    }

    if (chatIds.size === 0) {
      return json({
        ok: false,
        warning: "Tanlangan qabul qiluvchining Telegram chat ID si yo'q. Profile dan qo'shilishi kerak.",
      });
    }

    let photoUrl: string | null = null;
    if (payment.receipt_url) {
      const { data: signed } = await admin.storage
        .from("receipts")
        .createSignedUrl(payment.receipt_url, 60 * 60 * 24 * 7);
      photoUrl = signed?.signedUrl ?? null;
    }

    const studentName = student?.full_name || student?.username || "Talaba";
    const phone = student?.phone ? `\n📞 <code>${student.phone}</code>` : "";
    const note = payment.note ? `\n📝 <i>${payment.note}</i>` : "";
    const amount = Number(payment.amount).toLocaleString("uz-UZ");
    const dateStr = new Date(payment.created_at).toLocaleString("uz-UZ", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const paymentsLink = `${APP_URL}/${payment.recipient_role || "admin"}/payments`;

    const caption =
      `╔═══════════════════════╗\n` +
      `   <b>💳 YANGI TO'LOV CHEKI</b>\n` +
      `╚═══════════════════════╝\n\n` +
      `🏫 <b>Tashkilot:</b> ${org?.name ?? "—"}\n` +
      `👤 <b>Talaba:</b> ${studentName}${phone}\n` +
      `💰 <b>Summa:</b> <code>${amount} ${payment.currency}</code>\n` +
      `📅 <b>Sana:</b> ${dateStr}` +
      (recipientName ? `\n🎯 <b>Qabul qiluvchi:</b> ${recipientName}` : "") +
      `${note}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏳ Holati: <b>Tasdiqlash kutilmoqda</b>\n` +
      `🔗 Tasdiqlash: <a href="${paymentsLink}">Saytda ochish</a>`;

    const replyMarkup = {
      inline_keyboard: [[
        { text: "✅ Saytda tasdiqlash", url: paymentsLink },
      ]],
    };

    const results: any[] = [];
    for (const chatId of chatIds) {
      try {
        const r = photoUrl
          ? await tgRequest("sendPhoto", {
              chat_id: chatId,
              photo: photoUrl,
              caption,
              parse_mode: "HTML",
              reply_markup: replyMarkup,
            })
          : await tgRequest("sendMessage", {
              chat_id: chatId,
              text: caption,
              parse_mode: "HTML",
              disable_web_page_preview: false,
              reply_markup: replyMarkup,
            });
        results.push({ chatId, ok: r.ok, description: r.description });
      } catch (e) {
        results.push({ chatId, ok: false, error: String((e as Error).message) });
      }
    }

    return json({ ok: true, sent: results.length, results });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
