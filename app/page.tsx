"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WeatherCard from "@/components/WeatherCard";
import SearchBar from "@/components/SearchBar";
import CollapsiblePanel from "@/components/CollapsiblePanel";
import VoiceSettingsMenu from "@/components/VoiceSettingsMenu";
import {
  getThemeFromCode,
  getWeatherData,
  getWeatherDescriptionFromCode,
  formatWindSpeed,
  getLocalTimeForOffset,
  parseLocationDateTime,
  getAirQualityData,
  getMarineData,
  getFloodData,
  getHistoricalData,
  getForecastConfidence,
  getClimateNormal,
  type AirQualityData,
  type MarineData,
  type FloodData,
  type HistoricalData,
  type AstronomyData,
  type WeatherAPIAlert,
  type NWSAlert,
  type ForecastConfidence,
  type ClimateNormal,
  type MetarData,
  type RainSummary,
} from "@/lib/weather";
import { Info, Loader2, Monitor, MoonStar, Settings, SunMedium, X } from "lucide-react";
import {
  DEFAULT_PERSONALITY,
  getAllPersonalities,
  getPersonality,
  sanitizeCustomPersonality,
  type CustomPersonality,
  type Personality,
  type PersonalityId,
} from "@/lib/personalities";

type Appearance = "system" | "light" | "dark";
type CompatibleMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

const APPEARANCE_STORAGE_KEY = "weather-appearance";
const CUSTOM_PERSONALITIES_STORAGE_KEY = "weather-custom-personalities";

type AdviceExtras = {
  aqi?: number;
  alerts?: string;
};

type GeneratedPersonalityResponse = {
  label: string;
  description: string;
  preview: string;
  prompt: string;
  icon: Personality["icon"];
};

function createCustomPersonalityId(label: string): string {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "custom-voice";

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `custom-${normalized}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `custom-${normalized}-${Date.now().toString(36)}`;
}

function summarizeAlerts(weatherAlerts: WeatherAPIAlert[], nwsAlerts: NWSAlert[]): string | undefined {
  const combinedAlerts = [
    ...weatherAlerts.map((alert) => ({
      event: alert.event,
      severity: alert.severity,
      headline: alert.headline,
      expires: alert.expires,
    })),
    ...nwsAlerts.map((alert) => ({
      event: alert.event,
      severity: alert.severity,
      headline: alert.headline,
      expires: alert.expires,
    })),
  ];

  const summary = combinedAlerts
    .map((alert) => {
      const parts = [
        alert.severity?.trim(),
        alert.event?.trim(),
        alert.headline?.trim(),
        alert.expires ? `expires ${alert.expires.trim()}` : undefined,
      ].filter(Boolean);

      return parts.join(" | ");
    })
    .filter(Boolean)
    .slice(0, 4)
    .join(" ; ");

  return summary || undefined;
}

function resolveAppearance(appearance: Appearance): "light" | "dark" {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  if (appearance !== "system") return appearance;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function buildAdviceExtras(
  airQuality: AirQualityData | null,
  weatherAlerts: WeatherAPIAlert[],
  nwsAlerts: NWSAlert[]
): AdviceExtras {
  return {
    aqi: airQuality?.current?.us_aqi ?? undefined,
    alerts: summarizeAlerts(weatherAlerts, nwsAlerts),
  };
}

export default function Home() {
  type WeatherResponse = NonNullable<Awaited<ReturnType<typeof getWeatherData>>>;

  const [coords, setCoords] = useState<{ lat: number; lon: number; countryCode?: string | null } | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [marine, setMarine] = useState<MarineData | null>(null);
  const [flood, setFlood] = useState<FloodData | null>(null);
  const [historical, setHistorical] = useState<HistoricalData | null>(null);
  const [astronomy, setAstronomy] = useState<AstronomyData | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAPIAlert[]>([]);
  const [nwsAlerts, setNwsAlerts] = useState<NWSAlert[]>([]);
  const [forecastConfidence, setForecastConfidence] = useState<ForecastConfidence | null>(null);
  const [climateNormal, setClimateNormal] = useState<ClimateNormal | null>(null);
  const [metar, setMetar] = useState<MetarData | null>(null);
  const [metarConnected, setMetarConnected] = useState(false);
  const [rainSummary, setRainSummary] = useState<RainSummary | null>(null);
  const [pirateWeatherConnected, setPirateWeatherConnected] = useState(false);
  const [nwsConnected, setNwsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLocationDelayed, setIsLocationDelayed] = useState(false);
  const [locationLoadError, setLocationLoadError] = useState<string | null>(null);
  const [isDetailed, setIsDetailed] = useState(false);
  const [personality, setPersonality] = useState<PersonalityId>(DEFAULT_PERSONALITY);
  const [customPersonalities, setCustomPersonalities] = useState<CustomPersonality[]>([]);
  const [customIdea, setCustomIdea] = useState("");
  const [customPersonalityError, setCustomPersonalityError] = useState<string | null>(null);
  const [isGeneratingCustomPersonality, setIsGeneratingCustomPersonality] = useState(false);
  const [aiAdvice, setAiAdvice] = useState("");
  const [theme, setTheme] = useState("theme-sun");
  const [appearance, setAppearance] = useState<Appearance>("system");
  const [resolvedAppearance, setResolvedAppearance] = useState<"light" | "dark">(resolveAppearance("system"));
  const [locationName, setLocationName] = useState("New York");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const adviceRequestIdRef = useRef(0);
  const locationRequestIdRef = useRef(0);
  const personalityRef = useRef(personality);
  const customPersonalitiesRef = useRef<CustomPersonality[]>([]);
  const settingsAnchorRef = useRef<HTMLDivElement | null>(null);
  const [settings, setSettings] = useState<{ tempUnit: "celsius" | "fahrenheit"; distUnit: "kmh" | "mph" }>({
    tempUnit: "fahrenheit",
    distUnit: "mph",
  });

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    let frameId = 0;

    const savedPersonality = localStorage.getItem("weather-personality");
    const savedSettings = localStorage.getItem("weather-settings");
    const savedAppearance = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    const savedCustomPersonalities = localStorage.getItem(CUSTOM_PERSONALITIES_STORAGE_KEY);

    frameId = window.requestAnimationFrame(() => {
      if (savedCustomPersonalities) {
        try {
          const parsed = JSON.parse(savedCustomPersonalities);
          if (Array.isArray(parsed)) {
            setCustomPersonalities(parsed.map(sanitizeCustomPersonality).filter(Boolean) as CustomPersonality[]);
          }
        } catch {
          // ignore corrupt data
        }
      }

      if (savedPersonality) {
        setPersonality(savedPersonality);
      }

      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings({
            tempUnit: parsed.tempUnit || "fahrenheit",
            distUnit: parsed.distUnit || "mph",
          });
        } catch {
          // ignore corrupt data
        }
      }

      if (savedAppearance === "system" || savedAppearance === "light" || savedAppearance === "dark") {
        setAppearance(savedAppearance);
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("weather-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("weather-personality", personality);
  }, [personality]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_PERSONALITIES_STORAGE_KEY, JSON.stringify(customPersonalities));
  }, [customPersonalities]);

  useEffect(() => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance);
  }, [appearance]);

  useEffect(() => {
    personalityRef.current = personality;
  }, [personality]);

  useEffect(() => {
    customPersonalitiesRef.current = customPersonalities;
  }, [customPersonalities]);

  useEffect(() => {
    document.documentElement.dataset.weatherTheme = theme;
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)") as CompatibleMediaQueryList;

    const syncAppearance = () => {
      const resolved = appearance === "system"
        ? (media.matches ? "dark" : "light")
        : appearance;
      setResolvedAppearance(resolved);
      document.documentElement.dataset.colorMode = resolved;
    };

    syncAppearance();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", syncAppearance);
      return () => media.removeEventListener("change", syncAppearance);
    }

    media.addListener?.(syncAppearance);
    return () => media.removeListener?.(syncAppearance);
  }, [appearance]);

  const fetchAIAdvice = useCallback(async (weatherData: WeatherResponse, currentPersonality: Personality, extras?: AdviceExtras) => {
    const requestId = ++adviceRequestIdRef.current;

    try {
      const destinationDate = getLocalTimeForOffset(weatherData.utc_offset_seconds);
      const localTimeString = destinationDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
      const localDayString = destinationDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personality: currentPersonality.id,
          customPrompt: currentPersonality.isCustom ? currentPersonality.prompt : undefined,
          weather: {
            temp: Math.round(weatherData.current.temperature_2m),
            unit: settings.tempUnit === "fahrenheit" ? "F" : "C",
            condition: getWeatherDescriptionFromCode(weatherData.current.weather_code),
            isDay: weatherData.current.is_day === 1,
            localTime: `${localDayString}, ${localTimeString}`,
            sunrise: weatherData.daily.sunrise?.[0]
              ? parseLocationDateTime(weatherData.daily.sunrise[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
              : undefined,
            sunset: weatherData.daily.sunset?.[0]
              ? parseLocationDateTime(weatherData.daily.sunset[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
              : undefined,
            windSpeed: formatWindSpeed(weatherData.current.wind_speed_10m, weatherData.current_units.wind_speed_10m),
            rainChance: weatherData.current.precipitation_probability,
            feelsLike: Math.round(weatherData.current.apparent_temperature),
            uvIndex: weatherData.daily.uv_index_max?.[0] || 0,
            highTemp: Math.round(weatherData.daily.temperature_2m_max[0]),
            lowTemp: Math.round(weatherData.daily.temperature_2m_min[0]),
            aqi: extras?.aqi,
            alerts: extras?.alerts,
          }
        })
      });
      const json = await res.json();

      if (requestId === adviceRequestIdRef.current) {
        setAiAdvice(json.text);
      }
    } catch {
      if (requestId === adviceRequestIdRef.current) {
        setAiAdvice("Failed to get advice.");
      }
    }
  }, [settings.tempUnit]);

  const fetchWeatherForLocation = useCallback(async (lat: number, lon: number, countryCode?: string | null) => {
    const requestId = ++locationRequestIdRef.current;
    setLoading(true);
    setLocationLoadError(null);
    setWeather(null);
    setAirQuality(null);
    setMarine(null);
    setFlood(null);
    setHistorical(null);
    setAstronomy(null);
    setWeatherAlerts([]);
    setNwsAlerts([]);
    setForecastConfidence(null);
    setClimateNormal(null);
    setMetar(null);
    setMetarConnected(false);
    setRainSummary(null);
    setPirateWeatherConnected(false);
    setNwsConnected(false);
    setAiAdvice("");

    type ExtendedWeatherResponse = {
      astronomy: AstronomyData | null;
      alerts: WeatherAPIAlert[];
      metar: MetarData | null;
      metarConnected: boolean;
      rainSummary: RainSummary | null;
      pirateWeatherConnected: boolean;
      nwsAlerts: NWSAlert[];
      nwsConnected: boolean;
    };

    const emptyExtData: ExtendedWeatherResponse = {
      astronomy: null,
      alerts: [],
      metar: null,
      metarConnected: false,
      rainSummary: null,
      pirateWeatherConnected: false,
      nwsAlerts: [],
      nwsConnected: false,
    };

    const [data, aqData, marineData, floodData, histData, extData, confidenceData, normalData] = await Promise.all([
      getWeatherData(lat, lon, settings.tempUnit, settings.distUnit, countryCode),
      getAirQualityData(lat, lon),
      getMarineData(lat, lon),
      getFloodData(lat, lon),
      getHistoricalData(lat, lon, settings.tempUnit),
      fetch(`/api/extended-weather?lat=${lat}&lon=${lon}&tempUnit=${settings.tempUnit}`)
        .then(async (r) => (r.ok ? await r.json() as ExtendedWeatherResponse : emptyExtData))
        .catch(() => emptyExtData),
      getForecastConfidence(lat, lon, settings.tempUnit, countryCode),
      getClimateNormal(lat, lon, settings.tempUnit),
    ]);

    if (requestId !== locationRequestIdRef.current) return;

    if (data) {
      setAirQuality(aqData);
      setMarine(marineData);
      setFlood(floodData);
      setHistorical(histData);
      setNwsAlerts(extData.nwsAlerts ?? []);
      setNwsConnected(extData.nwsConnected ?? false);
      setAstronomy(extData.astronomy ?? null);
      setWeatherAlerts(extData.alerts ?? []);
      setMetar(extData.metar ?? null);
      setMetarConnected(extData.metarConnected ?? false);
      setRainSummary(extData.rainSummary ?? null);
      setPirateWeatherConnected(extData.pirateWeatherConnected ?? false);
      setForecastConfidence(confidenceData);
      setClimateNormal(normalData);
      setWeather(data);
      setTheme(getThemeFromCode(data.current.weather_code, data.current.is_day));
      void fetchAIAdvice(
        data,
        getPersonality(personalityRef.current, customPersonalitiesRef.current),
        buildAdviceExtras(aqData, extData.alerts ?? [], extData.nwsAlerts ?? [])
      );
      setLoading(false);
      return;
    }

    setLocationLoadError("Couldn't load weather for this location. Try again.");
    setLoading(false);
  }, [fetchAIAdvice, settings.distUnit, settings.tempUnit]);

  const initialFetchRef = useRef(false);

  // Load weather on mount (try geolocation, fallback to NYC)
  useEffect(() => {
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // If we had a reverse-geocode we could get the name, but for now just fetch weather
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              setLocationName(geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.county || "Current Location");
              setCoords({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                countryCode: geoData.address.country_code?.toUpperCase() ?? null,
              });
            } else {
              setLocationName("Current Location");
              setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
            }
          } catch {
            setLocationName("Current Location");
            setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
          }
        },
        () => {
          console.log("Geolocation denied or failed, defaulting to NYC.");
          window.requestAnimationFrame(() => {
            setCoords({ lat: 40.7128, lon: -74.0060, countryCode: "US" }); // Default to NYC
          });
        }
      );
    } else {
      window.requestAnimationFrame(() => {
        setCoords({ lat: 40.7128, lon: -74.0060, countryCode: "US" }); // Default to NYC
      });
    }
  }, []);

  useEffect(() => {
    if (coords) {
      const frameId = window.requestAnimationFrame(() => {
        void fetchWeatherForLocation(coords.lat, coords.lon, coords.countryCode);
      });

      return () => window.cancelAnimationFrame(frameId);
    }
  }, [coords, fetchWeatherForLocation]);

  useEffect(() => {
    if (!loading || weather) {
      setIsLocationDelayed(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsLocationDelayed(true);
    }, 6000);

    return () => window.clearTimeout(timeoutId);
  }, [loading, weather]);

  const allPersonalities = getAllPersonalities(customPersonalities);

  useEffect(() => {
    if (!allPersonalities.some((candidate) => candidate.id === personality)) {
      setPersonality(DEFAULT_PERSONALITY);
    }
  }, [allPersonalities, personality]);

  const handlePersonalityChange = (newP: string) => {
    const nextPersonality = getPersonality(newP, customPersonalities);
    setPersonality(nextPersonality.id);
    if (weather) {
      void fetchAIAdvice(weather, nextPersonality, buildAdviceExtras(airQuality, weatherAlerts, nwsAlerts));
    }
  };

  const handleGenerateCustomPersonality = useCallback(async () => {
    const idea = customIdea.trim();
    if (!idea) {
      setCustomPersonalityError("Describe the vibe you want first.");
      return;
    }

    setIsGeneratingCustomPersonality(true);
    setCustomPersonalityError(null);

    try {
      const res = await fetch("/api/personality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : "Could not generate a custom personality.");
      }

      const candidate = sanitizeCustomPersonality({
        id: createCustomPersonalityId((json as GeneratedPersonalityResponse).label),
        label: (json as GeneratedPersonalityResponse).label,
        description: (json as GeneratedPersonalityResponse).description,
        preview: (json as GeneratedPersonalityResponse).preview,
        prompt: (json as GeneratedPersonalityResponse).prompt,
        icon: (json as GeneratedPersonalityResponse).icon,
        isCustom: true,
      });

      if (!candidate) {
        throw new Error("The generated personality was invalid. Try a more specific vibe.");
      }

      const nextCustomPersonalities = [candidate, ...customPersonalities].slice(0, 12);
      setCustomPersonalities(nextCustomPersonalities);
      setPersonality(candidate.id);
      setCustomIdea("");

      if (weather) {
        void fetchAIAdvice(weather, candidate, buildAdviceExtras(airQuality, weatherAlerts, nwsAlerts));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate a custom personality.";
      setCustomPersonalityError(message);
    } finally {
      setIsGeneratingCustomPersonality(false);
    }
  }, [airQuality, customIdea, customPersonalities, fetchAIAdvice, weather, weatherAlerts, nwsAlerts]);

  const handleDeleteCustomPersonality = useCallback((personalityId: string) => {
    const nextCustomPersonalities = customPersonalities.filter((candidate) => candidate.id !== personalityId);
    setCustomPersonalities(nextCustomPersonalities);

    if (personality !== personalityId) return;

    const fallbackPersonality = getPersonality(DEFAULT_PERSONALITY, nextCustomPersonalities);
    setPersonality(fallbackPersonality.id);
    if (weather) {
      void fetchAIAdvice(weather, fallbackPersonality, buildAdviceExtras(airQuality, weatherAlerts, nwsAlerts));
    }
  }, [airQuality, customPersonalities, fetchAIAdvice, nwsAlerts, personality, weather, weatherAlerts]);

  // Handle location selection from search
  const handleLocationSelect = async (lat: number, lon: number, name: string, countryCode?: string | null) => {
    setLocationName(name);
    setCoords({ lat, lon, countryCode });
  };

  const selectedPersonality = getPersonality(personality, customPersonalities);
  const appearanceLabel = appearance === "system"
    ? `System (${resolvedAppearance})`
    : appearance === "dark"
      ? "Dark"
      : "Light";
  const appearanceOptions = [
    {
      id: "system" as const,
      label: "System",
      Icon: Monitor,
      badgeClass: "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_rgba(255,255,255,0.04)_45%),linear-gradient(160deg,_#334155,_#0f172a)] shadow-[0_12px_24px_rgba(15,23,42,0.28)] ring-1 ring-white/10",
      iconClass: "text-slate-100",
      description: `Matches your device (${resolvedAppearance}).`,
    },
    {
      id: "light" as const,
      label: "Light",
      Icon: SunMedium,
      badgeClass: "bg-[radial-gradient(circle_at_top,_#ffffff,_#fef3c7_52%,_#fdba74)] shadow-[0_12px_24px_rgba(245,158,11,0.28)] ring-1 ring-white/70",
      iconClass: "text-amber-500",
      description: "Sunny and bright.",
    },
    {
      id: "dark" as const,
      label: "Dark",
      Icon: MoonStar,
      badgeClass: "bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.18),_transparent_25%),linear-gradient(160deg,_#0f172a,_#1e3a5f_55%,_#312e81)] shadow-[0_14px_28px_rgba(15,23,42,0.35)] ring-1 ring-white/20",
      iconClass: "text-indigo-200",
      description: "Calm and low-glow.",
    },
  ];

  const applyAppearanceChange = (nextAppearance: Appearance) => {
    if (nextAppearance === appearance) return;
    setAppearance(nextAppearance);
  };

  const scrollSettingsIntoView = useCallback(() => {
    window.requestAnimationFrame(() => {
      settingsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const openAllSettings = useCallback(() => {
    setIsSettingsOpen(true);
    scrollSettingsIntoView();
  }, [scrollSettingsIntoView]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-8 px-4 pt-8 pb-8 text-[var(--text-primary)] md:px-8">

      {/* Top Search, Units & Personality Settings */}
      <div ref={settingsAnchorRef} className="mx-auto flex w-full max-w-lg flex-col gap-8">

        <div className="flex gap-2 relative z-50">
          <div className="flex-1 relative">
            <SearchBar onLocationSelect={handleLocationSelect} />
          </div>

          <button
            onClick={() => {
              if (isSettingsOpen) {
                setIsSettingsOpen(false);
                return;
              }

              openAllSettings();
            }}
            className={`surface-card-strong flex h-14 min-w-[60px] items-center justify-center rounded-[24px] px-4 border transition-all ${isSettingsOpen
              ? "border-[color:var(--accent-border)] text-[var(--accent-text)]"
              : "text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
              }`}
          >
            {isSettingsOpen ? <X size={24} /> : <Settings size={24} />}
          </button>
        </div>

        {/* Settings Panel */}
        <CollapsiblePanel open={isSettingsOpen} className="relative z-40 -mt-4">
          <div className="surface-card rounded-[32px] p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="theme-heading text-base font-bold">Settings</h2>
                <p className="theme-muted text-xs">Everything in one place, with fewer taps.</p>
              </div>
              <span className="surface-chip rounded-full px-3 py-1 text-[11px] font-bold shadow-sm">
                {`${appearanceLabel} mode`}
              </span>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                    <div className="mb-3 flex items-center justify-between px-2">
                      <div>
                        <h3 className="theme-section-label text-sm font-bold">Appearance</h3>
                        <p className="theme-muted text-xs">Pick the app look or follow your device.</p>
                      </div>
                      <span className="surface-chip rounded-full px-3 py-1 text-xs font-bold shadow-sm">
                        {appearanceLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {appearanceOptions.map((option) => {
                        const Icon = option.Icon;
                        const isActive = appearance === option.id;

                        return (
                          <button
                            key={option.id}
                            onClick={() => applyAppearanceChange(option.id)}
                            aria-pressed={isActive}
                            className={`rounded-[20px] border p-3 text-center transition-all ${isActive
                              ? "bg-[var(--surface-elevated)] border-[color:var(--accent-border)] shadow-md"
                              : "surface-tile hover:bg-[var(--surface-card-strong)] hover:border-[color:var(--border-strong)]"
                              }`}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${option.badgeClass}`}>
                                <Icon size={18} className={option.iconClass} />
                              </span>
                              <span className="theme-heading text-xs font-bold">{option.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="theme-muted mt-3 px-2 text-xs">
                      {appearanceOptions.find((option) => option.id === appearance)?.description}
                    </p>
              </div>

              <div>
                <h3 className="theme-section-label mb-3 px-2 text-sm font-bold">Temperature</h3>
                <div className="surface-tile grid grid-cols-2 gap-2 rounded-[24px] p-2">
                  <button
                    onClick={() => setSettings({ ...settings, tempUnit: "fahrenheit" })}
                    className={`flex min-h-[52px] flex-col items-center justify-center rounded-[20px] px-4 py-2 text-center text-sm font-bold transition-all ${settings.tempUnit === "fahrenheit"
                      ? "bg-[var(--surface-elevated)] text-[var(--accent-text)] shadow-md"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                  >
                    <span>Fahrenheit</span>
                    <span className="text-[11px] font-semibold opacity-75">&deg;F</span>
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, tempUnit: "celsius" })}
                    className={`flex min-h-[52px] flex-col items-center justify-center rounded-[20px] px-4 py-2 text-center text-sm font-bold transition-all ${settings.tempUnit === "celsius"
                      ? "bg-[var(--surface-elevated)] text-[var(--accent-text)] shadow-md"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                  >
                    <span>Celsius</span>
                    <span className="text-[11px] font-semibold opacity-75">&deg;C</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="theme-section-label mb-3 px-2 text-sm font-bold">Distance & Wind</h3>
                <div className="surface-tile grid grid-cols-2 gap-2 rounded-[24px] p-2">
                  <button
                    onClick={() => setSettings({ ...settings, distUnit: "mph" })}
                    className={`flex min-h-[52px] flex-col items-center justify-center rounded-[20px] px-4 py-2 text-center text-sm font-bold transition-all ${settings.distUnit === "mph"
                      ? "bg-[var(--surface-elevated)] text-[var(--accent-text)] shadow-md"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                  >
                    <span>Imperial</span>
                    <span className="text-[11px] font-semibold opacity-75">mi, mph</span>
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, distUnit: "kmh" })}
                    className={`flex min-h-[52px] flex-col items-center justify-center rounded-[20px] px-4 py-2 text-center text-sm font-bold transition-all ${settings.distUnit === "kmh"
                      ? "bg-[var(--surface-elevated)] text-[var(--accent-text)] shadow-md"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                  >
                    <span>Metric</span>
                    <span className="text-[11px] font-semibold opacity-75">km, km/h</span>
                  </button>
                </div>
              </div>

              <VoiceSettingsMenu
                allPersonalities={allPersonalities}
                personalityId={personality}
                selectedPersonality={selectedPersonality}
                customPersonalitiesCount={customPersonalities.length}
                customIdea={customIdea}
                customPersonalityError={customPersonalityError}
                isGeneratingCustomPersonality={isGeneratingCustomPersonality}
                onCustomIdeaChange={(value) => {
                  setCustomIdea(value);
                  if (customPersonalityError) {
                    setCustomPersonalityError(null);
                  }
                }}
                onPersonalityChange={handlePersonalityChange}
                onDeleteCustomPersonality={handleDeleteCustomPersonality}
                onGenerateCustomPersonality={() => void handleGenerateCustomPersonality()}
              />

              <div>
                  <button
                    type="button"
                    onClick={() => setIsAboutOpen(!isAboutOpen)}
                    className="mb-3 flex w-full items-center justify-between gap-2 px-2 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Info size={14} className="text-[var(--text-muted)]" />
                      <h3 className="theme-section-label text-sm font-bold">About</h3>
                    </div>
                    <span className={`theme-muted text-xs transition-transform duration-200 ${isAboutOpen ? "rotate-180" : ""}`}>▾</span>
                  </button>

                  <CollapsiblePanel open={isAboutOpen}>
                    <div className="surface-tile rounded-[24px] p-4">
                      <p className="theme-heading text-sm font-bold">Weather App</p>
                      <p className="theme-muted mt-0.5 text-xs">
                        Personality-driven forecasts powered by multiple open data sources and AI.
                      </p>

                      <div className="mt-4 flex flex-col gap-3">

                      {/* Always-on data sources */}
                      <div>
                        <p className="theme-section-label mb-2 text-[11px] font-bold uppercase tracking-wider">Always fetched</p>
                        <div className="flex flex-col gap-2">
                          {[
                            { name: "Open-Meteo Forecast", url: "open-meteo.com", desc: "Current conditions, hourly & 16-day forecast — multi-model ensemble (NOAA, ECMWF, GFS, GEM)", ok: !!weather },
                            { name: "Open-Meteo Air Quality", url: "open-meteo.com", desc: "AQI, PM2.5, PM10, ozone, NO₂, pollen counts", ok: !!airQuality },
                            { name: "Open-Meteo Archive", url: "open-meteo.com", desc: "Same-day last year + 3-year climate normals for context", ok: !!historical },
                            { name: "Open-Meteo Flood", url: "open-meteo.com", desc: "River discharge levels from the GloFAS hydrological model", ok: !!flood },
                            { name: "Open-Meteo Marine", url: "open-meteo.com", desc: "Wave height, direction, and period — coastal locations only", ok: !!marine },
                            { name: "NWS Alerts", url: "weather.gov", desc: "Severe weather alerts from the National Weather Service (US only)", ok: nwsConnected },
                            { name: "OpenStreetMap Nominatim", url: "nominatim.openstreetmap.org", desc: "Reverse geocoding — turns coordinates into readable place names", ok: !!locationName },
                            { name: "Open-Meteo Geocoding", url: "geocoding-api.open-meteo.com", desc: "Powers the location search bar", ok: true },
                          ].map((src) => (
                            <div key={src.name} className="flex items-start gap-2.5">
                              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${loading ? "bg-[var(--text-muted)] opacity-40" : src.ok ? "bg-emerald-500" : "bg-[var(--text-muted)] opacity-50"}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="theme-heading text-[11px] font-bold">{src.name}</span>
                                    <span className="theme-subtle mx-1 text-[10px]">·</span>
                                    <span className="theme-subtle text-[10px]">{src.url}</span>
                                  </div>
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${loading ? "bg-[var(--surface-chip)] text-[var(--text-muted)]" : src.ok ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-[var(--surface-chip)] text-[var(--text-muted)]"}`}>
                                    {loading ? "—" : src.ok ? "OK" : "N/A"}
                                  </span>
                                </div>
                                <p className="theme-muted mt-0.5 text-[10px] leading-relaxed">{src.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Server-side / keyed sources */}
                      <div className="border-t border-[color:var(--border-soft)] pt-3">
                        <p className="theme-section-label mb-1 text-[11px] font-bold uppercase tracking-wider">Enhanced (server-side)</p>
                        <p className="theme-subtle mb-2 text-[10px]">Falls back gracefully if API keys are not configured.</p>
                        <div className="flex flex-col gap-2">
                          {[
                            { name: "WeatherAPI", url: "weatherapi.com", desc: "Moon phase, moonrise/set, sunrise/sunset times", ok: !!astronomy },
                            { name: "Pirate Weather", url: "pirateweather.net", desc: "Minute-by-minute rain forecast for the next hour", ok: pirateWeatherConnected },
                            { name: "Aviation Weather (METAR)", url: "aviationweather.gov", desc: "Raw observations from the nearest reporting airport", ok: metarConnected },
                          ].map((src) => (
                            <div key={src.name} className="flex items-start gap-2.5">
                              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${loading ? "bg-[var(--text-muted)] opacity-40" : src.ok ? "bg-emerald-500" : "bg-amber-500/70"}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="theme-heading text-[11px] font-bold">{src.name}</span>
                                    <span className="theme-subtle mx-1 text-[10px]">·</span>
                                    <span className="theme-subtle text-[10px]">{src.url}</span>
                                  </div>
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${loading ? "bg-[var(--surface-chip)] text-[var(--text-muted)]" : src.ok ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}>
                                    {loading ? "—" : src.ok ? "OK" : "No key"}
                                  </span>
                                </div>
                                <p className="theme-muted mt-0.5 text-[10px] leading-relaxed">{src.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI + Privacy */}
                      <div className="border-t border-[color:var(--border-soft)] pt-3">
                        <p className="theme-section-label mb-2 text-[11px] font-bold uppercase tracking-wider">AI & Privacy</p>
                        <div className="flex flex-col gap-1.5">
                          <p className="theme-muted text-[10px] leading-relaxed">
                            <span className="theme-heading font-bold">Gemini Flash</span> via Vercel AI Gateway generates personality-driven advice on each refresh using current conditions, AQI, and active alerts. No data is stored.
                          </p>
                          <p className="theme-muted text-[10px] leading-relaxed">
                            Your location is never stored on a server. Settings, recent searches, and custom personalities are saved locally on this device only.
                          </p>
                        </div>
                      </div>

                      </div>
                    </div>
                  </CollapsiblePanel>
              </div>

            </div>
          </div>
        </CollapsiblePanel>
      </div>

      {loading && !weather ? (
        <div className="flex flex-1 flex-col items-center justify-center space-y-4 pt-20">
          <Loader2 className="animate-spin text-[var(--text-primary)]" size={48} />
          <div className="space-y-1 text-center">
            <p className="theme-muted animate-pulse font-semibold">Checking the skies...</p>
            {isLocationDelayed ? (
              <p className="theme-subtle max-w-xs text-sm">
                Location is taking longer than usual. Search for a city above while we keep trying.
              </p>
            ) : null}
          </div>
        </div>
      ) : locationLoadError && !weather ? (
        <div className="surface-card mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-3 rounded-[32px] px-8 py-12 text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">{locationName || "This location"}</p>
          <p className="theme-muted max-w-sm text-sm">{locationLoadError}</p>
        </div>
      ) : (
        <WeatherCard
          locationName={locationName}
          weatherData={weather}
          isDetailed={isDetailed}
          onToggleDetail={() => setIsDetailed(!isDetailed)}
          aiAdvice={aiAdvice}
          allPersonalities={allPersonalities}
          personalityId={personality}
          selectedPersonality={selectedPersonality}
          customPersonalitiesCount={customPersonalities.length}
          customIdea={customIdea}
          customPersonalityError={customPersonalityError}
          isGeneratingCustomPersonality={isGeneratingCustomPersonality}
          onCustomIdeaChange={(value) => {
            setCustomIdea(value);
            if (customPersonalityError) {
              setCustomPersonalityError(null);
            }
          }}
          onPersonalityChange={handlePersonalityChange}
          onDeleteCustomPersonality={handleDeleteCustomPersonality}
          onGenerateCustomPersonality={() => void handleGenerateCustomPersonality()}
          distUnit={settings.distUnit}
          airQuality={airQuality}
          marine={marine}
          flood={flood}
          historical={historical}
          astronomy={astronomy}
          weatherAlerts={weatherAlerts}
          nwsAlerts={nwsAlerts}
          forecastConfidence={forecastConfidence}
          climateNormal={climateNormal}
          metar={metar}
          metarConnected={metarConnected}
          rainSummary={rainSummary}
          pirateWeatherConnected={pirateWeatherConnected}
          nwsConnected={nwsConnected}
        />
      )}

    </main>
  );
}
