import {
  PERSONALITY_ICON_IDS,
  buildPersonalityPrompt,
  isPersonalityIcon,
  type PersonalityIcon,
} from "./personalities.ts";

export type PersonalityDraft = {
  label: string;
  description: string;
  preview: string;
  prompt: string;
  icon: PersonalityIcon;
};

export const PERSONALITY_CREATOR_SYSTEM_PROMPT = [
  "You create weather-assistant personalities for a consumer weather app.",
  "Return only valid JSON with keys: label, description, preview, prompt, icon.",
  "label: short name, max 24 characters.",
  "description: short summary, max 56 characters.",
  "preview: teaser line, max 56 characters.",
  "prompt: a complete system prompt for the weather assistant.",
  "The prompt must preserve these rules: use only the provided weather data, never invent missing details, answer in 1-2 short sentences, lead with alerts or notable risks, focus on the most decision-relevant condition, and give at least one concrete action.",
  "Make the voice sharply differentiated in cadence, imagery, and vocabulary, so it is recognizable in one response.",
  "The prompt should say what the assistant should sound like and, when useful, what it should avoid.",
  "Prefer natural title-style labels over generic names like 'The Something' unless the request clearly calls for that framing.",
  "Do not default to all-caps, safety-bulletin shouting, or generic stern announcer language unless the requested persona truly demands it.",
  "Avoid generic or mushy voices that could blur into cozy, snarky, pro, goth, noir, or hype-coach without a clear twist.",
  `icon must be one of: ${PERSONALITY_ICON_IDS.join(", ")}.`,
].join(" ");

export function buildPersonalityCreatorPrompt(idea: string): string {
  return `Create one custom weather personality based on this request: ${idea}`;
}

function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function buildFallbackDraft(idea: string): PersonalityDraft {
  const label = toTitleCase(idea) || "Custom Voice";

  return {
    label: label.slice(0, 24),
    description: "A custom weather voice built from your idea.",
    preview: "Personalized by your prompt.",
    prompt: buildPersonalityPrompt(
      `You are a weather assistant with this personality: ${idea.trim()}. Make the voice vivid and easy to distinguish in a single response by choosing a clear cadence, attitude, and vocabulary.`
    ),
    icon: "sparkles",
  };
}

export function extractJson(text: string): string {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) return fencedMatch[1].trim();

  const objectMatch = text.match(/\{[\s\S]*\}/);
  return objectMatch ? objectMatch[0] : text.trim();
}

function normalizePrompt(prompt: unknown, fallbackPrompt: string): string {
  if (typeof prompt !== "string" || !prompt.trim()) return fallbackPrompt;

  const trimmed = prompt.trim();
  if (trimmed.includes("Use only the weather data provided")) {
    return trimmed;
  }

  return buildPersonalityPrompt(trimmed);
}

export function normalizeDraft(input: unknown, fallback: PersonalityDraft): PersonalityDraft {
  if (!input || typeof input !== "object") return fallback;

  const candidate = input as Partial<Record<keyof PersonalityDraft, unknown>>;
  const icon =
    typeof candidate.icon === "string" && isPersonalityIcon(candidate.icon)
      ? candidate.icon
      : fallback.icon;

  return {
    label:
      typeof candidate.label === "string" && candidate.label.trim()
        ? candidate.label.trim().slice(0, 24)
        : fallback.label,
    description:
      typeof candidate.description === "string" && candidate.description.trim()
        ? candidate.description.trim().slice(0, 56)
        : fallback.description,
    preview:
      typeof candidate.preview === "string" && candidate.preview.trim()
        ? candidate.preview.trim().slice(0, 56)
        : fallback.preview,
    prompt: normalizePrompt(candidate.prompt, fallback.prompt),
    icon,
  };
}
