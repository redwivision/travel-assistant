import { corsHeaders } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

const visaData: Record<string, {
  visaRequired: boolean;
  requiredDocuments: string[];
  notes: string;
  officialUrl?: string;
  needs6Months?: boolean;
  visaType?: "embassy" | "evisa" | "voa" | "free";
}> = {
  "ethiopia_south_africa": {
    visaRequired: true,
    requiredDocuments: ["Valid passport", "Completed visa application", "Proof of funds", "Return ticket"],
    notes: "Visa required. Apply via eVisa. Also requires at least 2 blank passport pages.",
    officialUrl: "https://ehome.dha.gov.za/epevisaportal",
    needs6Months: true,
    visaType: "evisa"
  },
  "ethiopia_mozambique": {
    visaRequired: true,
    requiredDocuments: ["Valid passport", "Return ticket", "Hotel booking"],
    notes: "Visa on arrival is generally available for Ethiopians, but regulations change. Visa likely required. Verify at official source.",
    officialUrl: "https://evisa.gov.mz/",
    needs6Months: true,
    visaType: "voa"
  },
  "ethiopia_madagascar": {
    visaRequired: true,
    requiredDocuments: ["Valid passport", "Return ticket"],
    notes: "eVisas available online or Visa on Arrival.",
    officialUrl: "https://evisa.gov.mg/",
    needs6Months: true,
    visaType: "evisa"
  },
  "ethiopia_kenya": {
    visaRequired: true,
    requiredDocuments: ["Valid Ethiopian passport", "Return ticket", "Hotel booking"],
    notes: "Visa required. Apply via ETA.",
    officialUrl: "https://www.etakenya.go.ke",
    needs6Months: true,
    visaType: "evisa"
  },
  "ethiopia_zimbabwe": {
    visaRequired: true,
    requiredDocuments: ["Valid passport", "Return ticket"],
    notes: "Visa on arrival is typically available for Ethiopians. Visa likely required. Verify at official source.",
    officialUrl: "https://www.evisa.gov.zw/",
    needs6Months: true,
    visaType: "voa"
  },
  "ethiopia_botswana": {
    visaRequired: true,
    requiredDocuments: ["Valid passport", "Return ticket", "Certified copy of passport", "2 passport photos"],
    notes: "Visa required. Apply at embassy. No official online portal found. Contact embassy.",
    officialUrl: "https://embassy.goabroad.com/embassies-of-botswana",
    needs6Months: true,
    visaType: "embassy"
  },
  "ethiopia_usa": {
    visaRequired: true,
    requiredDocuments: ["Valid passport", "DS-160 form", "Interview appointment", "Proof of funds/ties"],
    notes: "Visa required (complex interview process). Requires at least 2 blank passport pages.",
    officialUrl: "https://ceac.state.gov/genniv/",
    needs6Months: true,
    visaType: "embassy"
  },
  "ethiopia_germany": {
    visaRequired: true,
    requiredDocuments: ["Valid passport", "Schengen visa application", "Travel insurance", "Proof of accommodation", "Proof of funds"],
    notes: "Schengen visa required. Requires at least 2 blank passport pages.",
    officialUrl: "https://videx.diplo.de/",
    needs6Months: true,
    visaType: "embassy"
  },
  "ethiopia_thailand": {
    visaRequired: true,
    requiredDocuments: ["Valid passport", "Return ticket", "Proof of funds (10,000 THB)", "Hotel booking"],
    notes: "Visa on arrival is available for Ethiopians, but verify at official source.",
    officialUrl: "https://www.thaievisa.go.th/",
    needs6Months: true,
    visaType: "voa"
  },
  "ethiopia_philippines": {
    visaRequired: true,
    requiredDocuments: ["Valid passport", "Visa application form", "Return ticket", "Proof of financial capacity"],
    notes: "Visa required. Apply at embassy. No official online portal found. Contact embassy.",
    officialUrl: "https://embassy.goabroad.com/embassies-of-philippines",
    needs6Months: true,
    visaType: "embassy"
  },
  "ethiopia_brazil": {
    visaRequired: true,
    requiredDocuments: ["Valid passport", "Return ticket", "Proof of accommodation"],
    notes: "Visa required. Rules can be unclear for Ethiopian passport holders. Verify at official source.",
    officialUrl: "https://formulario-mre.serpro.gov.br/",
    needs6Months: true,
    visaType: "embassy"
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await requireAuth(req);
    const { citizenship = "ethiopia", destination, passportExpiry } = await req.json();

    if (!destination) {
      return new Response(
        JSON.stringify({ error: "destination is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const key = `${citizenship.toLowerCase().replace(/\s+/g, "_")}_${destination.toLowerCase().replace(/\s+/g, "_")}`;
    const result = visaData[key];

    // Check 6-month validity
    let passportAlert = null;
    if (passportExpiry) {
      const expiryDate = new Date(passportExpiry);
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      
      if (expiryDate < sixMonthsFromNow && result && result.needs6Months) {
        passportAlert = "CRITICAL: Your passport expires in less than 6 months. Most countries require 6+ months validity beyond your entry date, and you may be denied boarding.";
      }
    }

    const disclaimer = "BETA Disclaimer: Visa rules change frequently. Verified on May 2026. Always verify with the official destination embassy before travel. See an error? Let me know!";

    if (!result) {
      return new Response(
        JSON.stringify({
          visaRequired: true,
          requiredDocuments: ["Valid passport", "Check with local embassy for current requirements"],
          notes: `No specific data found for ${citizenship} → ${destination}. Visa likely required. Verify at official source.`,
          officialUrl: null,
          passportAlert,
          disclaimer,
          visaType: "embassy"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ...result, passportAlert, disclaimer }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return new Response(
      JSON.stringify({ error: "Invalid request body", detail: String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
