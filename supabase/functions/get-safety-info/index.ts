import { corsHeaders } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

const safetyData: Record<string, {
  safetyLevel: "Low" | "Medium" | "High";
  sources: { name: string; rating: string; lastUpdated: string }[];
  generalAdvice: string;
}> = {
  kenya: {
    safetyLevel: "Medium",
    sources: [
      { name: "UK FCDO", rating: "Exercise normal precautions in Nairobi CBD", lastUpdated: "2025-03-01" },
      { name: "US DOS", rating: "Level 2: Exercise Increased Caution", lastUpdated: "2025-02-15" },
    ],
    generalAdvice:
      "Nairobi is generally safe for tourists in main areas. Avoid Eastleigh and Kibera at night. Petty theft is common — keep valuables secure. Use registered taxis or Bolt/Uber.",
  },
  uganda: {
    safetyLevel: "Medium",
    sources: [
      { name: "UK FCDO", rating: "Exercise normal precautions", lastUpdated: "2025-01-20" },
      { name: "US DOS", rating: "Level 2: Exercise Increased Caution", lastUpdated: "2024-12-10" },
    ],
    generalAdvice:
      "Kampala is relatively safe. Avoid walking alone at night. Northern Uganda near South Sudan border warrants extra caution. Gorilla trekking areas are safe with registered guides.",
  },
  france: {
    safetyLevel: "Low",
    sources: [
      { name: "UK FCDO", rating: "Exercise normal precautions", lastUpdated: "2025-04-01" },
      { name: "US DOS", rating: "Level 2: Exercise Increased Caution (terrorism risk)", lastUpdated: "2025-03-20" },
    ],
    generalAdvice:
      "France is generally very safe. Beware of pickpockets in Paris — especially near Eiffel Tower, Louvre, and on the Metro. Terrorism risk is low but real; stay alert in crowded areas.",
  },
  netherlands: {
    safetyLevel: "Low",
    sources: [
      { name: "UK FCDO", rating: "Exercise normal precautions", lastUpdated: "2025-04-01" },
      { name: "US DOS", rating: "Level 1: Exercise Normal Precautions", lastUpdated: "2025-02-01" },
    ],
    generalAdvice:
      "Netherlands is one of the safest countries in Europe. Watch for bicycle lanes when crossing streets in Amsterdam. Pickpocketing exists in tourist areas.",
  },
  "south africa": {
    safetyLevel: "High",
    sources: [
      { name: "UK FCDO", rating: "High crime levels, exercise extreme caution", lastUpdated: "2025-03-15" },
      { name: "US DOS", rating: "Level 2: Exercise Increased Caution", lastUpdated: "2025-01-30" },
    ],
    generalAdvice:
      "South Africa has high crime rates, including violent crime. Avoid township areas without a registered guide. Do not display expensive items. Use hotel-recommended transport. Emergency: 10111.",
  },
  madagascar: {
    safetyLevel: "Medium",
    sources: [
      { name: "UK FCDO", rating: "Exercise high degree of caution", lastUpdated: "2024-11-01" },
      { name: "US DOS", rating: "Level 2: Exercise Increased Caution", lastUpdated: "2024-10-15" },
    ],
    generalAdvice:
      "Antananarivo has petty crime risks. Avoid walking at night. Road travel outside the capital can be risky during cyclone season (Nov–April). Use a registered tour operator.",
  },
  "south sudan": {
    safetyLevel: "High",
    sources: [
      { name: "UK FCDO", rating: "Advise against all but essential travel", lastUpdated: "2025-04-01" },
      { name: "US DOS", rating: "Level 4: Do Not Travel", lastUpdated: "2025-03-01" },
    ],
    generalAdvice:
      "South Sudan has ongoing armed conflict in several regions. Only travel if absolutely essential. Register with your embassy. Keep a low profile and have an emergency evacuation plan.",
  },
  uae: {
    safetyLevel: "Low",
    sources: [
      { name: "UK FCDO", rating: "Exercise normal precautions", lastUpdated: "2025-04-01" },
      { name: "US DOS", rating: "Level 1: Exercise Normal Precautions", lastUpdated: "2025-02-10" },
    ],
    generalAdvice:
      "UAE (Dubai/Abu Dhabi) is very safe for tourists. Respect local laws — public displays of affection, alcohol outside licensed venues, and VPN use can result in fines. Dress modestly outside resort areas.",
  },
  usa: {
    safetyLevel: "Low",
    sources: [
      { name: "UK FCDO", rating: "Exercise normal precautions", lastUpdated: "2025-04-01" },
      { name: "US DOS", rating: "Level 1: Domestic (N/A)", lastUpdated: "2025-01-01" },
    ],
    generalAdvice:
      "USA is generally safe in tourist areas. Crime rates vary significantly by city and neighborhood. Research your specific destination. Emergency: 911.",
  },
  ethiopia: {
    safetyLevel: "Medium",
    sources: [
      { name: "UK FCDO", rating: "Exercise high degree of caution", lastUpdated: "2025-04-01" },
      { name: "US DOS", rating: "Level 2: Exercise Increased Caution", lastUpdated: "2025-03-01" },
    ],
    generalAdvice:
      "Addis Ababa is generally safe in the city center. Avoid border regions (Tigray, Afar, Somalia border). Political demonstrations can occur. Internet may be interrupted. Emergency: 911.",
  },
  mozambique: {
    safetyLevel: "Medium",
    sources: [
      { name: "UK FCDO", rating: "Exercise high degree of caution", lastUpdated: "2025-03-10" },
      { name: "US DOS", rating: "Level 2: Exercise Increased Caution", lastUpdated: "2024-11-20" },
    ],
    generalAdvice:
      "Maputo has high rates of petty crime. Avoid walking alone at night. Security incidents occur in the northern Cabo Delgado province; avoid travel there.",
  },
  zimbabwe: {
    safetyLevel: "Medium",
    sources: [
      { name: "UK FCDO", rating: "Exercise high degree of caution", lastUpdated: "2025-02-15" },
      { name: "US DOS", rating: "Level 2: Exercise Increased Caution", lastUpdated: "2025-01-10" },
    ],
    generalAdvice:
      "Zimbabwe is generally safe for tourists, especially around Victoria Falls. Petty crime occurs in Harare and Bulawayo. Carry cash as credit card networks can be unreliable.",
  },
  botswana: {
    safetyLevel: "Low",
    sources: [
      { name: "UK FCDO", rating: "Exercise normal precautions", lastUpdated: "2025-04-01" },
      { name: "US DOS", rating: "Level 1: Exercise Normal Precautions", lastUpdated: "2024-12-05" },
    ],
    generalAdvice:
      "Botswana is one of the safest countries in Africa. Crime against tourists is rare. Be cautious of wildlife when driving outside urban areas.",
  },
  germany: {
    safetyLevel: "Low",
    sources: [
      { name: "UK FCDO", rating: "Exercise normal precautions", lastUpdated: "2025-04-01" },
      { name: "US DOS", rating: "Level 2: Exercise Increased Caution (terrorism risk)", lastUpdated: "2025-02-10" },
    ],
    generalAdvice:
      "Germany is very safe. Petty crime like pickpocketing happens in busy train stations and tourist hubs. Be aware of your surroundings in large crowds.",
  },
  thailand: {
    safetyLevel: "Medium",
    sources: [
      { name: "UK FCDO", rating: "Exercise high degree of caution", lastUpdated: "2025-03-25" },
      { name: "US DOS", rating: "Level 1: Exercise Normal Precautions", lastUpdated: "2025-01-20" },
    ],
    generalAdvice:
      "Avoid the deep southern provinces near the Malaysia border due to insurgent activity. Tourist areas (Bangkok, Phuket, Chiang Mai) are safe but watch out for scams and pickpockets.",
  },
  philippines: {
    safetyLevel: "Medium",
    sources: [
      { name: "UK FCDO", rating: "Exercise high degree of caution", lastUpdated: "2025-01-30" },
      { name: "US DOS", rating: "Level 2: Exercise Increased Caution", lastUpdated: "2024-11-15" },
    ],
    generalAdvice:
      "Tourist areas like Palawan, Boracay, and Metro Manila business districts are generally safe. Avoid travel to the Sulu Archipelago and Marawi City due to terrorism risks.",
  },
  brazil: {
    safetyLevel: "High",
    sources: [
      { name: "UK FCDO", rating: "Exercise high degree of caution", lastUpdated: "2025-02-28" },
      { name: "US DOS", rating: "Level 2: Exercise Increased Caution", lastUpdated: "2025-01-05" },
    ],
    generalAdvice:
      "High rates of violent crime, especially in major cities like Rio de Janeiro and São Paulo. Avoid favelas. Do not display expensive jewelry or electronics. Use registered taxis.",
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await requireAuth(req);
    const { destination } = await req.json();

    if (!destination) {
      return new Response(
        JSON.stringify({ error: "destination is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const key = destination.toLowerCase().trim();
    const result = safetyData[key];

    if (!result) {
      return new Response(
        JSON.stringify({
          safetyLevel: "Medium",
          sources: [{ name: "General Advisory", rating: "Check your government travel advisory", lastUpdated: new Date().toISOString().split("T")[0] }],
          generalAdvice: `No specific safety data for ${destination}. Check your country's official travel advisory before departure.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(result), {
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
