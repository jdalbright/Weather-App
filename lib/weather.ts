export async function getWeatherData(lat: number, lon: number) {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`
    );

    if (!res.ok) {
      throw new Error("Failed to fetch weather data");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
}

export function getWeatherIconFromCode(code: number, isDay: number = 1) {
  // WMO Weather interpretation codes
  if (code === 0) return isDay ? "sun" : "moon";
  if (code === 1 || code === 2 || code === 3)
    return isDay ? "cloud-sun" : "cloud-moon";
  if (code === 45 || code === 48) return "cloud-fog";
  if (code >= 51 && code <= 67) return "cloud-rain";
  if (code >= 71 && code <= 77) return "cloud-snow";
  if (code >= 80 && code <= 82) return "cloud-rain"; /* Showers */
  if (code >= 85 && code <= 86) return "cloud-snow";
  if (code >= 95) return "cloud-lightning";
  return "cloud";
}

export function getThemeFromCode(code: number, isDay: number = 1) {
    if (!isDay) return "theme-night";
    if (code === 0 || code === 1) return "theme-sun";
    if (code === 2 || code === 3 || code === 45 || code === 48) return "theme-cloud";
    if (code >= 51 && code <= 67 || code >= 80 && code <= 82 || code >= 95) return "theme-rain";
    if (code >= 71 && code <= 77 || code >= 85 && code <= 86) return "theme-snow";
    return "theme-sun";
}
