# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is configured.

## Environment Variables

Create a `.env.local` file with:

```
AI_GATEWAY_API_KEY=   # Vercel AI Gateway key (used by /api/chat and /api/personality)
WEATHERAPI_KEY=       # weatherapi.com key (used by /api/extended-weather for astronomy + alerts)
PIRATEWEATHER_KEY=    # pirateweather.net key (used by /api/extended-weather for minute-level rain)
```

All keys are optional — the app falls back to mock/empty responses if missing.

## Architecture

This is a **Next.js 16 App Router** app (React 19, TypeScript, Tailwind v4). It is a single-page weather app with AI-powered personality-driven advice.

### Data flow

`app/page.tsx` (client component) is the entire app shell. On load it:
1. Gets geolocation (falls back to NYC)
2. Fires parallel fetches via `fetchWeatherForLocation`:
   - `lib/weather.ts` helpers hit Open-Meteo APIs directly from the client (weather, air quality, marine, flood, historical, NWS alerts)
   - `/api/extended-weather` (server route) fetches WeatherAPI astronomy, Pirate Weather rain summary, METAR, and NWS alerts using secret keys
3. Calls `/api/chat` (server route) to generate AI advice via Vercel AI Gateway → Gemini Flash

### Key files

| File | Purpose |
|------|---------|
| `app/page.tsx` | App shell, all state, settings panel, personality picker |
| `components/WeatherCard.tsx` | Main display component — current conditions, hourly/daily forecast, detailed panels |
| `components/SearchBar.tsx` | Location search using Open-Meteo geocoding API |
| `components/JoyWeatherIcons.tsx` | Custom SVG weather icon components |
| `lib/weather.ts` | All API fetch functions + type definitions + utility helpers (WMO code mapping, theme selection, unit formatting) |
| `lib/personalities.ts` | Personality definitions (id, label, prompt, icon) and helpers |
| `app/api/chat/route.ts` | POST handler — builds personality system prompt, calls Vercel AI Gateway (OpenAI-compatible interface) |
| `app/api/extended-weather/route.ts` | GET handler — fetches WeatherAPI astronomy, Pirate Weather rain, METAR, and NWS alerts server-side |
| `app/api/personality/route.ts` | POST handler — generates custom AI personality via Vercel AI Gateway |

### Theming

`document.body.className` is set dynamically from `getThemeFromCode()` in `lib/weather.ts`. Themes are CSS classes (`theme-sun`, `theme-cloud`, `theme-rain`, `theme-snow`, `theme-night`) defined in `app/globals.css`.

### Settings persistence

User preferences (temp unit, distance unit, personality, appearance mode, recent searches, custom personalities) are stored in `localStorage`. Settings are read during `useState` initialization to avoid hydration flashes.

### AI advice

`/api/chat` uses the Vercel AI Gateway with an OpenAI-compatible provider pointed at `https://ai-gateway.vercel.sh/v1`, routing to `gemini-3.1-flash-lite-preview`. The system prompt is selected from `PERSONALITY_PROMPTS` in `lib/personalities.ts` based on the user's chosen personality (built-in or custom).

### External APIs used (client-side, no key required)

- `api.open-meteo.com` — weather forecast
- `air-quality-api.open-meteo.com` — air quality
- `marine-api.open-meteo.com` — wave data (returns null for inland locations)
- `flood-api.open-meteo.com` — river discharge
- `archive-api.open-meteo.com` — historical data (same day last year + 3-year climate normals)
- `api.weather.gov` — NWS alerts (US only)
- `geocoding-api.open-meteo.com` — location search
- `nominatim.openstreetmap.org` — reverse geocoding for geolocation name
- `aviationweather.gov` — METAR station observations (nearest airport)
