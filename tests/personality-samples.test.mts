import assert from "node:assert/strict";
import test from "node:test";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { PERSONALITIES } from "../lib/personalities.ts";
import {
  PERSONALITY_CREATOR_SYSTEM_PROMPT,
  buildFallbackDraft,
  buildPersonalityCreatorPrompt,
  extractJson,
  normalizeDraft,
} from "../lib/personality-creator.ts";
import { buildWeatherPrompt } from "../lib/weather-advice.ts";

const SAMPLE_WEATHER = {
  temp: 91,
  unit: "F",
  condition: "thunderstorms with smoky haze",
  isDay: true,
  localTime: "Friday 3:40 PM",
  sunrise: "6:28 AM",
  sunset: "7:12 PM",
  windSpeed: "22 mph gusting to 34 mph",
  rainChance: 82,
  feelsLike: 99,
  uvIndex: 8,
  highTemp: 93,
  lowTemp: 74,
  aqi: 118,
  alerts: "Severe Thunderstorm Watch until 8 PM; Air Quality Alert for smoke",
} as const;

const CUSTOM_IDEAS = [
  "calm airline captain",
  "overcaffeinated neighborhood crossing guard",
] as const;

const gatewayProvider = process.env.AI_GATEWAY_API_KEY
  ? createOpenAI({
      apiKey: process.env.AI_GATEWAY_API_KEY,
      baseURL: "https://ai-gateway.vercel.sh/v1",
    })
  : null;

async function sampleAdvice(systemPrompt: string): Promise<string> {
  assert(gatewayProvider, "AI_GATEWAY_API_KEY is required to sample personalities.");

  const { text } = await generateText({
    model: gatewayProvider("gemini-3.1-flash-lite-preview"),
    system: systemPrompt,
    prompt: buildWeatherPrompt(SAMPLE_WEATHER),
  });

  return text.trim();
}

async function sampleCustomDraft(idea: string) {
  assert(gatewayProvider, "AI_GATEWAY_API_KEY is required to sample custom personalities.");

  const fallback = buildFallbackDraft(idea);
  const { text } = await generateText({
    model: gatewayProvider("gemini-3.1-flash-lite-preview"),
    system: PERSONALITY_CREATOR_SYSTEM_PROMPT,
    prompt: buildPersonalityCreatorPrompt(idea),
  });

  try {
    return normalizeDraft(JSON.parse(extractJson(text)), fallback);
  } catch {
    return fallback;
  }
}

test(
  "sample built-in weather personalities",
  { skip: !gatewayProvider ? "AI_GATEWAY_API_KEY is missing." : false, timeout: 120_000 },
  async () => {
    console.log("\nBuilt-in personality samples:");

    for (const personality of PERSONALITIES) {
      const sample = await sampleAdvice(personality.prompt);
      assert.ok(sample.length > 0, `Expected a sample for ${personality.id}.`);

      console.log(`- ${personality.id}: ${sample}`);
    }
  }
);

test(
  "sample custom personality creator output",
  { skip: !gatewayProvider ? "AI_GATEWAY_API_KEY is missing." : false, timeout: 120_000 },
  async () => {
    console.log("\nCustom personality samples:");

    for (const idea of CUSTOM_IDEAS) {
      const draft = await sampleCustomDraft(idea);
      const sample = await sampleAdvice(draft.prompt);

      assert.ok(draft.label.length > 0, `Expected a label for custom idea: ${idea}`);
      assert.ok(
        draft.prompt.includes("Use only the weather data provided"),
        `Expected shared prompt rules in custom idea: ${idea}`
      );
      assert.ok(sample.length > 0, `Expected a sample for custom idea: ${idea}`);

      console.log(`- ${idea} -> ${draft.label}: ${sample}`);
    }
  }
);
