import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireAuth(req);
    const { trip_id, raw_text } = await req.json();

    if (!trip_id || !raw_text) {
      return new Response(JSON.stringify({ error: "trip_id and raw_text are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500,
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

    // 2. Call Gemini
    const prompt = `
      Extract travel itinerary details from the text below. 
      Return ONLY a valid JSON object. Do not explain anything.
      If a field is unknown, use null.
      
      Fields:
      - airline: name of the airline
      - flightNumber: flight number string
      - departureCity: city of departure
      - arrivalCity: city of arrival
      - departureDate: YYYY-MM-DD
      - departureTime: HH:MM (24h)
      - terminal: terminal string
      - gate: gate string
      - seat: seat string
      - confirmationCode: booking reference
      - hotelName: hotel name
      - hotelAddress: full address
      - hotelCheckin: check-in date YYYY-MM-DD
      
      Text to parse:
      ${raw_text}
    `;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      }
    );

    if (!geminiRes.ok) throw new Error("Gemini API failed");

    const geminiData = await geminiRes.json();
    const itinerary = JSON.parse(geminiData.candidates[0].content.parts[0].text);

    // 3. Save to database
    await supabaseAdmin
      .from("trips")
      .update({ parsed_itinerary: itinerary })
      .eq("id", trip_id);

    return new Response(JSON.stringify({ success: true, itinerary }), {
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
