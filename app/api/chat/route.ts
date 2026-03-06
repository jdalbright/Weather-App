import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { DEFAULT_PERSONALITY, PERSONALITY_PROMPTS } from '@/lib/personalities';

// Since you mentioned the key is explicitly an AI Gateway Key, we will attempt to proxy 
// the new Gemini 1.5 Flash model through it. 
// Vercel AI SDK allows custom provider routing.

export async function POST(req: Request) {
    try {
        const { weather, personality } = await req.json();
        const systemPrompt = PERSONALITY_PROMPTS[personality as keyof typeof PERSONALITY_PROMPTS] || PERSONALITY_PROMPTS[DEFAULT_PERSONALITY];

        // Vercel AI Gateway allows us to easily use models from Anthropic/OpenAI without 
        // needing their specific provider SDKs installed, by faking the OpenAI interface
        // and routing it through `ai-gateway.vercel.sh`.

        // Let's use the explicit OpenAI compatible interface that Vercel provides:
        const gatewayProvider = createOpenAI({
            apiKey: process.env.AI_GATEWAY_API_KEY,
            baseURL: 'https://ai-gateway.vercel.sh/v1',
        });

        if (!process.env.AI_GATEWAY_API_KEY) {
            return Response.json({ text: `[MOCK ${personality}]: Looks like it's ${weather.temp}° out there. (API Key not loaded in .env)` });
        }

        const { text } = await generateText({
            // We use Gemini Flash 3.1 Lite per your request!
            model: gatewayProvider('gemini-3.1-flash-lite-preview'),
            system: systemPrompt,
            prompt: `Current Local Time: ${weather.localTime}, Weather: ${weather.temp}°${weather.unit || 'F'} (Feels like ${weather.feelsLike}°), Daily High/Low: ${weather.highTemp}°/${weather.lowTemp}°. Weather Description: ${weather.condition}. Is Day: ${weather.isDay} (Sunrise: ${weather.sunrise}, Sunset: ${weather.sunset}). Wind Speed: ${weather.windSpeed}. Humidity: ${weather.humidity}%. Rain Chance: ${weather.rainChance}%. UV Index: ${weather.uvIndex}. Cloud Cover: ${weather.cloudCover}%. Visibility: ${weather.visibility}. Give short advice considering the time of day and full weather conditions.`,
        });

        return Response.json({ text });

    } catch (error: unknown) {
        console.error("AI Generation Error", error);
        const errorMessage = error instanceof Error ? error.message : "";

        // If it throws an authorization error, we return a helpful message
        if (errorMessage.includes('API key') || errorMessage.includes('auth') || errorMessage.includes('400')) {
            return Response.json({
                text: `[AUTH ERROR]: I tried to use Gemini Flash through the gateway, but the key got rejected. Make sure the gateway URL is linked properly! Error: ${errorMessage}`
            });
        }

        return Response.json({ text: `Sorry, I'm feeling under the weather. ${errorMessage}` }, { status: 500 });
    }
}
