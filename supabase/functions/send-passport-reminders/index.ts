import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = req.headers.get("X-Cron-Secret");
  if (secret !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split("T")[0];
  const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: profiles, error } = await adminClient
    .from("profiles")
    .select("id, full_name, passport_expiry")
    .gte("passport_expiry", today)
    .lte("passport_expiry", in60Days);

  if (error || !profiles) return new Response(JSON.stringify({ error: "DB error" }), { status: 500 });

  const results = [];
  for (const profile of profiles) {
    const { data: authUser } = await adminClient.auth.admin.getUserById(profile.id);
    if (!authUser?.user?.email) continue;

    const daysLeft = Math.ceil((new Date(profile.passport_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const name = profile.full_name || "Traveler";

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Travel Concierge <noreply@${Deno.env.get("RESEND_FROM_DOMAIN") || "yourdomain.com"}>`,
        to: authUser.user.email,
        subject: `⚠️ Your passport expires in ${daysLeft} days`,
        html: `
          <h2>Passport Expiry Alert</h2>
          <p>Hello ${name},</p>
          <p>Your passport expires on <strong>${profile.passport_expiry}</strong> — that is <strong>${daysLeft} days from today.</strong></p>
          <p>Most countries require at least 6 months of validity beyond your entry date. Please plan your renewal now to avoid being denied boarding.</p>
          <p><a href="https://travel-assistant-inky.vercel.app">Open Travel Concierge →</a></p>
        `,
      }),
    });
    results.push({ email: authUser.user.email, status: emailRes.status });
  }

  return new Response(JSON.stringify({ sent: results.length, results }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
