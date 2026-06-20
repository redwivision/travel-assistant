import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Security: Validate webhook secret to prevent fake payment events
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    const incomingSecret = req.headers.get("x-webhook-secret");
    if (webhookSecret && incomingSecret !== webhookSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized webhook" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { txn_id, amount } = await req.json();

    if (!txn_id) {
      return new Response(JSON.stringify({ error: "txn_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Check if ANY trip is waiting for a payment_ref that exists inside this raw SMS
    // The SMS might look like "You received 100 ETB. Ref: TXN123". The user's trip.payment_ref is "TXN123".
    const { data: trips, error: fetchError } = await supabaseAdmin
      .from("trips")
      .select("*")
      .eq("trip_status", "pending_verification")
      .not("payment_ref", "is", null);

    let matchedTrip = null;
    if (trips && trips.length > 0) {
      matchedTrip = trips.find(t => txn_id.includes(t.payment_ref));
    }

    if (matchedTrip) {
      console.log(`Matched payment ${txn_id} to trip ${matchedTrip.id}`);
      await supabaseAdmin.from("trips").update({ trip_status: "paid" }).eq("id", matchedTrip.id);
      return new Response(JSON.stringify({ success: true, matched: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. If no trip matched, save the RAW SMS to unclaimed_payments
    const { error: unclaimedError } = await supabaseAdmin
      .from("unclaimed_payments")
      .upsert({ txn_id, amount, used: false });

    if (unclaimedError) throw unclaimedError;

    return new Response(JSON.stringify({ success: true, matched: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
