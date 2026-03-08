import type { AstronomyData, WeatherAPIAlert, MetarData, RainSummary, NWSAlert } from "@/lib/weather";

const USER_AGENT = "WeatherApp/1.0 (+https://github.com/jacobalbright)";

function parseNumber(value: string | null): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (deg: number) => deg * (Math.PI / 180);
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseNumber(searchParams.get("lat"));
  const lon = parseNumber(searchParams.get("lon"));
  const tempUnit = searchParams.get("tempUnit") ?? "celsius";

  if (lat == null || lon == null) {
    return Response.json({ error: "lat and lon required" }, { status: 400 });
  }

  const weatherApiKey = process.env.WEATHERAPI_KEY;
  const pirateKey = process.env.PIRATEWEATHER_KEY;

  const q = `${lat},${lon}`;

  const [astroRes, alertRes, metarAirportRes, pwRes, nwsRes] = await Promise.allSettled([
    weatherApiKey
      ? fetch(`https://api.weatherapi.com/v1/astronomy.json?key=${weatherApiKey}&q=${q}`)
      : Promise.resolve(null),
    weatherApiKey
      ? fetch(`https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${q}&days=1&alerts=yes`)
      : Promise.resolve(null),
    fetch(
      `https://aviationweather.gov/api/data/metar?bbox=${(lat - 1.5).toFixed(4)},${(lon - 1.5).toFixed(4)},${(lat + 1.5).toFixed(4)},${(lon + 1.5).toFixed(4)}&format=json`,
      { headers: { "User-Agent": USER_AGENT } }
    ),
    pirateKey
      // Pirate Weather intermittently 500s for some coordinates when hourly/daily
      // are excluded, so request the full payload and read the minutely block.
      ? fetch(`https://api.pirateweather.net/forecast/${pirateKey}/${lat},${lon}?units=${tempUnit === "fahrenheit" ? "us" : "si"}`)
      : Promise.resolve(null),
    fetch(
      `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" } }
    ),
  ]);

  // — WeatherAPI Astronomy —
  let astronomy: AstronomyData | null = null;
  if (astroRes.status === "fulfilled" && astroRes.value?.ok) {
    const data = await astroRes.value.json();
    const astro = data?.astronomy?.astro;
    if (astro) {
      astronomy = {
        moon_phase: astro.moon_phase,
        moon_illumination: Number(astro.moon_illumination),
        moonrise: astro.moonrise,
        moonset: astro.moonset,
      };
    }
  }

  // — WeatherAPI Alerts —
  let alerts: WeatherAPIAlert[] = [];
  if (alertRes.status === "fulfilled" && alertRes.value?.ok) {
    const data = await alertRes.value.json();
    const rawAlerts = Array.isArray(data?.alerts?.alert) ? data.alerts.alert : [];
    if (rawAlerts.length > 0) {
      alerts = rawAlerts.map((a: { headline: string; severity: string; event: string; desc: string; expires: string }) => ({
        headline: a.headline,
        severity: a.severity,
        event: a.event,
        desc: a.desc,
        expires: a.expires,
      }));
    }
  }

  // — METAR (nearest active weather station) —
  // Query the METAR endpoint directly by bounding box so we only consider stations
  // that are actively reporting. This avoids the prior two-step approach (airport
  // lookup → METAR fetch) which could select a distant airport when the nearest
  // airport's coordinates were wrong or missing in the /airport dataset.
  let metar: MetarData | null = null;
  let metarConnected = false;
  if (metarAirportRes.status === "fulfilled" && metarAirportRes.value.ok) {
    metarConnected = true;
    try {
      const stations = await metarAirportRes.value.json();
      type MetarStation = { icaoId: string; name?: string; lat?: unknown; lon?: unknown; temp?: unknown; wspd?: unknown; wdir?: unknown; visib?: unknown };
      const nearestStation = Array.isArray(stations)
        ? stations
          .filter((s: MetarStation) => {
            const sLat = toNumber(s?.lat);
            const sLon = toNumber(s?.lon);
            return typeof s?.icaoId === "string" && sLat != null && sLon != null;
          })
          .reduce((closest: MetarStation | null, station: MetarStation) => {
            if (!closest) return station;
            const stationLat = toNumber(station.lat);
            const stationLon = toNumber(station.lon);
            const closestLat = toNumber(closest.lat);
            const closestLon = toNumber(closest.lon);
            if (stationLat == null || stationLon == null || closestLat == null || closestLon == null) return closest;
            return haversineKm(lat, lon, stationLat, stationLon) < haversineKm(lat, lon, closestLat, closestLon)
              ? station
              : closest;
          }, null)
        : null;
      if (nearestStation) {
        const stationLat = toNumber(nearestStation.lat);
        const stationLon = toNumber(nearestStation.lon);
        const distanceKm = stationLat != null && stationLon != null
          ? haversineKm(lat, lon, stationLat, stationLon)
          : null;
        const temp = toNumber(nearestStation.temp);
        if (temp != null) {
          let history: MetarData["history"] = [];
          try {
            const historyRes = await fetch(
              `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(nearestStation.icaoId)}&format=json&hours=24`,
              { headers: { "User-Agent": USER_AGENT } }
            );

            if (historyRes.ok) {
              const historyData = await historyRes.json();
              history = Array.isArray(historyData)
                ? historyData
                  .map((entry: { reportTime?: unknown; temp?: unknown }) => {
                    const reportTime = typeof entry?.reportTime === "string" ? entry.reportTime : null;
                    const historicalTemp = toNumber(entry?.temp);
                    if (!reportTime || historicalTemp == null) return null;
                    return { reportTime, temp: historicalTemp };
                  })
                  .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
                  .sort((a, b) => Date.parse(a.reportTime) - Date.parse(b.reportTime))
                : [];
            }
          } catch { /* no history */ }

          metar = {
            icaoId: nearestStation.icaoId,
            name: nearestStation.name ?? nearestStation.icaoId,
            temp,
            wind_speed: toNumber(nearestStation.wspd) ?? 0,
            wind_dir: toNumber(nearestStation.wdir) ?? 0,
            visibility: toNumber(nearestStation.visib) ?? 10,
            lat: stationLat ?? undefined,
            lon: stationLon ?? undefined,
            distance_km: distanceKm ?? undefined,
            history,
          };
        }
      }
    } catch { /* inland / no station */ }
  }

  // — Pirate Weather minutely rain summary —
  let rainSummary: RainSummary | null = null;
  let pirateWeatherConnected = false;
  if (pwRes.status === "fulfilled" && pwRes.value?.ok) {
    try {
      const pwData = await pwRes.value.json();
      pirateWeatherConnected = true;
      const summary: string = pwData?.minutely?.summary ?? "";
      const rawMinutely = Array.isArray(pwData?.minutely?.data) ? pwData.minutely.data.slice(0, 60) : [];
      const timeline = Array.from({ length: Math.ceil(rawMinutely.length / 5) }, (_, bucketIndex) => {
        const bucket = rawMinutely.slice(bucketIndex * 5, (bucketIndex + 1) * 5);
        const precipProbability = bucket.reduce((max: number, entry: { precipProbability?: unknown }) => {
          const value = toNumber(entry?.precipProbability);
          return value != null ? Math.max(max, clamp01(value)) : max;
        }, 0);
        const precipIntensity = bucket.reduce((max: number, entry: { precipIntensity?: unknown }) => {
          const value = toNumber(entry?.precipIntensity);
          return value != null ? Math.max(max, Math.max(0, value)) : max;
        }, 0);

        return {
          offset_minutes: bucketIndex * 5,
          precip_probability: precipProbability,
          precip_intensity: precipIntensity,
        };
      }).filter((point) => Number.isFinite(point.precip_probability) && Number.isFinite(point.precip_intensity));

      if (summary || timeline.length > 0) {
        const hasTimelineRain = timeline.some((point) => point.precip_probability >= 0.2 || point.precip_intensity > 0);
        const isRaining = ( /rain|drizzle|snow|sleet|shower/i.test(summary) &&
          !/clear|no rain/i.test(summary)) || hasTimelineRain;
        rainSummary = {
          summary: summary || "No precipitation expected in the next hour.",
          isRaining,
          timeline,
        };
      }
    } catch { /* no minutely */ }
  }

  // — NOAA/NWS alerts (US only) —
  let nwsAlerts: NWSAlert[] = [];
  let nwsConnected = false;
  if (nwsRes.status === "fulfilled" && nwsRes.value?.ok) {
    nwsConnected = true;
    try {
      const data = await nwsRes.value.json();
      const features = Array.isArray(data?.features) ? data.features : [];
      nwsAlerts = features
        .map((f: { properties?: { event?: string; headline?: string; severity?: string; description?: string; expires?: string } }) => {
          const p = f?.properties ?? {};
          return {
            event: p.event ?? "Weather Alert",
            headline: p.headline ?? p.event ?? "Official alert from NOAA/NWS",
            severity: p.severity ?? "Unknown",
            description: p.description ?? "",
            expires: p.expires ?? "",
          };
        })
        .filter((a: NWSAlert) => a.headline.length > 0);
    } catch {
      nwsAlerts = [];
    }
  }

  return Response.json({ astronomy, alerts, metar, metarConnected, rainSummary, pirateWeatherConnected, nwsAlerts, nwsConnected });
}
