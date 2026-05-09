import { corsHeaders } from "../_shared/cors.ts";

// Mock visa data keyed by [citizenship]_[destination]
// Format: { visaRequired, requiredDocuments, notes }
const visaData: Record<string, {
  visaRequired: boolean;
  requiredDocuments: string[];
  notes: string;
}> = {
  // Ethiopian passport → destinations
  "ethiopia_kenya": {
    visaRequired: false,
    requiredDocuments: ["Valid Ethiopian passport", "Return ticket"],
    notes: "Ethiopian citizens can enter Kenya visa-free for up to 90 days under the East African Community agreement.",
  },
  "ethiopia_uganda": {
    visaRequired: false,
    requiredDocuments: ["Valid Ethiopian passport"],
    notes: "Visa-free access for up to 90 days.",
  },
  "ethiopia_ethiopia": {
    visaRequired: false,
    requiredDocuments: ["National ID or passport"],
    notes: "No visa needed — domestic travel.",
  },
  "ethiopia_france": {
    visaRequired: true,
    requiredDocuments: [
      "Valid passport (6+ months validity)",
      "Schengen visa application form",
      "Proof of accommodation",
      "Round-trip flight booking",
      "Travel insurance (min €30,000 coverage)",
      "Bank statements (last 3 months)",
      "Employment letter or proof of enrollment",
    ],
    notes: "Apply at the French Embassy in Addis Ababa. Processing takes 15–30 working days. Apply well in advance.",
  },
  "ethiopia_netherlands": {
    visaRequired: true,
    requiredDocuments: [
      "Valid passport (6+ months validity)",
      "Schengen visa application",
      "Proof of accommodation",
      "Travel insurance",
      "Bank statements",
      "Employer letter",
    ],
    notes: "Same Schengen visa requirements as France. Apply at the Dutch Embassy or VFS Global in Addis Ababa.",
  },
  "ethiopia_south_africa": {
    visaRequired: true,
    requiredDocuments: [
      "Valid passport (30+ days beyond intended stay)",
      "South African visa application form",
      "Bank statements",
      "Hotel bookings",
      "Yellow fever vaccination certificate",
    ],
    notes: "Apply at the South African Embassy in Addis Ababa. Biometrics required.",
  },
  "ethiopia_madagascar": {
    visaRequired: true,
    requiredDocuments: [
      "Valid passport",
      "Visa on arrival available ($35 USD)",
      "Proof of accommodation",
      "Return ticket",
    ],
    notes: "Visa on arrival available at Antananarivo International Airport for 30 days.",
  },
  "ethiopia_south_sudan": {
    visaRequired: true,
    requiredDocuments: [
      "Valid passport",
      "Visa application (Embassy of South Sudan)",
      "Invitation letter recommended",
      "Yellow fever vaccination certificate",
    ],
    notes: "Check current travel advisories. Security situation may affect entry requirements.",
  },
  "ethiopia_uae": {
    visaRequired: true,
    requiredDocuments: [
      "Valid passport (6+ months validity)",
      "UAE visit visa (applied online via ICA or through airline)",
      "Hotel booking",
      "Return flight",
      "Bank statement",
    ],
    notes: "Apply for UAE visit visa online via the ICA website or through Emirates/Air Arabia. Processing takes 3–5 business days.",
  },
  "ethiopia_usa": {
    visaRequired: true,
    requiredDocuments: [
      "Valid passport",
      "DS-160 nonimmigrant visa application",
      "Interview appointment at US Embassy Addis Ababa",
      "SEVIS fee (if student)",
      "Financial documents",
      "Ties to Ethiopia (employment, property, family)",
    ],
    notes: "B1/B2 tourist visa. Interview required. Approval is not guaranteed. Apply 3–6 months ahead.",
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { citizenship = "ethiopia", destination } = await req.json();

    if (!destination) {
      return new Response(
        JSON.stringify({ error: "destination is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const key = `${citizenship.toLowerCase().replace(/\s+/g, "_")}_${destination.toLowerCase().replace(/\s+/g, "_")}`;
    const result = visaData[key];

    if (!result) {
      return new Response(
        JSON.stringify({
          visaRequired: true,
          requiredDocuments: ["Valid passport", "Check with local embassy for current requirements"],
          notes: `No specific data found for ${citizenship} → ${destination}. Always verify requirements with the official embassy before travel.`,
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
      JSON.stringify({ error: "Invalid request body", detail: String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
