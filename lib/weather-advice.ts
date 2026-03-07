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
    "Weather data for one location.",
    `Current conditions: ${weather?.temp ?? "?"}°${weather?.unit ?? "F"}, ${weather?.condition ?? "Unknown conditions"}, feels like ${weather?.feelsLike ?? "?"}°, ${weather?.isDay ? "daytime" : "nighttime"}, wind ${weather?.windSpeed ?? "Unknown"}.`,
    `Current local time: ${weather?.localTime ?? "Unknown"}.`,
    weather?.sunrise || weather?.sunset
      ? `Sunrise/sunset context: ${weather?.sunrise ?? "Unknown"}/${weather?.sunset ?? "Unknown"}.`
      : null,
    `Forecast context: today's high/low ${weather?.highTemp ?? "?"}°/${weather?.lowTemp ?? "?"}°, precipitation chance ${weather?.rainChance ?? 0}%, UV index ${weather?.uvIndex ?? 0}.`,
    weather?.aqi != null ? `Air quality context: US AQI ${weather.aqi}.` : null,
    weather?.alerts ? `Alert context: ${weather.alerts}.` : null,
    "Use the context selectively based on each field's job.",
  ]
    .filter(Boolean)
    .join(" ");
}
