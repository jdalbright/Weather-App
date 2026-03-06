import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  PERSONALITY_CREATOR_SYSTEM_PROMPT,
  buildFallbackDraft,
  buildPersonalityCreatorPrompt,
  extractJson,
  normalizeDraft,
} from "@/lib/personality-creator";

export async function POST(req: Request) {
  try {
    const body = await req.json() as { idea?: string };
    const idea = typeof body.idea === "string" ? body.idea.trim() : "";

    if (!idea) {
      return Response.json({ error: "Describe the personality you want first." }, { status: 400 });
    }

    const fallback = buildFallbackDraft(idea);

    if (!process.env.AI_GATEWAY_API_KEY) {
      return Response.json(fallback);
    }

    const gatewayProvider = createOpenAI({
      apiKey: process.env.AI_GATEWAY_API_KEY,
      baseURL: "https://ai-gateway.vercel.sh/v1",
    });

    const { text } = await generateText({
      model: gatewayProvider("gemini-3.1-flash-lite-preview"),
      system: PERSONALITY_CREATOR_SYSTEM_PROMPT,
      prompt: buildPersonalityCreatorPrompt(idea),
    });

    try {
      const parsed = JSON.parse(extractJson(text));
      return Response.json(normalizeDraft(parsed, fallback));
    } catch {
      return Response.json(fallback);
    }
  } catch (error) {
    console.error("Personality generation error", error);

    const message = error instanceof Error ? error.message : "";
    return Response.json(
      { error: message || "Could not generate a custom personality right now." },
      { status: 500 }
    );
  }
}
