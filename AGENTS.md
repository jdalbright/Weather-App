# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

**Weather Vibe** is a single-page Next.js 16 weather application with AI-powered personality-driven advice. It features a polished, organic UI with glass-morphism design, multi-model forecast confidence scoring, and rich weather data aggregation from 10+ sources.

### Technology Stack

- **Framework**: Next.js 16.1.6 with App Router
- **Runtime**: React 19.2.3 (with React Compiler enabled)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 with PostCSS
- **Icons**: Lucide React
- **AI SDK**: Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/anthropic`)
- **Date Utilities**: date-fns
- **Font**: Quicksand (Google Fonts)

## Build and Development Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint (uses eslint-config-next)
```

No test suite is configured.

## Environment Variables

Create a `.env.local` file in the project root:

```
AI_GATEWAY_API_KEY=   # Vercel AI Gateway key (used by /api/chat and /api/personality)
WEATHERAPI_KEY=       # weatherapi.com key (used by /api/extended-weather for astronomy + alerts)
PIRATEWEATHER_KEY=    # pirateweather.net key (used by /api/extended-weather for minute-level rain)
```

All keys are optional — the app gracefully falls back to mock/empty responses when keys are missing.

## Architecture

### Application Structure

```
app/
├── page.tsx                 # Main client component (app shell, all state, settings panel)
├── layout.tsx               # Root layout with appearance script, Quicksand font
├── globals.css              # Tailwind v4 config, CSS variables, theme definitions
├── api/
│   ├── chat/route.ts        # AI advice generation via Vercel AI Gateway
│   ├── extended-weather/route.ts  # Server-side API aggregation (WeatherAPI, Pirate Weather, METAR, NWS)
│   └── personality/route.ts # Custom personality generation via AI
components/
├── WeatherCard.tsx          # Main display component (current conditions, forecasts, detailed panels)
├── SearchBar.tsx            # Location search with autocomplete and recent searches
├── CollapsiblePanel.tsx     # Animated collapsible container component
└── JoyWeatherIcons.tsx      # Custom SVG weather icons with gradients
lib/
├── weather.ts               # API fetch functions, type definitions, WMO code mapping, utilities
└── personalities.ts         # Personality definitions, prompts, and helpers
public/                      # Static assets (Next.js logos, etc.)
```

### Data Flow

1. **Initial Load** (`app/page.tsx`):
   - Gets browser geolocation (falls back to NYC: 40.7128, -74.0060)
   - Reverse geocodes via Nominatim for location name

2. **Weather Fetching** (`fetchWeatherForLocation`):
   - Parallel client-side fetches to Open-Meteo APIs (weather, air quality, marine, flood, historical, climate normals, forecast confidence)
   - Server-side fetch to `/api/extended-weather` for key-protected APIs (WeatherAPI astronomy, Pirate Weather minutely rain, METAR, NWS alerts)

3. **AI Advice** (`/api/chat`):
   - POST handler builds personality system prompt
   - Calls Vercel AI Gateway → Gemini 3.1 Flash Lite Preview
   - Falls back to mock response if `AI_GATEWAY_API_KEY` is missing

### External APIs

**Client-side (no key required):**
- `api.open-meteo.com` — weather forecast, air quality, marine, flood, archive
- `geocoding-api.open-meteo.com` — location search
- `nominatim.openstreetmap.org` — reverse geocoding
- `api.weather.gov` — NWS alerts (US only)

**Server-side (requires keys):**
- `api.weatherapi.com` — astronomy, alerts
- `api.pirateweather.net` — minutely precipitation
- `aviationweather.gov` — METAR station data

### Theming System

Dynamic theming uses CSS custom properties and data attributes:

- **Appearance modes**: `system` | `light` | `dark` (stored in `localStorage`)
- **Weather themes**: `theme-sun` | `theme-cloud` | `theme-rain` | `theme-snow` | `theme-night`
- Set via `document.documentElement.dataset.weatherTheme` and `dataset.colorMode`
- Defined in `app/globals.css` with CSS variable overrides

### State Management

All state is local to `app/page.tsx`:
- Weather data, air quality, marine, flood, historical, astronomy, alerts
- UI state: loading, settings panel, appearance mode
- User preferences: temp unit (°F/°C), distance unit (mph/kmh), personality

**Persistence** (`localStorage`):
- `weather-settings` — temp/distance units
- `weather-personality` — selected personality ID
- `weather-appearance` — light/dark/system
- `weather-custom-personalities` — user-generated AI personalities (max 12)
- `weather_recent_searches` — recent location searches (max 5)

Settings are hydrated in `useEffect` to avoid SSR mismatches.

## Code Organization

### Key Files Reference

| File | Purpose | Key Exports |
|------|---------|-------------|
| `app/page.tsx` | App shell, state management, settings UI | `Home` (default export) |
| `components/WeatherCard.tsx` | Main weather display | `WeatherCard` |
| `components/SearchBar.tsx` | Location search | `SearchBar` |
| `lib/weather.ts` | Weather API functions, types, utilities | `getWeatherData`, `getAirQualityData`, `getThemeFromCode`, type definitions |
| `lib/personalities.ts` | Personality definitions | `PERSONALITIES`, `PERSONALITY_PROMPTS`, `getPersonality`, `sanitizeCustomPersonality` |
| `app/api/chat/route.ts` | AI advice endpoint | `POST` handler |
| `app/api/extended-weather/route.ts` | Extended weather data | `GET` handler |
| `app/api/personality/route.ts` | Custom personality generation | `POST` handler |

### Type Definitions

All types are defined in `lib/weather.ts`:
- `WeatherData` — Open-Meteo forecast response
- `AirQualityData` — AQI and pollen data
- `MarineData` — Wave height, direction, period
- `FloodData` — River discharge
- `HistoricalData` — Same-day-last-year temperatures
- `AstronomyData` — Moon phase, illumination, rise/set
- `MetarData` — Airport weather observation
- `RainSummary` — Minutely precipitation timeline
- `ForecastConfidence` — Multi-model spread analysis
- `ClimateNormal` — 3-year average temperatures

### Personality System

Built-in personalities (in `lib/personalities.ts`):
- `snarky` — Sharp, sarcastic (default)
- `deadpan` — Dry and blunt
- `gen-z` — Internet slang
- `goth` — Melodramatic
- `meteorologist` — Professional
- `hype-coach` — Motivational
- `cozy` — Warm and gentle
- `grandma` — Loving and protective
- `noir` — Detective narration
- `trail-guide` — Outdoors-focused
- `prepper` — Readiness-first
- `science-nerd` — Precise and explanatory

Custom personalities can be AI-generated via `/api/personality` with user-provided vibe descriptions.

## Code Style Guidelines

### TypeScript Conventions

- Strict mode enabled in `tsconfig.json`
- Use explicit return types for exported functions
- Prefer `type` over `interface` for object shapes (project convention)
- Use `function` declarations for named functions, arrow functions for callbacks
- Nullish coalescing (`??`) preferred over `||` for defaults

### React Patterns

- All components are functional with hooks
- Client components marked with `"use client"` directive
- `useCallback` for memoized callbacks passed to children
- `useRef` for request ID tracking (prevents race conditions)
- `useEffect` for side effects, with proper cleanup

### CSS/Tailwind Conventions

- Custom CSS variables in `globals.css` for theming
- Utility classes use project-specific semantic naming:
  - `.surface-card`, `.surface-tile`, `.surface-chip` — glass-morphism layers
  - `.theme-heading`, `.theme-muted`, `.theme-subtle` — text color variants
- Border radius pattern: 32px (large), 24px (medium), 16px (small)
- Animation classes: `.collapsible-panel`, `.dropdown-panel-enter`

### Naming Conventions

- Components: PascalCase (`WeatherCard.tsx`)
- Utilities: camelCase (`getWeatherData`)
- Types/Interfaces: PascalCase (`WeatherData`, `PersonalityId`)
- Constants: SCREAMING_SNAKE_CASE for module-level, camelCase for local
- CSS classes: kebab-case (`.surface-card-strong`)

## Development Notes

### Forecast Confidence (Multi-Model)

The app implements multi-model consensus forecasting:
- Selects 4 location-appropriate models (e.g., NOAA HRRR for US, ECMWF IFS for Europe)
- Fetches parallel forecasts, calculates spread
- Displays: "Models agree" (≤2°), "Some uncertainty" (≤5°), "Models disagree" (>5°)
- Falls back to global models if regional models fail

### METAR Integration

- Finds nearest airport using Aviation Weather API bounding box
- Fetches actual observed conditions (temp, wind, visibility)
- Shows delta vs forecast temperature if difference ≥1°
- Highlights significant discrepancies (≥3° difference)

### Rain Timeline Visualization

- Pirate Weather minutely data aggregated into 5-minute buckets
- Visual bar chart shows probability (height) and intensity (color)
- Timeline spans 60 minutes with markers at 15m, 30m, 45m, 60m

### Security Considerations

- API keys are server-side only (in `/api/*` routes)
- Client-side APIs require no authentication
- User-generated personalities are sanitized via `sanitizeCustomPersonality`
- `dangerouslySetInnerHTML` only used for inline appearance script (no user input)

## File Size Reference

| File | Lines | Description |
|------|-------|-------------|
| `app/page.tsx` | ~930 | Main application logic |
| `components/WeatherCard.tsx` | ~1120 | Display component |
| `lib/weather.ts` | ~940 | API utilities |
| `lib/personalities.ts` | ~195 | Personality definitions |
| `app/globals.css` | ~378 | Styles |
