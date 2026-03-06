"use client";

import { useState, useEffect } from "react";
import WeatherCard from "@/components/WeatherCard";
import { getThemeFromCode, getWeatherData } from "@/lib/weather";
import { Search, Loader2 } from "lucide-react";

const PERSONALITIES = [
  { id: "snarky", label: "Snarky" },
  { id: "gen-z", label: "Gen-Z" },
  { id: "goth", label: "Goth" },
  { id: "meteorologist", label: "Pro" },
];

export default function Home() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDetailed, setIsDetailed] = useState(false);
  const [personality, setPersonality] = useState("snarky");
  const [aiAdvice, setAiAdvice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState("theme-sun");

  // Load weather on mount (defaulting to NYC if geolocations fails or is loading)
  useEffect(() => {
    fetchWeatherForLocation(40.7128, -74.0060); // Default to NYC for now

    // In a real app we'd trigger navigator.geolocation here
  }, []);

  const fetchWeatherForLocation = async (lat: number, lon: number) => {
    setLoading(true);
    const data = await getWeatherData(lat, lon);
    if (data) {
      setWeather(data);
      const newTheme = getThemeFromCode(data.current.weather_code, data.current.is_day);
      setTheme(newTheme);
      document.body.className = newTheme; // Apply theme to root
      fetchAIAdvice(data, personality);
    }
    setLoading(false);
  };

  const fetchAIAdvice = async (weatherData: any, currentP: string) => {
    setAiAdvice("");
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personality: currentP,
          weather: {
            temp: Math.round(weatherData.current.temperature_2m),
            condition: weatherData.current.weather_code, // Ideally mapped to string
            isDay: weatherData.current.is_day === 1
          }
        })
      });
      const json = await res.json();
      setAiAdvice(json.text);
    } catch (e) {
      setAiAdvice("Failed to get advice.");
    }
  };

  const handlePersonalityChange = (newP: string) => {
    setPersonality(newP);
    if (weather) {
      fetchAIAdvice(weather, newP);
    }
  };

  // Simple mock geo-search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app we'd hit a geocoding API to turn string -> lat/lon
    // For now, let's just trigger a re-fetch with LA coordinates as a mock demo
    if (searchQuery.toLowerCase().includes("los")) {
      fetchWeatherForLocation(34.0522, -118.2437);
    } else {
      fetchWeatherForLocation(51.5074, -0.1278); // London
    }
    setSearchQuery("");
  };

  return (
    <main className="min-h-screen p-4 md:p-8 flex flex-col items-center gap-8 pt-12 transition-colors duration-1000">

      {/* Top Search & Personality Settings */}
      <div className="w-full max-w-lg flex flex-col gap-4">

        <form onSubmit={handleSearch} className="relative w-full shadow-lg rounded-[24px]">
          <input
            type="text"
            placeholder="Search city... (try 'london')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/70 backdrop-blur-md rounded-[24px] py-4 pl-6 pr-12 outline-none border-2 border-transparent focus:border-white transition-all text-gray-800 font-semibold"
          />
          <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-800 transition-colors">
            <Search size={20} />
          </button>
        </form>

        <div className="flex bg-white/40 rounded-full p-1 shadow-inner overflow-x-auto hide-scrollbar">
          {PERSONALITIES.map(p => (
            <button
              key={p.id}
              onClick={() => handlePersonalityChange(p.id)}
              className={`flex-1 min-w-[80px] text-sm font-bold py-2 px-4 rounded-full transition-all duration-300 ${personality === p.id
                  ? "bg-white text-gray-800 shadow-md"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/20"
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !weather ? (
        <div className="flex flex-col items-center justify-center flex-1 space-y-4">
          <Loader2 className="animate-spin text-white" size={48} />
          <p className="font-semibold text-white/80 animate-pulse">Checking the skies...</p>
        </div>
      ) : (
        <WeatherCard
          weatherData={weather}
          isDetailed={isDetailed}
          onToggleDetail={() => setIsDetailed(!isDetailed)}
          aiAdvice={aiAdvice}
        />
      )}

    </main>
  );
}
