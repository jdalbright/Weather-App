import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { DEFAULT_PERSONALITY, PERSONALITY_PROMPTS } from "@/lib/personalities";
import { buildWeatherPrompt, type ChatWeatherPayload } from "@/lib/weather-advice";

type ChatRequestBody = {
  personality?: string;
  customPrompt?: string;
  weather?: ChatWeatherPayload;
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
