// One-shot seeder for the default Pack Manager account (ahrorpack / pack123).
// Idempotent: only creates if the username does not already exist.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SYNTHETIC_DOMAIN = "asror.local";

const USERNAME = "ahrorpack";
const PASSWORD = "pack123";
const FULL_NAME = "Ahror Pack Manager";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const email = `${USERNAME}@${SYNTHETIC_DOMAIN}`;

    // Check if profile exists
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("username", USERNAME)
      .maybeSingle();

    if (existing?.id) {
      // Ensure role is set
      await admin.from("user_roles").delete().eq("user_id", existing.id);
      await admin.from("user_roles").insert({ user_id: existing.id, role: "payment_manager" });
      // Reset password to default
      await admin.auth.admin.updateUserById(existing.id, { password: PASSWORD });
      return json({ ok: true, action: "updated", user_id: existing.id });
    }

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: USERNAME,
        full_name: FULL_NAME,
        role: "payment_manager",
      },
    });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, action: "created", user_id: created.user?.id });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
