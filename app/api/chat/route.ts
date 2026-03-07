import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { DEFAULT_PERSONALITY, PERSONALITY_PROMPTS } from "@/lib/personalities";
import { buildWeatherPrompt, type ChatWeatherPayload } from "@/lib/weather-advice";
import { z } from "zod";

type ChatRequestBody = {
  personality?: string;
  customPrompt?: string;
  weather?: ChatWeatherPayload;
};

const weatherAdviceSchema = z.object({
  heroText: z.string().min(1),
  next24Text: z.string().min(1),
  adviceText: z.string().min(1),
});

function getSystemPrompt(body: ChatRequestBody): string {
  if (typeof body.customPrompt === "string" && body.customPrompt.trim().length > 0) {
    return body.customPrompt.trim();
  }

  if (typeof body.personality === "string" && PERSONALITY_PROMPTS[body.personality]) {
    return PERSONALITY_PROMPTS[body.personality];
  }

  return PERSONALITY_PROMPTS[DEFAULT_PERSONALITY];
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as ChatRequestBody;
    const systemPrompt = getSystemPrompt(body);

    if (!process.env.AI_GATEWAY_API_KEY) {
      return Response.json({
        heroText: `[MOCK ${body.personality ?? DEFAULT_PERSONALITY}] Right now it is ${body.weather?.condition ?? "unclear"} and ${body.weather?.temp ?? "?"}°${body.weather?.unit ?? "F"}.`,
        next24Text: `[MOCK ${body.personality ?? DEFAULT_PERSONALITY}] ${body.weather?.condition ?? "Unclear weather"} holds into the next stretch with highs near ${body.weather?.highTemp ?? "?"}° and lows near ${body.weather?.lowTemp ?? "?"}°.`,
        adviceText: `[MOCK ${body.personality ?? DEFAULT_PERSONALITY}] It is ${body.weather?.temp ?? "?"}°${body.weather?.unit ?? "F"} with ${body.weather?.condition ?? "unclear conditions"}. Dress for it and adjust your plans if needed.`,
      });
    }

    const gatewayProvider = createOpenAI({
      apiKey: process.env.AI_GATEWAY_API_KEY,
      baseURL: "https://ai-gateway.vercel.sh/v1",
    });

    const { object } = await generateObject({
      model: gatewayProvider("gemini-3.1-flash-lite-preview"),
      system: systemPrompt,
      schema: weatherAdviceSchema,
      prompt: [
        buildWeatherPrompt(body.weather),
        "Return three string fields: heroText, next24Text, adviceText.",
        "Each field has a different job. Keep their wording and purpose distinct.",
        "heroText: one to three short sentences for the hero section.",
        "heroText must describe only the current conditions right now.",
        "heroText may mention the current temperature, how it feels, the sky/precipitation, wind, and whether it is day or night.",
        "heroText must not mention the rest of today, tonight, tomorrow, highs, lows, forecast changes, rain chances, alerts, or future timing.",
        "Keep heroText compact, personality-driven, and observational rather than advisory. No markdown, labels, or quotes.",
        "next24Text: one to three short sentences for the detailed Next 24 Hours section.",
        "next24Text should read like a compact forecast blurb for the coming stretch, using forecast context such as highs/lows, precipitation timing, likely shifts, or day/night transitions when relevant.",
        "Keep next24Text easy to scan, lightly flavored by the personality, and more informational than adviceText.",
        "adviceText: two to four short sentences of practical personality-driven guidance for the dedicated advice card.",
        "adviceText should be the most action-oriented field. Use the most decision-relevant conditions, risks, AQI, rain chance, and alerts when they matter, and give concrete actions.",
        "If there is a meaningful safety risk or alert, surface it clearly in next24Text and adviceText. heroText must still stay current-only.",
        "No markdown, labels, or quotes in any field.",
        "Do not repeat the same sentence structure or key phrasing across the three fields.",
      ].join(" "),
    });

    return Response.json(object);
  } catch (error) {
    console.error("AI Generation Error", error);
    const errorMessage = error instanceof Error ? error.message : "";

    return Response.json(
      { heroText: "", next24Text: "", adviceText: `Sorry, I'm feeling under the weather. ${errorMessage}`.trim() },
      { status: 500 }
    );
  }
}
