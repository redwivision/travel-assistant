import { corsHeaders } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

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

const OPENWEATHER_API_KEY = Deno.env.get("OPENWEATHER_API_KEY");

// Map countries to major cities for weather lookups
const countryToCities: Record<string, string[]> = {
  "kenya": ["Nairobi", "Mombasa", "Kisumu"],
  "uganda": ["Kampala", "Entebbe", "Jinja"],
  "france": ["Paris", "Marseille", "Lyon", "Nice"],
  "netherlands": ["Amsterdam", "Rotterdam", "Utrecht"],
  "south africa": ["Cape Town", "Johannesburg", "Durban"],
  "madagascar": ["Antananarivo", "Nosy Be", "Toamasina"],
  "south sudan": ["Juba", "Malakal", "Wau"],
  "uae": ["Dubai", "Abu Dhabi", "Sharjah"],
  "usa": ["New York", "Los Angeles", "Chicago", "Miami"],
  "ethiopia": ["Addis Ababa", "Dire Dawa", "Bahir Dar"],
  "botswana": ["Gaborone", "Francistown"],
  "mozambique": ["Maputo", "Beira", "Nampula"],
};

function mapWeatherCondition(main: string, description: string): Condition {
  const desc = description.toLowerCase();
  if (main === "Clear") return "Sunny";
  if (main === "Clouds") {
    if (desc.includes("few") || desc.includes("scattered")) return "Partly Cloudy";
    return "Cloudy";
  }
  if (main === "Rain") {
    if (desc.includes("heavy") || desc.includes("extreme")) return "Heavy Rain";
    return "Light Rain";
  }
  if (main === "Drizzle") return "Light Rain";
  if (main === "Thunderstorm") return "Thunderstorm";
  if (main === "Atmosphere") return "Windy";
  return "Partly Cloudy";
}

async function fetchRealWeather(city: string): Promise<any[]> {
  if (!OPENWEATHER_API_KEY) throw new Error("No API key");

  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather API error: ${res.statusText}`);
  
  const data = await res.json();
  const list = data.list;

  // Aggregate 3-hourly data into daily High/Low
  const dailyData: Record<string, any> = {};

  list.forEach((item: any) => {
    const date = item.dt_txt.split(" ")[0]; // "YYYY-MM-DD"
    if (!dailyData[date]) {
      dailyData[date] = {
        date,
        tempHigh: item.main.temp_max,
        tempLow: item.main.temp_min,
        condition: mapWeatherCondition(item.weather[0].main, item.weather[0].description)
      };
    } else {
      dailyData[date].tempHigh = Math.max(dailyData[date].tempHigh, item.main.temp_max);
      dailyData[date].tempLow = Math.min(dailyData[date].tempLow, item.main.temp_min);
    }
  });

  return Object.values(dailyData).slice(0, 7); // Return up to 7 days
}

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function generateForecast(pattern: any, startDate?: string) {
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
    await requireAuth(req);
    const { destination, city, start_date } = await req.json();

    if (!destination) {
      return new Response(
        JSON.stringify({ error: "destination is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const key = destination.toLowerCase().trim();
    const cities = countryToCities[key] || [];
    const lookupCity = city || cities[0] || destination;

    let forecast;
    let isReal = false;

    if (OPENWEATHER_API_KEY) {
      try {
        forecast = await fetchRealWeather(lookupCity);
        isReal = true;
      } catch (err) {
        console.error("Real weather fetch failed, falling back to simulated:", err);
      }
    }

    if (!forecast) {
      const pattern = climatePatterns[key] ?? {
        tempLowRange: [12, 20] as [number, number],
        tempHighRange: [22, 32] as [number, number],
        conditions: ["Sunny", "Partly Cloudy", "Light Rain"] as Condition[],
      };
      forecast = generateForecast(pattern, start_date);
    }

    return new Response(
      JSON.stringify({ destination, city: lookupCity, forecast, isReal }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    return new Response(
      JSON.stringify({ error: "Invalid request body", detail: String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
