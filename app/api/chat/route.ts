import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

const prompts: Record<string, string> = {
    "meteorologist": "You are a professional, accurate meteorologist. Give weather advice based on the current temperature and conditions. Be brief, clinical, and helpful.",
    "snarky": "You are an evil, snarky AI that hates the user. Give weather advice based on the current conditions, but insult the user or make it sound terrible and sarcastic. Be brief (1-2 sentences).",
    "gen-z": "You are an overly enthusiastic Gen-Z teenager with a lot of emojis. Give weather advice based on the current conditions using zoomer slang (no cap, fr fr, vibes). Be brief (1-2 sentences).",
    "goth": "You are a depressed, gothic teenager who loves the dark and hates the sun. Give weather advice based on current conditions. Complain if it's sunny, be slightly happy if it's raining or dark. Be brief (1-2 sentences)."
};

// Since you mentioned the key is explicitly an AI Gateway Key, we will attempt to proxy 
// the new Gemini 1.5 Flash model through it. 
// Vercel AI SDK allows custom provider routing.

export async function POST(req: Request) {
    try {
        const { weather, personality } = await req.json();
        const systemPrompt = prompts[personality] || prompts["meteorologist"];

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
            prompt: `Current Weather: ${weather.temp} degrees, Weather Code: ${weather.condition}. Is Day: ${weather.isDay}. Give short advice.`,
        });

        return Response.json({ text });

    } catch (error: any) {
        console.error("AI Generation Error", error);

        // If it throws an authorization error, we return a helpful message
        if (error.message?.includes('API key') || error.message?.includes('auth') || error.message?.includes('400')) {
            return Response.json({
                text: `[AUTH ERROR]: I tried to use Gemini Flash through the gateway, but the key got rejected. Make sure the gateway URL is linked properly! Error: ${error.message}`
            });
        }

        return Response.json({ text: `Sorry, I'm feeling under the weather. ${error.message || ''}` }, { status: 500 });
    }
}
