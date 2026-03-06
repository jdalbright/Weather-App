"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import WeatherCard from "@/components/WeatherCard";
import SearchBar from "@/components/SearchBar";
import {
  getThemeFromCode,
  getWeatherData,
  getWeatherDescriptionFromCode,
  formatVisibility,
  formatWindSpeed,
  getLocalTimeForOffset
} from "@/lib/weather";
import {
  ChevronRight,
  CloudSun,
  Flame,
  Heart,
  Loader2,
  MoonStar,
  Search,
  Settings,
  Sparkles,
  Trees,
  X,
  Zap,
} from "lucide-react";
import { DEFAULT_PERSONALITY, getPersonality, PERSONALITIES, type Personality } from "@/lib/personalities";

const PERSONALITY_ICONS = {
  flame: Flame,
  sparkles: Sparkles,
  moon: MoonStar,
  cloud: CloudSun,
  zap: Zap,
  heart: Heart,
  search: Search,
  trees: Trees,
} as const;

export default function Home() {
  type WeatherResponse = NonNullable<Awaited<ReturnType<typeof getWeatherData>>>;

  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDetailed, setIsDetailed] = useState(false);
  const [personality, setPersonality] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("weather-personality") || DEFAULT_PERSONALITY;
    }

    return DEFAULT_PERSONALITY;
  });
  const [aiAdvice, setAiAdvice] = useState("");
  const [theme, setTheme] = useState("theme-sun");
  const [locationName, setLocationName] = useState("New York");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const adviceRequestIdRef = useRef(0);
  const personalityRef = useRef(personality);
  const [settings, setSettings] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("weather-settings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            tempUnit: parsed.tempUnit || "fahrenheit",
            distUnit: parsed.distUnit || "mph"
          } as { tempUnit: "celsius" | "fahrenheit", distUnit: "kmh" | "mph" };
        } catch (e) {
          console.error("Failed to parse settings", e);
        }
      }
    }
    return {
      tempUnit: "fahrenheit" as "celsius" | "fahrenheit",
      distUnit: "mph" as "kmh" | "mph"
    };
  });

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("weather-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("weather-personality", personality);
  }, [personality]);

  useEffect(() => {
    personalityRef.current = personality;
  }, [personality]);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const fetchAIAdvice = useCallback(async (weatherData: WeatherResponse, currentP: string) => {
    const requestId = ++adviceRequestIdRef.current;

    try {
      const destinationDate = getLocalTimeForOffset(weatherData.utc_offset_seconds);
      const localTimeString = destinationDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
      const localDayString = destinationDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personality: currentP,
          weather: {
            temp: Math.round(weatherData.current.temperature_2m),
            unit: settings.tempUnit === "fahrenheit" ? "F" : "C",
            condition: getWeatherDescriptionFromCode(weatherData.current.weather_code),
            isDay: weatherData.current.is_day === 1,
            localTime: `${localDayString}, ${localTimeString}`,
            windSpeed: formatWindSpeed(weatherData.current.wind_speed_10m, weatherData.current_units.wind_speed_10m),
            humidity: weatherData.current.relative_humidity_2m,
            rainChance: weatherData.current.precipitation_probability,
            feelsLike: Math.round(weatherData.current.apparent_temperature),
            uvIndex: weatherData.daily.uv_index_max?.[0] || 0,
            highTemp: Math.round(weatherData.daily.temperature_2m_max[0]),
            lowTemp: Math.round(weatherData.daily.temperature_2m_min[0]),
            cloudCover: weatherData.current.cloud_cover,
            visibility: formatVisibility(weatherData.current.visibility, settings.distUnit, weatherData.current_units.visibility),
            sunrise: weatherData.daily.sunrise?.[0]
              ? new Date(new Date(weatherData.daily.sunrise[0]).getTime() + (weatherData.utc_offset_seconds * 1000) + (new Date().getTimezoneOffset() * 60000)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
              : undefined,
            sunset: weatherData.daily.sunset?.[0]
              ? new Date(new Date(weatherData.daily.sunset[0]).getTime() + (weatherData.utc_offset_seconds * 1000) + (new Date().getTimezoneOffset() * 60000)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
              : undefined
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
  }, [settings.distUnit, settings.tempUnit]);

  const fetchWeatherForLocation = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    const data = await getWeatherData(lat, lon, settings.tempUnit, settings.distUnit);
    if (data) {
      setWeather(data);
      setTheme(getThemeFromCode(data.current.weather_code, data.current.is_day));
      void fetchAIAdvice(data, personalityRef.current);
    }
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
            } else {
              setLocationName("Current Location");
            }
          } catch {
            setLocationName("Current Location");
          }
          window.requestAnimationFrame(() => {
            setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
          });
        },
        () => {
          console.log("Geolocation denied or failed, defaulting to NYC.");
          window.requestAnimationFrame(() => {
            setCoords({ lat: 40.7128, lon: -74.0060 }); // Default to NYC
          });
        }
      );
    } else {
      window.requestAnimationFrame(() => {
        setCoords({ lat: 40.7128, lon: -74.0060 }); // Default to NYC
      });
    }
  }, []);

  useEffect(() => {
    if (coords) {
      const frameId = window.requestAnimationFrame(() => {
        void fetchWeatherForLocation(coords.lat, coords.lon);
      });

      return () => window.cancelAnimationFrame(frameId);
    }
  }, [coords, fetchWeatherForLocation]);

  const handlePersonalityChange = (newP: string) => {
    setPersonality(newP);
    if (weather) {
      void fetchAIAdvice(weather, newP);
    }
  };

  // Handle location selection from search
  const handleLocationSelect = async (lat: number, lon: number, name: string) => {
    setLocationName(name);
    setCoords({ lat, lon });
  };

  const selectedPersonality = getPersonality(personality);

  const renderPersonalityIcon = (personalityOption: Personality, active: boolean) => {
    const Icon = PERSONALITY_ICONS[personalityOption.icon];
    return (
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${active ? "bg-sky-100 text-sky-700" : "bg-white/80 text-gray-500"}`}>
        <Icon size={18} />
      </div>
    );
  };

  return (
    <main className="min-h-screen px-4 md:px-8 pt-8 pb-8 flex flex-col items-center gap-8 transition-colors duration-1000">

      {/* Top Search, Units & Personality Settings */}
      <div className="w-full max-w-lg flex flex-col gap-8">

        <div className="flex gap-2 relative z-50">
          <div className="flex-1 relative">
            <SearchBar onLocationSelect={handleLocationSelect} />
          </div>

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`bg-white/70 backdrop-blur-md shadow-lg rounded-[24px] px-4 h-14 border-2 transition-all flex items-center justify-center min-w-[60px] ${isSettingsOpen ? "border-sky-400 text-sky-600 bg-white" : "border-transparent text-gray-800 hover:bg-white"}`}
          >
            {isSettingsOpen ? <X size={24} /> : <Settings size={24} />}
          </button>
        </div>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full rounded-[28px] border-2 border-white/70 bg-white/55 px-5 py-4 text-left shadow-lg backdrop-blur-md transition-all hover:bg-white/70"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {renderPersonalityIcon(selectedPersonality, true)}
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Forecast Voice</p>
                <p className="text-lg font-bold text-gray-800">{selectedPersonality.label}</p>
                <p className="truncate text-sm text-gray-500">{selectedPersonality.description}</p>
              </div>
            </div>
            <ChevronRight className="shrink-0 text-gray-400" size={20} />
          </div>
        </button>

        {/* Settings Panel */}
        {isSettingsOpen && (
          <div className="bg-white/60 backdrop-blur-xl rounded-[32px] p-6 shadow-xl border-2 border-white/80 animate-in fade-in slide-in-from-top-4 duration-300 relative z-40 -mt-4">
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 px-2">Temperature</h3>
                <div className="flex bg-white/40 rounded-full p-1 shadow-inner">
                  <button
                    onClick={() => setSettings({ ...settings, tempUnit: "fahrenheit" })}
                    className={`flex-1 h-10 flex items-center justify-center text-sm font-bold px-4 rounded-full transition-all ${settings.tempUnit === "fahrenheit" ? "bg-white text-sky-600 shadow-md" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Fahrenheit (&deg;F)
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, tempUnit: "celsius" })}
                    className={`flex-1 h-10 flex items-center justify-center text-sm font-bold px-4 rounded-full transition-all ${settings.tempUnit === "celsius" ? "bg-white text-sky-600 shadow-md" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Celsius (&deg;C)
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 px-2">Distance & Wind</h3>
                <div className="flex bg-white/40 rounded-full p-1 shadow-inner">
                  <button
                    onClick={() => setSettings({ ...settings, distUnit: "mph" })}
                    className={`flex-1 h-10 flex items-center justify-center text-sm font-bold px-4 rounded-full transition-all ${settings.distUnit === "mph" ? "bg-white text-sky-600 shadow-md" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Imperial (mi, mph)
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, distUnit: "kmh" })}
                    className={`flex-1 h-10 flex items-center justify-center text-sm font-bold px-4 rounded-full transition-all ${settings.distUnit === "kmh" ? "bg-white text-sky-600 shadow-md" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Metric (km, km/h)
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between px-2">
                  <div>
                    <h3 className="text-sm font-bold uppercase text-gray-500">Forecast Voice</h3>
                    <p className="text-xs text-gray-500">Pick the personality that delivers the advice.</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700 shadow-sm">
                    {selectedPersonality.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {PERSONALITIES.map((option) => {
                    const isActive = option.id === personality;

                    return (
                      <button
                        key={option.id}
                        onClick={() => handlePersonalityChange(option.id)}
                        className={`rounded-[24px] border-2 p-4 text-left transition-all ${isActive
                          ? "border-sky-300 bg-white shadow-md"
                          : "border-transparent bg-white/45 hover:bg-white/70 hover:border-white/80"
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          {renderPersonalityIcon(option, isActive)}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800">{option.label}</span>
                              {isActive && (
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm font-medium text-gray-600">{option.description}</p>
                            <p className="mt-2 text-xs text-gray-500">{option.preview}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && !weather ? (
        <div className="flex flex-col items-center justify-center flex-1 space-y-4">
          <Loader2 className="animate-spin text-white" size={48} />
          <p className="font-semibold text-white/80 animate-pulse">Checking the skies...</p>
        </div>
      ) : (
        <WeatherCard
          locationName={locationName}
          weatherData={weather}
          isDetailed={isDetailed}
          onToggleDetail={() => setIsDetailed(!isDetailed)}
          aiAdvice={aiAdvice}
          distUnit={settings.distUnit}
        />
      )}

    </main>
  );
}
