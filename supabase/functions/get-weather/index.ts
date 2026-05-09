import { corsHeaders } from "../_shared/cors.ts";

type Condition = "Sunny" | "Partly Cloudy" | "Cloudy" | "Light Rain" | "Heavy Rain" | "Thunderstorm" | "Windy";

// Climate patterns: [minLow, maxLow, minHigh, maxHigh, conditions[]]
const climatePatterns: Record<string, {
  tempLowRange: [number, number];
  tempHighRange: [number, number];
  conditions: Condition[];
}> = {
  kenya: {
    tempLowRange: [14, 18],
    tempHighRange: [24, 28],
    conditions: ["Sunny", "Partly Cloudy", "Light Rain", "Cloudy"],
  },
  uganda: {
    tempLowRange: [15, 19],
    tempHighRange: [25, 29],
    conditions: ["Partly Cloudy", "Light Rain", "Heavy Rain", "Sunny"],
  },
  france: {
    tempLowRange: [8, 16],
    tempHighRange: [16, 26],
    conditions: ["Cloudy", "Light Rain", "Sunny", "Partly Cloudy"],
  },
  netherlands: {
    tempLowRange: [5, 14],
    tempHighRange: [12, 22],
    conditions: ["Cloudy", "Light Rain", "Windy", "Partly Cloudy"],
  },
  "south africa": {
    tempLowRange: [10, 18],
    tempHighRange: [22, 30],
    conditions: ["Sunny", "Partly Cloudy", "Windy", "Light Rain"],
  },
  madagascar: {
    tempLowRange: [16, 22],
    tempHighRange: [26, 33],
    conditions: ["Sunny", "Heavy Rain", "Thunderstorm", "Partly Cloudy"],
  },
  "south sudan": {
    tempLowRange: [22, 26],
    tempHighRange: [34, 40],
    conditions: ["Sunny", "Partly Cloudy", "Heavy Rain", "Thunderstorm"],
  },
  uae: {
    tempLowRange: [20, 30],
    tempHighRange: [32, 45],
    conditions: ["Sunny", "Sunny", "Sunny", "Partly Cloudy", "Windy"],
  },
  usa: {
    tempLowRange: [5, 20],
    tempHighRange: [15, 32],
    conditions: ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain"],
  },
  ethiopia: {
    tempLowRange: [10, 16],
    tempHighRange: [22, 28],
    conditions: ["Sunny", "Partly Cloudy", "Light Rain", "Cloudy"],
  },
};

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function generateForecast(pattern: typeof climatePatterns[string], startDate?: string) {
  const days: { date: string; tempHigh: number; tempLow: number; condition: Condition }[] = [];
  const baseDate = startDate ? new Date(startDate) : new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + i);
    const condition = pattern.conditions[Math.floor(Math.random() * pattern.conditions.length)];
    days.push({
      date: date.toISOString().split("T")[0],
      tempHigh: randomBetween(pattern.tempHighRange[0], pattern.tempHighRange[1]),
      tempLow: randomBetween(pattern.tempLowRange[0], pattern.tempLowRange[1]),
      condition,
    });
  }
  return days;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { destination, start_date } = await req.json();

    if (!destination) {
      return new Response(
        JSON.stringify({ error: "destination is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const key = destination.toLowerCase().trim();
    const pattern = climatePatterns[key] ?? {
      tempLowRange: [12, 20] as [number, number],
      tempHighRange: [22, 32] as [number, number],
      conditions: ["Sunny", "Partly Cloudy", "Light Rain"] as Condition[],
    };

    const forecast = generateForecast(pattern, start_date);

    return new Response(
      JSON.stringify({ destination, forecast }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid request body", detail: String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
