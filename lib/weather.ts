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
    apparent_temperature: number[];
    relative_humidity_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
    is_day: number[];
    wind_speed_10m: number[];
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
    rain_sum?: number[];
    showers_sum?: number[];
    snowfall_sum?: number[];
  };
}

function averageValidNumbers(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function extractConsensusSeries(
  section: Record<string, Array<number | null> | string[] | undefined> | undefined,
  baseKey: string,
  models: ForecastModel[],
  length: number
): number[] | null {
  if (!section) return null;

  const series = Array.from({ length }, (_, index) => {
    const averaged = averageValidNumbers(
      models.map((model) => {
        const values = section[`${baseKey}_${model.id}`];
        return Array.isArray(values) ? (values[index] as number | null | undefined) : null;
      })
    );
    return averaged;
  });

  return series.some((value) => value != null)
    ? series.map((value) => value ?? NaN)
    : null;
}

function extractConsensusModeSeries(
  section: Record<string, Array<number | null> | string[] | undefined> | undefined,
  baseKey: string,
  models: ForecastModel[],
  length: number
): number[] | null {
  if (!section) return null;

  const series = Array.from({ length }, (_, index) => {
    const counts = new Map<number, number>();

    models.forEach((model) => {
      const values = section[`${baseKey}_${model.id}`];
      const rawValue = Array.isArray(values) ? (values[index] as number | null | undefined) : null;
      if (rawValue == null || !Number.isFinite(rawValue)) return;

      const value = Math.round(rawValue);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    });

    if (counts.size === 0) return null;

    return [...counts.entries()]
      .sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]))[0][0];
  });

  return series.some((value) => value != null)
    ? series.map((value) => value ?? NaN)
    : null;
}

function findNearestTimeIndex(times: string[], targetTime?: string): number {
  if (!targetTime || times.length === 0) return -1;

  const exactIndex = times.indexOf(targetTime);
  if (exactIndex >= 0) return exactIndex;

  const targetHour = targetTime.slice(0, 13);
  const sameHourIndex = times.findIndex((time) => time.slice(0, 13) === targetHour);
  if (sameHourIndex >= 0) return sameHourIndex;

  const targetMs = new Date(targetTime).getTime();
  if (Number.isNaN(targetMs)) return -1;

  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  times.forEach((time, index) => {
    const timeMs = new Date(time).getTime();
    if (Number.isNaN(timeMs)) return;

    const distance = Math.abs(timeMs - targetMs);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function mergeConsensusForecastData(
  baseData: WeatherData,
  modelData: ModelTemperatureResponse | null,
  models: ForecastModel[]
): WeatherData {
  if (!modelData?.hourly?.time?.length || !modelData?.daily?.time?.length) {
    return baseData;
  }

  const hourlyConsensus = extractConsensusSeries(modelData.hourly, "temperature_2m", models, modelData.hourly.time.length);
  const hourlyApparentConsensus = extractConsensusSeries(modelData.hourly, "apparent_temperature", models, modelData.hourly.time.length);
  const hourlyHumidityConsensus = extractConsensusSeries(modelData.hourly, "relative_humidity_2m", models, modelData.hourly.time.length);
  const hourlyPrecipProbabilityConsensus = extractConsensusSeries(modelData.hourly, "precipitation_probability", models, modelData.hourly.time.length);
  const hourlyWindConsensus = extractConsensusSeries(modelData.hourly, "wind_speed_10m", models, modelData.hourly.time.length);
  const hourlyCloudConsensus = extractConsensusSeries(modelData.hourly, "cloud_cover", models, modelData.hourly.time.length);
  const hourlyVisibilityConsensus = extractConsensusSeries(modelData.hourly, "visibility", models, modelData.hourly.time.length);
  const hourlyWeatherCodeConsensus = extractConsensusModeSeries(modelData.hourly, "weather_code", models, modelData.hourly.time.length);
  const dailyMaxConsensus = extractConsensusSeries(modelData.daily, "temperature_2m_max", models, modelData.daily.time.length);
  const dailyMinConsensus = extractConsensusSeries(modelData.daily, "temperature_2m_min", models, modelData.daily.time.length);
  const dailyPrecipProbabilityConsensus = extractConsensusSeries(modelData.daily, "precipitation_probability_max", models, modelData.daily.time.length);
  const dailyWeatherCodeConsensus = extractConsensusModeSeries(modelData.daily, "weather_code", models, modelData.daily.time.length);

  if (
    !hourlyConsensus
    && !hourlyApparentConsensus
    && !hourlyHumidityConsensus
    && !hourlyPrecipProbabilityConsensus
    && !hourlyWindConsensus
    && !hourlyCloudConsensus
    && !hourlyVisibilityConsensus
    && !hourlyWeatherCodeConsensus
    && !dailyMaxConsensus
    && !dailyMinConsensus
    && !dailyPrecipProbabilityConsensus
    && !dailyWeatherCodeConsensus
  ) {
    return baseData;
  }

  const currentIndex = findNearestTimeIndex(modelData.hourly.time, baseData.current.time);
  const fallbackHourlyCurrent = hourlyConsensus?.find((value) => !Number.isNaN(value));
  const consensusCurrent = currentIndex >= 0 && hourlyConsensus?.[currentIndex] != null && !Number.isNaN(hourlyConsensus[currentIndex])
    ? hourlyConsensus[currentIndex]
    : fallbackHourlyCurrent;
  const fallbackHourlyApparent = hourlyApparentConsensus?.find((value) => !Number.isNaN(value));
  const consensusApparent = currentIndex >= 0 && hourlyApparentConsensus?.[currentIndex] != null && !Number.isNaN(hourlyApparentConsensus[currentIndex])
    ? hourlyApparentConsensus[currentIndex]
    : fallbackHourlyApparent;
  const fallbackHourlyHumidity = hourlyHumidityConsensus?.find((value) => !Number.isNaN(value));
  const consensusHumidity = currentIndex >= 0 && hourlyHumidityConsensus?.[currentIndex] != null && !Number.isNaN(hourlyHumidityConsensus[currentIndex])
    ? hourlyHumidityConsensus[currentIndex]
    : fallbackHourlyHumidity;
  const fallbackHourlyPrecipProbability = hourlyPrecipProbabilityConsensus?.find((value) => !Number.isNaN(value));
  const consensusPrecipProbability = currentIndex >= 0 && hourlyPrecipProbabilityConsensus?.[currentIndex] != null && !Number.isNaN(hourlyPrecipProbabilityConsensus[currentIndex])
    ? hourlyPrecipProbabilityConsensus[currentIndex]
    : fallbackHourlyPrecipProbability;
  const fallbackHourlyWind = hourlyWindConsensus?.find((value) => !Number.isNaN(value));
  const consensusWind = currentIndex >= 0 && hourlyWindConsensus?.[currentIndex] != null && !Number.isNaN(hourlyWindConsensus[currentIndex])
    ? hourlyWindConsensus[currentIndex]
    : fallbackHourlyWind;
  const fallbackHourlyCloud = hourlyCloudConsensus?.find((value) => !Number.isNaN(value));
  const consensusCloud = currentIndex >= 0 && hourlyCloudConsensus?.[currentIndex] != null && !Number.isNaN(hourlyCloudConsensus[currentIndex])
    ? hourlyCloudConsensus[currentIndex]
    : fallbackHourlyCloud;
  const fallbackHourlyVisibility = hourlyVisibilityConsensus?.find((value) => !Number.isNaN(value));
  const consensusVisibility = currentIndex >= 0 && hourlyVisibilityConsensus?.[currentIndex] != null && !Number.isNaN(hourlyVisibilityConsensus[currentIndex])
    ? hourlyVisibilityConsensus[currentIndex]
    : fallbackHourlyVisibility;
  const fallbackHourlyWeatherCode = hourlyWeatherCodeConsensus?.find((value) => !Number.isNaN(value));
  const consensusWeatherCode = currentIndex >= 0 && hourlyWeatherCodeConsensus?.[currentIndex] != null && !Number.isNaN(hourlyWeatherCodeConsensus[currentIndex])
    ? hourlyWeatherCodeConsensus[currentIndex]
    : fallbackHourlyWeatherCode;

  return {
    ...baseData,
    current: {
      ...baseData.current,
      temperature_2m: consensusCurrent ?? baseData.current.temperature_2m,
      relative_humidity_2m: consensusHumidity ?? baseData.current.relative_humidity_2m,
      apparent_temperature: consensusApparent ?? baseData.current.apparent_temperature,
      precipitation_probability: consensusPrecipProbability ?? baseData.current.precipitation_probability,
      weather_code: consensusWeatherCode ?? baseData.current.weather_code,
      wind_speed_10m: consensusWind ?? baseData.current.wind_speed_10m,
      cloud_cover: consensusCloud ?? baseData.current.cloud_cover,
      visibility: consensusVisibility ?? baseData.current.visibility,
    },
    hourly: {
      ...baseData.hourly,
      temperature_2m: hourlyConsensus?.map((value, index) => (
        Number.isNaN(value) ? baseData.hourly.temperature_2m[index] : value
      )) ?? baseData.hourly.temperature_2m,
      apparent_temperature: hourlyApparentConsensus?.map((value, index) => (
        Number.isNaN(value) ? baseData.hourly.apparent_temperature[index] : value
      )) ?? baseData.hourly.apparent_temperature,
      relative_humidity_2m: hourlyHumidityConsensus?.map((value, index) => (
        Number.isNaN(value) ? baseData.hourly.relative_humidity_2m[index] : value
      )) ?? baseData.hourly.relative_humidity_2m,
      weather_code: hourlyWeatherCodeConsensus?.map((value, index) => (
        Number.isNaN(value) ? baseData.hourly.weather_code[index] : value
      )) ?? baseData.hourly.weather_code,
      precipitation_probability: hourlyPrecipProbabilityConsensus?.map((value, index) => (
        Number.isNaN(value) ? baseData.hourly.precipitation_probability[index] : value
      )) ?? baseData.hourly.precipitation_probability,
      wind_speed_10m: hourlyWindConsensus?.map((value, index) => (
        Number.isNaN(value) ? baseData.hourly.wind_speed_10m[index] : value
      )) ?? baseData.hourly.wind_speed_10m,
      cloud_cover: hourlyCloudConsensus?.map((value, index) => (
        Number.isNaN(value) ? baseData.hourly.cloud_cover[index] : value
      )) ?? baseData.hourly.cloud_cover,
      visibility: hourlyVisibilityConsensus?.map((value, index) => (
        Number.isNaN(value) ? baseData.hourly.visibility[index] : value
      )) ?? baseData.hourly.visibility,
    },
    daily: {
      ...baseData.daily,
      weather_code: dailyWeatherCodeConsensus?.map((value, index) => (
        Number.isNaN(value) ? baseData.daily.weather_code[index] : value
      )) ?? baseData.daily.weather_code,
      temperature_2m_max: dailyMaxConsensus?.map((value, index) => (
        Number.isNaN(value) ? baseData.daily.temperature_2m_max[index] : value
      )) ?? baseData.daily.temperature_2m_max,
      temperature_2m_min: dailyMinConsensus?.map((value, index) => (
        Number.isNaN(value) ? baseData.daily.temperature_2m_min[index] : value
      )) ?? baseData.daily.temperature_2m_min,
      precipitation_probability_max: dailyPrecipProbabilityConsensus?.map((value, index) => (
        Number.isNaN(value) ? baseData.daily.precipitation_probability_max[index] : value
      )) ?? baseData.daily.precipitation_probability_max,
    },
  };
}

export async function getWeatherData(
  lat: number,
  lon: number,
  tempUnit: "celsius" | "fahrenheit" = "celsius",
  windUnit: "kmh" | "mph" = "kmh",
  countryCode?: string | null
): Promise<WeatherData | null> {
  try {
    const models = selectModelsForLocation(lat, lon, countryCode);
    const modelParam = models.map((model) => model.id).join(",");
    const tempUnitParam = tempUnit === "fahrenheit" ? "&temperature_unit=fahrenheit" : "";
    const windUnitParam = windUnit === "mph" ? "&wind_speed_unit=mph" : "";
    const [baseRes, modelRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,precipitation_probability,weather_code,wind_speed_10m,cloud_cover,visibility&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,precipitation_probability,wind_speed_10m,is_day,cloud_cover,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,rain_sum,showers_sum,snowfall_sum&timezone=auto&forecast_days=16${tempUnitParam}${windUnitParam}`
      ),
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,precipitation_probability,wind_speed_10m,cloud_cover,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16&models=${modelParam}${tempUnitParam}${windUnitParam}`
      ),
    ]);

    if (!baseRes.ok) {
      throw new Error("Failed to fetch weather data");
    }

    const data = await baseRes.json() as WeatherData;
    const modelData = modelRes.ok ? await modelRes.json() as ModelTemperatureResponse : null;
    return mergeConsensusForecastData(data, modelData, models);
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  name: string;
  countryCode?: string | null;
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
        country_code?: string;
      }) => ({
        lat: result.latitude,
        lon: result.longitude,
        name: `${result.name}${result.admin1 ? `, ${result.admin1}` : ''}${result.country ? `, ${result.country}` : ''}`,
        countryCode: result.country_code?.toUpperCase() ?? null,
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

export function isLiquidPrecipitationCode(code: number) {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
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

export function parseLocationDateTime(value: string): Date {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0);
}

export function parseLocationDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
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
  const roundedSpeed = Number.isFinite(speed)
    ? new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: speed < 10 ? 1 : 0,
      }).format(speed)
    : String(speed);
  return `${roundedSpeed} ${unit}`;
}

// ─── Air Quality ──────────────────────────────────────────────────────────────

export interface AirQualityData {
  current: {
    pm2_5: number;
    pm10: number;
    carbon_monoxide: number;
    nitrogen_dioxide: number;
    ozone: number;
    european_aqi: number;
    us_aqi: number;
  };
  hourly: {
    time: string[];
    grass_pollen: number[];
    birch_pollen: number[];
    alder_pollen: number[];
    us_aqi: number[];
  };
}

export async function getAirQualityData(lat: number, lon: number): Promise<AirQualityData | null> {
  try {
    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,european_aqi,us_aqi&hourly=grass_pollen,birch_pollen,alder_pollen,us_aqi&forecast_days=1`
    );
    if (!res.ok) throw new Error("Failed to fetch air quality");
    return await res.json() as AirQualityData;
  } catch {
    return null;
  }
}

export function getAQILevel(aqi: number): { label: string; color: string; bg: string } {
  if (aqi <= 50) return { label: "Good", color: "text-green-700", bg: "bg-green-100" };
  if (aqi <= 100) return { label: "Moderate", color: "text-yellow-700", bg: "bg-yellow-100" };
  if (aqi <= 150) return { label: "Sensitive", color: "text-orange-700", bg: "bg-orange-100" };
  if (aqi <= 200) return { label: "Unhealthy", color: "text-red-700", bg: "bg-red-100" };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "text-purple-700", bg: "bg-purple-100" };
  return { label: "Hazardous", color: "text-rose-900", bg: "bg-rose-200" };
}

// ─── Marine ───────────────────────────────────────────────────────────────────

export interface MarineData {
  current: {
    wave_height: number;
    wave_direction: number;
    wave_period: number;
  };
  current_units: {
    wave_height: string;
    wave_direction: string;
    wave_period: string;
  };
}

export async function getMarineData(lat: number, lon: number): Promise<MarineData | null> {
  try {
    const res = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_direction,wave_period`
    );
    if (!res.ok) throw new Error("No marine data");
    const data = await res.json();
    // Marine API returns error object for inland locations
    if (data.error) return null;
    return data as MarineData;
  } catch {
    return null;
  }
}

export function waveDirectionToCardinal(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

// ─── Flood ────────────────────────────────────────────────────────────────────

export interface FloodData {
  daily: {
    time: string[];
    river_discharge: number[];
    river_discharge_max: number[];
    river_discharge_min: number[];
    river_discharge_mean: number[];
  };
}

export async function getFloodData(lat: number, lon: number): Promise<FloodData | null> {
  try {
    const res = await fetch(
      `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge,river_discharge_max,river_discharge_min,river_discharge_mean&forecast_days=7`
    );
    if (!res.ok) throw new Error("Failed to fetch flood data");
    const data = await res.json();
    if (data.error) return null;
    return data as FloodData;
  } catch {
    return null;
  }
}

// ─── Historical (this day last year) ─────────────────────────────────────────

export interface HistoricalData {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  };
}

export async function getHistoricalData(
  lat: number,
  lon: number,
  tempUnit: "celsius" | "fahrenheit" = "celsius"
): Promise<HistoricalData | null> {
  try {
    const now = new Date();
    const lastYear = new Date(now);
    lastYear.setFullYear(now.getFullYear() - 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const tempUnitParam = tempUnit === "fahrenheit" ? "&temperature_unit=fahrenheit" : "";
    const res = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${fmt(lastYear)}&end_date=${fmt(lastYear)}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum${tempUnitParam}`
    );
    if (!res.ok) throw new Error("Failed to fetch historical data");
    return await res.json() as HistoricalData;
  } catch {
    return null;
  }
}

// ─── NWS Alerts (US only) ─────────────────────────────────────────────────────

export interface NWSAlert {
  event: string;
  headline: string;
  severity: string;
  description: string;
  expires: string;
}

export async function getNWSAlerts(lat: number, lon: number): Promise<NWSAlert[]> {
  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
      { headers: { "User-Agent": "WeatherApp/1.0" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.features) return [];
    return data.features.map((f: { properties: { event: string; headline: string; severity: string; description: string; expires: string } }) => ({
      event: f.properties.event,
      headline: f.properties.headline,
      severity: f.properties.severity,
      description: f.properties.description,
      expires: f.properties.expires,
    }));
  } catch {
    return [];
  }
}

// ─── WeatherAPI Astronomy + Alerts (requires WEATHERAPI_KEY) ──────────────────

export interface AstronomyData {
  moon_phase: string;
  moon_illumination: number;
  moonrise: string;
  moonset: string;
}

export interface WeatherAPIAlert {
  headline: string;
  severity: string;
  event: string;
  desc: string;
  expires: string;
}

// ─── Forecast Confidence (4-model spread) ────────────────────────────────────

export interface ForecastConfidence {
  spread: number;
  label: "High" | "Moderate" | "Uncertain";
  modelTemps: number[];
  modelNames: string[];
  /** Mean temperature across all successful models */
  aggregatedTemp: number;
}

type ForecastModel = {
  id: string;
  name: string;
};

type ModelTemperatureResponse = {
  current?: {
    time?: string;
    temperature_2m?: number | null;
  };
  hourly?: {
    time: string[];
    [key: string]: Array<number | null> | string[] | undefined;
  };
  daily?: {
    time: string[];
    [key: string]: Array<number | null> | string[] | undefined;
  };
};

function selectModelsForLocation(lat: number, lon: number, countryCode?: string | null): ForecastModel[] {
  const normalizedCountryCode = countryCode?.trim().toUpperCase();

  if (normalizedCountryCode === "US") {
    return [
      { id: "gfs_hrrr",      name: "NOAA HRRR"   },
      { id: "gfs_global",    name: "NOAA GFS"    },
      { id: "ecmwf_ifs",     name: "ECMWF IFS"   },
      { id: "gem_global",    name: "GEM Global"  },
    ];
  }

  if (normalizedCountryCode === "CA") {
    return [
      { id: "gem_global",    name: "GEM Global"  },
      { id: "gfs_global",    name: "NOAA GFS"    },
      { id: "ecmwf_ifs",     name: "ECMWF IFS"   },
      { id: "icon_global",   name: "ICON Global" },
    ];
  }

  if (normalizedCountryCode === "FR") {
    return [
      { id: "meteofrance_arome_france", name: "AROME France" },
      { id: "ecmwf_ifs",                name: "ECMWF IFS"    },
      { id: "icon_eu",                  name: "ICON EU"      },
      { id: "gfs_global",               name: "NOAA GFS"     },
    ];
  }

  if (normalizedCountryCode && ["NO", "SE", "FI", "DK", "IS"].includes(normalizedCountryCode)) {
    return [
      { id: "metno_nordic",  name: "MET Norway"  },
      { id: "ecmwf_ifs",     name: "ECMWF IFS"   },
      { id: "icon_eu",       name: "ICON EU"     },
      { id: "gfs_global",    name: "NOAA GFS"    },
    ];
  }

  if (normalizedCountryCode && ["AU", "NZ"].includes(normalizedCountryCode)) {
    return [
      { id: "bom_access_global", name: "ACCESS Global" },
      { id: "ecmwf_ifs",         name: "ECMWF IFS"     },
      { id: "gfs_global",        name: "NOAA GFS"      },
      { id: "icon_global",       name: "ICON Global"   },
    ];
  }

  // Coordinate fallback for Canada when country code is unavailable.
  if (
    (lat >= 48 && lat <= 84 && lon >= -141 && lon <= -52)
    || (lat >= 43.5 && lat <= 63 && lon >= -80.5 && lon <= -57)
  ) {
    return [
      { id: "gem_global",    name: "GEM Global"  },
      { id: "gfs_global",    name: "NOAA GFS"    },
      { id: "ecmwf_ifs",     name: "ECMWF IFS"   },
      { id: "icon_global",   name: "ICON Global" },
    ];
  }

  // Continental US
  if (lat >= 24 && lat <= 49.5 && lon >= -126 && lon <= -66) {
    return [
      { id: "gfs_hrrr",     name: "NOAA HRRR"   },
      { id: "gfs_global",   name: "NOAA GFS"    },
      { id: "ecmwf_ifs",    name: "ECMWF IFS"   },
      { id: "gem_global",   name: "GEM Global"  },
    ];
  }
  // France
  if (lat >= 41 && lat <= 51.5 && lon >= -5.5 && lon <= 10) {
    return [
      { id: "meteofrance_arome_france", name: "AROME France" },
      { id: "ecmwf_ifs",                name: "ECMWF IFS"    },
      { id: "icon_eu",                  name: "ICON EU"      },
      { id: "gfs_global",               name: "NOAA GFS"     },
    ];
  }
  // Nordic / Scandinavia
  if (lat >= 55 && lat <= 72 && lon >= 3 && lon <= 33) {
    return [
      { id: "metno_nordic", name: "MET Norway"  },
      { id: "ecmwf_ifs",    name: "ECMWF IFS"   },
      { id: "icon_eu",      name: "ICON EU"     },
      { id: "gfs_global",   name: "NOAA GFS"    },
    ];
  }
  // Europe (general)
  if (lat >= 34 && lat <= 72 && lon >= -12 && lon <= 45) {
    return [
      { id: "ecmwf_ifs",    name: "ECMWF IFS"   },
      { id: "icon_eu",      name: "ICON EU"     },
      { id: "gfs_global",   name: "NOAA GFS"    },
      { id: "icon_global",  name: "ICON Global" },
    ];
  }
  // Australia / New Zealand
  if (lat >= -50 && lat <= -10 && lon >= 110 && lon <= 180) {
    return [
      { id: "bom_access_global", name: "ACCESS Global" },
      { id: "ecmwf_ifs",         name: "ECMWF IFS"     },
      { id: "gfs_global",        name: "NOAA GFS"      },
      { id: "icon_global",       name: "ICON Global"   },
    ];
  }
  // Default — four major global models
  return [
    { id: "ecmwf_ifs",    name: "ECMWF IFS"   },
    { id: "gfs_global",   name: "NOAA GFS"    },
    { id: "icon_global",  name: "ICON Global" },
    { id: "gem_global",   name: "GEM Global"  },
  ];
}

function extractModelTemperature(data: ModelTemperatureResponse | null): number | null {
  if (data?.current?.temperature_2m != null) {
    return Math.round(data.current.temperature_2m);
  }

  const hourlyTemps = data?.hourly?.temperature_2m;
  if (!hourlyTemps) return null;

  const fallbackTemp = hourlyTemps.find((temp): temp is number => temp != null && Number.isFinite(temp));
  return fallbackTemp != null ? Math.round(fallbackTemp) : null;
}

async function fetchModelTemperatures(
  models: ForecastModel[],
  lat: number,
  lon: number,
  tempUnitParam: string
): Promise<Array<{ name: string; temp: number }>> {
  const results = await Promise.allSettled(
    models.map((model) =>
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&hourly=temperature_2m&forecast_hours=12&models=${model.id}${tempUnitParam}`
      )
        .then((response) => (response.ok ? response.json() as Promise<ModelTemperatureResponse> : null))
        .catch(() => null)
    )
  );

  return models
    .map((model, index) => {
      const result = results[index];
      if (result.status !== "fulfilled") return null;

      const temperature = extractModelTemperature(result.value);
      return temperature != null ? { name: model.name, temp: temperature } : null;
    })
    .filter((entry): entry is { name: string; temp: number } => entry !== null);
}

export async function getForecastConfidence(
  lat: number,
  lon: number,
  tempUnit: "celsius" | "fahrenheit" = "celsius",
  countryCode?: string | null
): Promise<ForecastConfidence | null> {
  const models = selectModelsForLocation(lat, lon, countryCode);
  const tempUnitParam = tempUnit === "fahrenheit" ? "&temperature_unit=fahrenheit" : "";
  const successful = await fetchModelTemperatures(models, lat, lon, tempUnitParam);

  // If regional models didn't produce enough data, fall back to the four global models
  if (successful.length < 2) {
    const globalModels = [
      { id: "ecmwf_ifs",   name: "ECMWF IFS"   },
      { id: "gfs_global",  name: "NOAA GFS"    },
      { id: "icon_global", name: "ICON Global" },
      { id: "gem_global",  name: "GEM Global"  },
    ];
    const fallback = await fetchModelTemperatures(globalModels, lat, lon, tempUnitParam);
    if (fallback.length < 2) return null;
    const fTemps = fallback.map(s => s.temp);
    const fSpread = Math.max(...fTemps) - Math.min(...fTemps);
    return {
      spread: Math.round(fSpread * 10) / 10,
      label: fSpread <= 2 ? "High" : fSpread <= 5 ? "Moderate" : "Uncertain",
      modelTemps: fTemps,
      modelNames: fallback.map(s => s.name),
      aggregatedTemp: Math.round(fTemps.reduce((a, b) => a + b, 0) / fTemps.length),
    };
  }

  const temps = successful.map(s => s.temp);
  const spread = Math.max(...temps) - Math.min(...temps);
  const aggregatedTemp = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
  return {
    spread: Math.round(spread * 10) / 10,
    label: spread <= 2 ? "High" : spread <= 5 ? "Moderate" : "Uncertain",
    modelTemps: temps,
    modelNames: successful.map(s => s.name),
    aggregatedTemp,
  };
}

// ─── Climate Normal (3-year average for today's date) ────────────────────────

export interface ClimateNormal {
  avg_high: number;
  avg_low: number;
  years_sampled: number;
}

export async function getClimateNormal(
  lat: number,
  lon: number,
  tempUnit: "celsius" | "fahrenheit" = "celsius"
): Promise<ClimateNormal | null> {
  const now = new Date();
  const tempUnitParam = tempUnit === "fahrenheit" ? "&temperature_unit=fahrenheit" : "";

  const dates = [1, 2, 3].map(n => {
    const d = new Date(now);
    d.setFullYear(now.getFullYear() - n);
    return d.toISOString().slice(0, 10);
  });

  const results = await Promise.allSettled(
    dates.map(date =>
      fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&daily=temperature_2m_max,temperature_2m_min${tempUnitParam}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    )
  );

  const highs: number[] = [];
  const lows: number[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value?.daily?.temperature_2m_max?.[0] != null) {
      highs.push(r.value.daily.temperature_2m_max[0]);
      lows.push(r.value.daily.temperature_2m_min[0]);
    }
  }

  if (highs.length === 0) return null;
  return {
    avg_high: Math.round(highs.reduce((a, b) => a + b, 0) / highs.length),
    avg_low: Math.round(lows.reduce((a, b) => a + b, 0) / lows.length),
    years_sampled: highs.length,
  };
}

// ─── METAR (actual observed conditions from nearest airport) ──────────────────

export interface MetarData {
  icaoId: string;
  name: string;
  temp: number;        // Celsius
  wind_speed: number;  // knots
  wind_dir: number;    // degrees
  visibility: number;  // statute miles
  lat?: number;
  lon?: number;
  distance_km?: number;
}

// ─── Pirate Weather rain summary ──────────────────────────────────────────────

export interface RainTimelinePoint {
  offset_minutes: number;
  precip_probability: number; // 0-1
  precip_intensity: number;
}

export interface RainSummary {
  summary: string; // e.g. "Rain starting in 8 minutes."
  isRaining: boolean;
  timeline?: RainTimelinePoint[];
}

export function getMoonPhaseEmoji(phase: string): string {
  const map: Record<string, string> = {
    "New Moon": "🌑",
    "Waxing Crescent": "🌒",
    "First Quarter": "🌓",
    "Waxing Gibbous": "🌔",
    "Full Moon": "🌕",
    "Waning Gibbous": "🌖",
    "Last Quarter": "🌗",
    "Waning Crescent": "🌘",
  };
  return map[phase] ?? "🌙";
}
