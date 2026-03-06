# Weather Vibe

Weather Vibe is a personality-driven weather app built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4. It combines a 16-day forecast, air quality, marine and flood signals, weather alerts, astronomy, and optional AI-generated advice in a single glassy UI that adapts to both conditions and appearance mode.

AI responses and custom personality generation run through the Vercel AI Gateway using `gemini-3.1-flash-lite-preview`. Core weather data works without API keys.

## Features

### Personality-based weather advice

- 12 built-in weather voices: Snarky, Deadpan, Gen-Z, Goth, Pro, Hype Coach, Cozy, Grandma, Noir, Trail Guide, Prepper, and Science Nerd
- AI advice uses live weather context including temperature, feels-like, rain chance, UV index, sunrise/sunset, local time, AQI, and active alerts
- If `AI_GATEWAY_API_KEY` is missing, the app returns a mock advice response instead of failing

### AI-generated custom personalities

- Describe a vibe and generate a new weather voice through `/api/personality`
- Custom personalities include label, description, preview, prompt, and icon selection
- Generated personalities are stored locally and can be deleted from settings

### Broad weather coverage

| Data | Source |
| --- | --- |
| Current conditions, hourly forecast, 16-day outlook, UV index | Open-Meteo |
| Multi-model consensus temperatures | Open-Meteo forecast models |
| Forecast confidence / model spread | Open-Meteo models |
| Air quality, PM2.5, PM10, ozone, pollen | Open-Meteo Air Quality |
| Marine conditions | Open-Meteo Marine |
| River discharge / flood signal | Open-Meteo Flood |
| Same day last year | Open-Meteo Archive |
| 3-year climate normals | Open-Meteo Archive |
| Astronomy and optional severe alerts | WeatherAPI |
| Nearest airport observations (METAR) | FAA Aviation Weather |
| Minute-by-minute precipitation summary | Pirate Weather |
| Official US alerts | NOAA / NWS |

### Forecast and comparison tools

- Forecast confidence badge built from model spread
- Historical comparison against the same date last year
- 3-year climate normal comparison
- METAR station temperature delta versus the forecast
- Next-hour precipitation summary with a simple intensity timeline when Pirate Weather is enabled

### UI and UX

- Dynamic weather theming based on WMO weather code and day/night state
- Appearance modes: System, Light, and Dark
- Collapsible detail panels for the expanded forecast view
- City search with debounced geocoding suggestions and recent searches
- Browser geolocation on first load, with New York City as fallback
- Local persistence for units, selected personality, custom personalities, appearance, and recent searches

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Vercel AI SDK
- Lucide React
- date-fns

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app will load forecast data without any keys. Optional keys unlock astronomy, minute-level rain summaries, and live AI responses.

## Environment Variables

Create `.env.local` if you want the optional integrations:

```env
# AI advice and custom personality generation
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key

# Moon phase, moonrise/set, and WeatherAPI alerts
WEATHERAPI_KEY=your_weatherapi_key

# Minute-by-minute precipitation summary
PIRATEWEATHER_KEY=your_pirateweather_key
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Project Structure

```text
app/
  layout.tsx
  page.tsx
  globals.css
  api/
    chat/route.ts
    extended-weather/route.ts
    personality/route.ts

components/
  CollapsiblePanel.tsx
  JoyWeatherIcons.tsx
  SearchBar.tsx
  WeatherCard.tsx

lib/
  personalities.ts
  weather.ts
```

## Notes

- `/api/chat` builds a weather-aware prompt for the selected built-in or custom personality and returns a short response.
- `/api/extended-weather` proxies the key-backed and server-side integrations such as WeatherAPI, Pirate Weather, METAR lookup, and NOAA/NWS alerts.
- `app/page.tsx` coordinates the client state, persistence, theme updates, and the parallel weather fetch flow.
