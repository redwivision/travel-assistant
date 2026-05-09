import { corsHeaders } from "../_shared/cors.ts";

const electricalData: Record<string, {
  plugType: string;
  voltage: string;
  frequency: string;
}> = {
  kenya:         { plugType: "Type G (UK 3-pin)",             voltage: "240V", frequency: "50Hz" },
  uganda:        { plugType: "Type G (UK 3-pin)",             voltage: "240V", frequency: "50Hz" },
  france:        { plugType: "Type E (French/Belgian 2-pin)", voltage: "230V", frequency: "50Hz" },
  netherlands:   { plugType: "Type F (Schuko 2-pin)",         voltage: "230V", frequency: "50Hz" },
  "south africa":{ plugType: "Type M (South African 3-pin) + Type D/N", voltage: "230V", frequency: "50Hz" },
  madagascar:    { plugType: "Type C/E (European 2-pin)",     voltage: "220V", frequency: "50Hz" },
  "south sudan": { plugType: "Type C/D/G (mixed)",            voltage: "230V", frequency: "50Hz" },
  uae:           { plugType: "Type G (UK 3-pin)",             voltage: "220V", frequency: "50Hz" },
  usa:           { plugType: "Type A/B (US flat-pin)",        voltage: "120V", frequency: "60Hz" },
  ethiopia:      { plugType: "Type C/E/L (European 2-pin/Italian)", voltage: "220V", frequency: "50Hz" },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { destination } = await req.json();

    if (!destination) {
      return new Response(
        JSON.stringify({ error: "destination is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const key = destination.toLowerCase().trim();
    const result = electricalData[key];

    if (!result) {
      return new Response(
        JSON.stringify({
          plugType: "Unknown — check for your destination",
          voltage: "100–240V (use a universal adapter)",
          frequency: "50–60Hz",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid request", detail: String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
