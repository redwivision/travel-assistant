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
    const { trip_id } = await req.json();

    if (!trip_id) {
      return new Response(JSON.stringify({ error: "trip_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get user profile (credits) and trip
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("free_credits")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) throw new Response("Profile not found", { status: 404 });

    if (profile.free_credits <= 0) {
      return new Response(JSON.stringify({ error: "No trial credits remaining" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. verify trip ownership
    const { data: trip, error: tripError } = await supabaseAdmin
      .from("trips")
      .select("*")
      .eq("id", trip_id)
      .eq("user_id", user.id)
      .single();

    if (tripError || !trip) {
      return new Response(JSON.stringify({ error: "Trip not found or unauthorized" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (trip.trip_status === 'paid') {
      return new Response(JSON.stringify({ error: "Trip already paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Atomically decrement credits using a conditional update to prevent race conditions.
    // This will only succeed if free_credits is still > 0 at write time.
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ free_credits: profile.free_credits - 1 })
      .eq("id", user.id)
      .gte("free_credits", 1) // Guard: only update if credits still available
      .select()
      .single();

    if (updateError || !updatedProfile) {
      return new Response(JSON.stringify({ error: "Credit already used. Please try again." }), {
        status: 409, // Conflict
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin
      .from("trips")
      .update({ trip_status: "paid" })
      .eq("id", trip_id);

    return new Response(JSON.stringify({ success: true, remaining_credits: updatedProfile.free_credits }), {
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
