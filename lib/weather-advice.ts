export type ChatWeatherPayload = {
  temp?: number;
  unit?: string;
  condition?: string;
  isDay?: boolean;
  localTime?: string;
  sunrise?: string;
  sunset?: string;
  windSpeed?: string;
  rainChance?: number;
  feelsLike?: number;
  uvIndex?: number;
  highTemp?: number;
  lowTemp?: number;
  aqi?: number;
  alerts?: string;
};

export function buildWeatherPrompt(weather?: ChatWeatherPayload): string {
  return [
    `Current Local Time: ${weather?.localTime ?? "Unknown"}.`,
    `Weather: ${weather?.temp ?? "?"}°${weather?.unit ?? "F"} (${weather?.condition ?? "Unknown conditions"}).`,
    `Feels Like: ${weather?.feelsLike ?? "?"}°.`,
    `Daily High/Low: ${weather?.highTemp ?? "?"}°/${weather?.lowTemp ?? "?"}°.`,
    `Daylight: ${weather?.isDay ? "Daytime" : "Nighttime"}.`,
    weather?.sunrise || weather?.sunset
      ? `Sunrise/Sunset: ${weather?.sunrise ?? "Unknown"}/${weather?.sunset ?? "Unknown"}.`
      : null,
    `Wind Speed: ${weather?.windSpeed ?? "Unknown"}.`,
    `Rain Chance: ${weather?.rainChance ?? 0}%.`,
    `UV Index: ${weather?.uvIndex ?? 0}.`,
    weather?.aqi != null ? `Air Quality Index (US AQI): ${weather.aqi}.` : null,
    weather?.alerts ? `Weather Alerts: ${weather.alerts}.` : null,
    "Give short, practical advice that reflects the conditions and time of day.",
  ]
    .filter(Boolean)
    .join(" ");
}
