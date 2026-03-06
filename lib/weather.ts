export interface WeatherData {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: {
    time: string;
    interval: string;
    temperature_2m: string;
    relative_humidity_2m: string;
    apparent_temperature: string;
    is_day: string;
    precipitation: string;
    precipitation_probability: string;
    weather_code: string;
    wind_speed_10m: string;
    cloud_cover: string;
    visibility: string;
  };
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    precipitation_probability: number;
    weather_code: number;
    wind_speed_10m: number;
    cloud_cover: number;
    visibility: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
    is_day: number[];
    cloud_cover: number[];
    visibility: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
    precipitation_probability_max: number[];
  };
}

export async function getWeatherData(
  lat: number,
  lon: number,
  tempUnit: "celsius" | "fahrenheit" = "celsius",
  windUnit: "kmh" | "mph" = "kmh"
): Promise<WeatherData | null> {
  try {
    const tempUnitParam = tempUnit === "fahrenheit" ? "&temperature_unit=fahrenheit" : "";
    const windUnitParam = windUnit === "mph" ? "&wind_speed_unit=mph" : "";
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,precipitation_probability,weather_code,wind_speed_10m,cloud_cover,visibility&hourly=temperature_2m,weather_code,precipitation_probability,is_day,cloud_cover,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto&forecast_days=16${tempUnitParam}${windUnitParam}`
    );

    if (!res.ok) {
      throw new Error("Failed to fetch weather data");
    }

    const data = await res.json();
    return data as WeatherData;
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  name: string;
}

export async function geocodeLocation(query: string, count: number = 1): Promise<GeocodeResult[] | null> {
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=${count}&language=en&format=json`);
    if (!res.ok) throw new Error("Failed to geocode");
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results.map((result: {
        latitude: number;
        longitude: number;
        name: string;
        admin1?: string;
        country?: string;
      }) => ({
        lat: result.latitude,
        lon: result.longitude,
        name: `${result.name}${result.admin1 ? `, ${result.admin1}` : ''}${result.country ? `, ${result.country}` : ''}`
      }));
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export function getWeatherIconFromCode(code: number, isDay: number = 1) {
  // WMO Weather interpretation codes
  if (code === 0) return isDay ? "sun" : "moon";
  if (code === 1 || code === 2) return isDay ? "cloud-sun" : "cloud-moon";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "cloud-fog";
  if (code >= 51 && code <= 61 || code >= 80 && code <= 81) return "cloud-rain";
  if (code >= 63 && code <= 67 || code === 82) return "cloud-heavy-rain";
  if (code >= 71 && code <= 77 || code >= 85 && code <= 86) return "cloud-snow";
  if (code >= 95) return "cloud-lightning";
  return "cloud";
}

export function getWeatherDescriptionFromCode(code: number) {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 56 && code <= 57) return "Freezing Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 66 && code <= 67) return "Freezing Rain";
  if (code >= 71 && code <= 77) return "Snow fall";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Unknown";
}

export function getThemeFromCode(code: number, isDay: number = 1) {
  if (!isDay) return "theme-night";
  if (code === 0 || code === 1) return "theme-sun";
  if (code === 2 || code === 3 || code === 45 || code === 48) return "theme-cloud";
  if (code >= 51 && code <= 67 || code >= 80 && code <= 82 || code >= 95) return "theme-rain";
  if (code >= 71 && code <= 77 || code >= 85 && code <= 86) return "theme-snow";
  return "theme-sun";
}

/**
 * Robustly calculates local time for a given UTC offset.
 */
export function getLocalTimeForOffset(utcOffsetSeconds: number) {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (utcOffsetSeconds * 1000));
}

/**
 * Formats visibility value based on distance unit.
 */
export function formatVisibility(meters: number, distUnit: "kmh" | "mph", currentUnitsVisibility: string): string {
  if (currentUnitsVisibility === "m") {
    if (distUnit === "mph") {
      return (meters / 1609.34).toFixed(1) + " mi";
    }
    return (meters / 1000).toFixed(1) + " km";
  }
  // Fallback/Legacy: Assuming it might be in feet or already processed miles
  return (meters / 5280).toFixed(1) + " mi";
}

/**
 * Formats wind speed value with unit label.
 */
export function formatWindSpeed(speed: number, currentUnitsWind: string): string {
  const unit = currentUnitsWind === "mp/h" ? "mph" : currentUnitsWind;
  return `${speed} ${unit}`;
}
