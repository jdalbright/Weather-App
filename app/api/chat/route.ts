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
        heroText: `[MOCK ${body.personality ?? DEFAULT_PERSONALITY}] ${body.weather?.condition ?? "Unclear weather"} near ${body.weather?.temp ?? "?"}°${body.weather?.unit ?? "F"}.`,
        next24Text: `[MOCK ${body.personality ?? DEFAULT_PERSONALITY}] ${body.weather?.condition ?? "Unclear weather"} holds into the next stretch with highs near ${body.weather?.highTemp ?? "?"}° and lows near ${body.weather?.lowTemp ?? "?"}°.`,
        adviceText: `[MOCK ${body.personality ?? DEFAULT_PERSONALITY}]: It's ${body.weather?.temp ?? "?"}°${body.weather?.unit ?? "F"} and ${body.weather?.condition ?? "unclear"}, so plan accordingly.`,
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
        "Return three fields.",
        "heroText: one or two short sentences for the hero section. Keep it simple, compact, and forecast-like, similar to a concise weather summary. Add personality flavor, but do not make it chatty or long. No markdown, labels, or quotes.",
        "next24Text: one to three short sentences for the detailed Next 24 Hours section. Keep it weather-summary focused and easy to scan, like a forecast blurb. Add personality flavor, but keep it simpler and more informational than adviceText. No markdown, labels, or quotes.",
        "adviceText: two to four short sentences of practical personality-driven advice for the dedicated advice card.",
        "Make all fields distinct. Do not repeat the same wording across them.",
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
