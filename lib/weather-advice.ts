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

export function buildForecastWeatherPrompt(weather?: ChatWeatherPayload): string {
  return [
    "Weather data for one location.",
    `Current conditions: ${weather?.temp ?? "?"}°${weather?.unit ?? "F"}, ${weather?.condition ?? "Unknown conditions"}, feels like ${weather?.feelsLike ?? "?"}°, ${weather?.isDay ? "daytime" : "nighttime"}, wind ${weather?.windSpeed ?? "Unknown"}.`,
    `Current local time: ${weather?.localTime ?? "Unknown"}.`,
    weather?.sunrise || weather?.sunset
      ? `Sunrise/sunset context: ${weather?.sunrise ?? "Unknown"}/${weather?.sunset ?? "Unknown"}.`
      : null,
    `Forecast context: today's high/low ${weather?.highTemp ?? "?"}°/${weather?.lowTemp ?? "?"}°, precipitation chance ${weather?.rainChance ?? 0}%, UV index ${weather?.uvIndex ?? 0}.`,
    weather?.alerts ? `Alert context: ${weather.alerts}.` : null,
    "Use the context selectively based on each field's job.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildAirQualityPrompt(weather?: ChatWeatherPayload): string {
  return [
    "Air quality and apparent-temperature data for one location.",
    weather?.aqi != null ? `Current US AQI: ${weather.aqi}.` : "Current US AQI: unavailable.",
    `Current weather context: ${weather?.temp ?? "?"}°${weather?.unit ?? "F"}, feels like ${weather?.feelsLike ?? "?"}°, ${weather?.condition ?? "Unknown conditions"}, wind ${weather?.windSpeed ?? "Unknown"}.`,
    "Write only about current air quality impact and current apparent temperature, and keep both separate from the general forecast.",
  ]
    .filter(Boolean)
    .join(" ");
}
