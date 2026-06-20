import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireAuth(req);
    const { trip_id, payment_ref } = await req.json();

    if (!trip_id || !payment_ref) {
      return new Response(JSON.stringify({ error: "trip_id and payment_ref are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Verify trip ownership
    const { data: trip, error: tripFetchError } = await supabaseAdmin
      .from("trips")
      .select("*")
      .eq("id", trip_id)
      .eq("user_id", user.id)
      .single();

    if (tripFetchError || !trip) {
      return new Response(JSON.stringify({ error: "Trip not found or unauthorized" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check if this payment_ref is inside any SMS in unclaimed_payments
    const { data: unclaimed, error: unclaimedError } = await supabaseAdmin
      .from("unclaimed_payments")
      .select("*")
      .ilike("txn_id", `%${payment_ref}%`)
      .eq("used", false)
      .limit(1)
      .maybeSingle();

    if (unclaimed) {
      // Immediate match!
      await supabaseAdmin.from("trips").update({ trip_status: "paid", payment_ref }).eq("id", trip_id);
      await supabaseAdmin.from("unclaimed_payments").update({ used: true }).eq("txn_id", payment_ref);
      
      return new Response(JSON.stringify({ success: true, status: "paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. If not found, set the trip to pending with this reference
    await supabaseAdmin
      .from("trips")
      .update({ payment_ref, trip_status: "pending_verification" })
      .eq("id", trip_id);

    return new Response(JSON.stringify({ success: true, status: "pending_verification" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
