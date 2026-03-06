import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { PERSONALITY_ICON_IDS, isPersonalityIcon, type PersonalityIcon } from "@/lib/personalities";

type PersonalityDraft = {
  label: string;
  description: string;
  preview: string;
  prompt: string;
  icon: PersonalityIcon;
};

function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildFallbackDraft(idea: string): PersonalityDraft {
  const label = toTitleCase(idea) || "Custom Voice";

  return {
    label: label.slice(0, 24),
    description: "A custom weather voice built from your idea.",
    preview: "Personalized by your prompt.",
    prompt: [
      "Use only the weather data provided.",
      "Write 1-2 short sentences.",
      "Lead with any weather alert or notable safety risk.",
      "Mention the most important condition and give at least one specific, practical action.",
      `You are a weather assistant with this personality: ${idea.trim()}.`,
      "Keep the tone distinct but always clear, useful, and grounded in the forecast.",
    ].join(" "),
    icon: "sparkles",
  };
}

function extractJson(text: string): string {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) return fencedMatch[1].trim();

  const objectMatch = text.match(/\{[\s\S]*\}/);
  return objectMatch ? objectMatch[0] : text.trim();
}

function normalizeDraft(input: unknown, fallback: PersonalityDraft): PersonalityDraft {
  if (!input || typeof input !== "object") return fallback;

  const candidate = input as Partial<Record<keyof PersonalityDraft, unknown>>;
  const icon = typeof candidate.icon === "string" && isPersonalityIcon(candidate.icon)
    ? candidate.icon
    : fallback.icon;

  return {
    label: typeof candidate.label === "string" && candidate.label.trim() ? candidate.label.trim().slice(0, 24) : fallback.label,
    description: typeof candidate.description === "string" && candidate.description.trim() ? candidate.description.trim().slice(0, 56) : fallback.description,
    preview: typeof candidate.preview === "string" && candidate.preview.trim() ? candidate.preview.trim().slice(0, 56) : fallback.preview,
    prompt: typeof candidate.prompt === "string" && candidate.prompt.trim() ? candidate.prompt.trim() : fallback.prompt,
    icon,
  };
}

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
      system: [
        "You create weather-assistant personalities for a consumer weather app.",
        "Return only valid JSON with keys: label, description, preview, prompt, icon.",
        "label: short name, max 24 characters.",
        "description: short summary, max 56 characters.",
        "preview: teaser line, max 56 characters.",
        "prompt: a complete system prompt for the weather assistant.",
        "The prompt must instruct the assistant to use only provided weather data, answer in 1-2 short sentences, lead with alerts or safety risks, and give practical advice.",
        `icon must be one of: ${PERSONALITY_ICON_IDS.join(", ")}.`,
      ].join(" "),
      prompt: `Create one custom weather personality based on this request: ${idea}`,
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
