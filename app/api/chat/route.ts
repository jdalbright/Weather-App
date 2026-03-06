import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { DEFAULT_PERSONALITY, PERSONALITY_PROMPTS } from "@/lib/personalities";

type ChatRequestBody = {
  personality?: string;
  customPrompt?: string;
  weather?: {
    temp?: number;
    unit?: string;
    condition?: string;
    isDay?: boolean;
    localTime?: string;
    sunrise?: string;
    sunset?: string;
    windSpeed?: string;
    rainChance?: number;
    feelsLike?: number;
    uvIndex?: number;
    highTemp?: number;
    lowTemp?: number;
    aqi?: number;
    alerts?: string;
  };
};

function getSystemPrompt(body: ChatRequestBody): string {
  if (typeof body.customPrompt === "string" && body.customPrompt.trim().length > 0) {
    return body.customPrompt.trim();
  }

  if (typeof body.personality === "string" && PERSONALITY_PROMPTS[body.personality]) {
    return PERSONALITY_PROMPTS[body.personality];
  }

  return PERSONALITY_PROMPTS[DEFAULT_PERSONALITY];
}

function buildWeatherPrompt(weather: ChatRequestBody["weather"]): string {
  return [
    `Current Local Time: ${weather?.localTime ?? "Unknown"}.`,
    `Weather: ${weather?.temp ?? "?"}°${weather?.unit ?? "F"} (${weather?.condition ?? "Unknown conditions"}).`,
    `Feels Like: ${weather?.feelsLike ?? "?"}°.`,
    `Daily High/Low: ${weather?.highTemp ?? "?"}°/${weather?.lowTemp ?? "?"}°.`,
    `Daylight: ${weather?.isDay ? "Daytime" : "Nighttime"}.`,
    weather?.sunrise || weather?.sunset
      ? `Sunrise/Sunset: ${weather?.sunrise ?? "Unknown"}/${weather?.sunset ?? "Unknown"}.`
      : null,
    `Wind Speed: ${weather?.windSpeed ?? "Unknown"}.`,
    `Rain Chance: ${weather?.rainChance ?? 0}%.`,
    `UV Index: ${weather?.uvIndex ?? 0}.`,
    weather?.aqi != null ? `Air Quality Index (US AQI): ${weather.aqi}.` : null,
    weather?.alerts ? `Weather Alerts: ${weather.alerts}.` : null,
    "Give short, practical advice that reflects the conditions and time of day.",
  ].filter(Boolean).join(" ");
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as ChatRequestBody;
    const systemPrompt = getSystemPrompt(body);

    if (!process.env.AI_GATEWAY_API_KEY) {
      return Response.json({
        text: `[MOCK ${body.personality ?? DEFAULT_PERSONALITY}]: It's ${body.weather?.temp ?? "?"}°${body.weather?.unit ?? "F"} and ${body.weather?.condition ?? "unclear"}, so plan accordingly.`,
      });
    }

    const gatewayProvider = createOpenAI({
      apiKey: process.env.AI_GATEWAY_API_KEY,
      baseURL: "https://ai-gateway.vercel.sh/v1",
    });

    const { text } = await generateText({
      model: gatewayProvider("gemini-3.1-flash-lite-preview"),
      system: systemPrompt,
      prompt: buildWeatherPrompt(body.weather),
    });

    return Response.json({ text });
  } catch (error) {
    console.error("AI Generation Error", error);
    const errorMessage = error instanceof Error ? error.message : "";

    return Response.json(
      { text: `Sorry, I'm feeling under the weather. ${errorMessage}`.trim() },
      { status: 500 }
    );
  }
}
