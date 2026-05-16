// signup-request edge function
// Public endpoint: validates and creates a new user account with role='user'.
// After this, the client calls supabase.auth.signInWithOtp({email}) which
// sends a 6-digit OTP via Supabase's email infrastructure. The client then
// verifies with verifyOtp({email, token, type: 'email'}) which both confirms
// the email AND establishes a session.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function isValidUsername(u: string) {
  return typeof u === "string" && /^[a-z0-9_.-]{3,40}$/.test(u);
}
function isValidEmail(e: string) {
  return typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 255;
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const full_name = String(body.full_name ?? "").trim();
    const username = String(body.username ?? "").trim().toLowerCase();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (full_name.length < 2 || full_name.length > 100) {
      return json({ error: "F.I.O 2-100 belgi bo'lishi kerak" }, 400);
    }
    if (!isValidUsername(username)) {
      return json({ error: "Username 3-40 belgi (a-z, 0-9, _.-)" }, 400);
    }
    if (!isValidEmail(email)) {
      return json({ error: "Email noto'g'ri" }, 400);
    }
    if (password.length < 6 || password.length > 100) {
      return json({ error: "Parol 6-100 belgi bo'lishi kerak" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check username uniqueness — but tolerate orphan profiles
    // (a profiles row whose auth user was deleted/never created). Return expected
    // validation conflicts as 200 payloads so the client can show a toast without
    // Lovable treating the edge response as a runtime crash.
    const { data: existingUser } = await admin
      .from("profiles")
      .select("id, email")
      .eq("username", username)
      .maybeSingle();

    if (existingUser) {
      // Verify whether the matching auth.users row still exists.
      const { data: authLookup } = await admin.auth.admin.getUserById(existingUser.id);
      if (authLookup?.user) {
        if (String(existingUser.email ?? "").toLowerCase() === email) {
          return json({ ok: true, user_id: existingUser.id, existing: true });
        }
        // Real, active account → username genuinely taken.
        return json({ ok: false, error: "Bu username band, boshqasini tanlang", field: "username" });
      }
      // Orphan profile → safely remove it so the new signup can proceed.
      await admin.from("user_roles").delete().eq("user_id", existingUser.id);
      await admin.from("profiles").delete().eq("id", existingUser.id);
    }

    const { data: existingEmail } = await admin
      .from("profiles")
      .select("id, username")
      .eq("email", email)
      .maybeSingle();

    if (existingEmail) {
      const { data: authLookup } = await admin.auth.admin.getUserById(existingEmail.id);
      if (authLookup?.user) {
        if (String(existingEmail.username ?? "").toLowerCase() === username) {
          return json({ ok: true, user_id: existingEmail.id, existing: true });
        }
        return json({ ok: false, error: "Bu email allaqachon ro'yxatdan o'tgan", field: "email" });
      }
      await admin.from("user_roles").delete().eq("user_id", existingEmail.id);
      await admin.from("profiles").delete().eq("id", existingEmail.id);
    }

    // IMPORTANT: The frontend signs in via username -> synthetic email
    // (`username@asror.local`). So the auth.users.email MUST be that synthetic
    // address — not the user's real email. The real email is stored separately
    // on `profiles.email` for display / contact.
    const syntheticEmail = `${username}@asror.local`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        full_name,
        role: "user",
      },
    });
    if (createErr || !created.user) {
      const msg = createErr?.message ?? "User yaratilmadi";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        return json({ ok: false, error: "Bu email allaqachon ro'yxatdan o'tgan", field: "email" });
      }
      return json({ error: msg }, 400);
    }

    // Ensure profile email is set (trigger uses NEW.email from auth.users)
    await admin
      .from("profiles")
      .update({ email, full_name })
      .eq("id", created.user.id);

    // Public signup accounts must get USER, not Talaba/student.
    await admin.from("user_roles").delete().eq("user_id", created.user.id).in("role", ["student", "user"]);
    await admin.from("user_roles").insert({ user_id: created.user.id, role: "user", organization_id: null });

    return json({ ok: true, user_id: created.user.id });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
