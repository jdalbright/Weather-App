import { useState, type ReactNode } from "react";
import {
    getWeatherIconFromCode,
    getWeatherDescriptionFromCode,
    isLiquidPrecipitationCode,
    WeatherData,
    formatVisibility,
    formatWindSpeed,
    getLocalTimeForOffset,
    parseLocationDate,
    parseLocationDateTime,
    getAQILevel,
    waveDirectionToCardinal,
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
import { format } from "date-fns";
import CollapsiblePanel from "@/components/CollapsiblePanel";
import { Next24HoursChart, type HourlyForecastPoint } from "@/components/Next24HoursChart";
import VoiceSettingsMenu from "@/components/VoiceSettingsMenu";
import {
    Thermometer,
    Wind,
    Droplets,
    Sun,
    Moon,
    SunDim,
    Cloud,
    CloudSun,
    CloudMoon,
    CloudSnow,
    CloudFog,
    CloudLightning,
    Eye,
    AlertTriangle,
    Waves,
    Leaf,
    History,
    Radio,
    CloudRain,
    TrendingUp,
    TrendingDown,
    Minus,
    Flame,
    FlaskConical,
    HandHeart,
    Heart,
    ChevronDown,
    Search as SearchIcon,
    ShieldAlert,
    Sparkles,
    Trees,
    Zap,
    X,
    type LucideIcon,
} from "lucide-react";
import { type Personality } from "@/lib/personalities";

const IconMap: Record<string, { icon: LucideIcon; className: string; strokeWidth?: number }> = {
    "sun": { icon: Sun, className: "text-sun-yellow" },
    "moon": { icon: Moon, className: "text-indigo-400" },
    "cloud-sun": { icon: CloudSun, className: "text-sun-orange" },
    "cloud-moon": { icon: CloudMoon, className: "text-indigo-400" },
    "cloud": { icon: Cloud, className: "text-cloud-gray" },
    "cloud-rain": { icon: CloudRain, className: "text-rain-blue" },
    "cloud-heavy-rain": { icon: CloudRain, className: "text-rain-dark", strokeWidth: 2.2 },
    "cloud-snow": { icon: CloudSnow, className: "text-sky-blue" },
    "cloud-fog": { icon: CloudFog, className: "text-cloud-gray" },
    "cloud-lightning": { icon: CloudLightning, className: "text-sun-orange" },
};

const PersonalityIconMap = {
    flame: Flame,
    minus: Minus,
    sparkles: Sparkles,
    moon: Moon,
    cloud: CloudSun,
    zap: Zap,
    heart: Heart,
    "hand-heart": HandHeart,
    search: SearchIcon,
    trees: Trees,
    "shield-alert": ShieldAlert,
    "flask-conical": FlaskConical,
} as const;

const sectionLabelClass = "theme-section-label ml-2 text-sm font-bold";
const statTileClass = "surface-tile flex items-center gap-3 rounded-2xl p-3";
const statValueClass = "theme-heading font-semibold";
const heroCardClass = "weather-card-hero surface-card-strong relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-8 sm:py-8";

const insightPillClass = "weather-card-insight-pill flex h-full w-full min-w-0 flex-col rounded-[24px] border border-soft-var bg-surface-chip-var px-3.5 py-3 text-left transition-all active:opacity-70 hover:-translate-y-0.5 hover-border-strong-var shadow-soft-var";
const insightPillOpenClass = "border-accent-var bg-surface-elevated-var shadow-soft-var";
const sectionAccordionButtonClass = "surface-tile flex min-h-[56px] w-full items-center justify-between gap-3 rounded-[24px] px-4 py-3 text-left transition-all hover-border-strong-var hover-bg-surface-elevated-var";
const MIN_FORECAST_CHANCE_TO_SHOW = 15;
type DetailSectionId = "forecast" | "conditions" | "extras";
type SourceSectionId = "hero" | "alerts" | "conditions" | "forecast" | "extras";
type ForecastDaypartKey = "overnight" | "morning" | "afternoon" | "evening";
type ForecastDaypartCard = {
    key: string;
    label: string;
    detail: string;
    temp: number;
    apparentTemp: number;
    pop: number;
    windSpeed: number;
    humidity: number;
    iconCode: number;
    isDay: number;
};
type ForecastSummarySolarEvent = {
    type: "sunrise" | "sunset";
    label: string;
};
type ForecastSummaryCondition =
    | "clear"
    | "partly-cloudy"
    | "cloudy"
    | "fog"
    | "light-precip"
    | "rain"
    | "snow"
    | "thunder";

function shouldShowForecastChance(probability: number | null | undefined): probability is number {
    return probability != null && probability >= MIN_FORECAST_CHANCE_TO_SHOW;
}

function formatCurrentPrecipChance(probability: number): string {
    if (probability < MIN_FORECAST_CHANCE_TO_SHOW) return "Low";
    return `${probability}%`;
}

function getForecastDaypartKey(date: Date): ForecastDaypartKey {
    const hour = date.getHours();
    if (hour >= 5 && hour < 11) return "morning";
    if (hour >= 11 && hour < 17) return "afternoon";
    if (hour >= 17) return "evening";
    return "overnight";
}

function getForecastDaypartTitle(daypart: ForecastDaypartKey): string {
    switch (daypart) {
        case "morning":
            return "Morning";
        case "afternoon":
            return "Afternoon";
        case "evening":
            return "Evening";
        default:
            return "Overnight";
    }
}

function getForecastDaypartLabel(date: Date, now: Date, daypart: ForecastDaypartKey): { label: string; detail: string } {
    const todayKey = format(now, "yyyy-MM-dd");
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = format(tomorrow, "yyyy-MM-dd");
    const dateKey = format(date, "yyyy-MM-dd");
    const title = getForecastDaypartTitle(daypart);

    if (dateKey === todayKey) {
        if (daypart === "evening") {
            return {
                label: "Tonight",
                detail: "This evening",
            };
        }

        if (daypart === "overnight") {
            return {
                label: "Overnight",
                detail: "Early today",
            };
        }

        return {
            label: title,
            detail: "Today",
        };
    }

    if (dateKey === tomorrowKey) {
        if (daypart === "overnight") {
            return {
                label: "Overnight",
                detail: "Late tonight",
            };
        }

        return {
            label: title,
            detail: "Tomorrow",
        };
    }

    return {
        label: title,
        detail: format(date, "EEE"),
    };
}

function buildForecastDaypartCards(points: HourlyForecastPoint[], now: Date): ForecastDaypartCard[] {
    const buckets = new Map<string, HourlyForecastPoint[]>();

    points.forEach((point) => {
        const daypart = getForecastDaypartKey(point.time);
        const key = `${format(point.time, "yyyy-MM-dd")}-${daypart}`;
        const current = buckets.get(key) ?? [];
        current.push(point);
        buckets.set(key, current);
    });

    return Array.from(buckets.entries()).slice(0, 4).map(([key, bucket]) => {
        const temps = bucket.map(({ temp }) => temp);
        const highestPopPoint = bucket.reduce((best, point) => (
            point.pop >= best.pop ? point : best
        ), bucket[0]);
        const labelData = getForecastDaypartLabel(
            bucket[0].time,
            now,
            getForecastDaypartKey(bucket[0].time),
        );

        return {
            key,
            label: labelData.label,
            detail: labelData.detail,
            temp: Math.round(temps.reduce((sum, value) => sum + value, 0) / temps.length),
            apparentTemp: Math.round(bucket.reduce((sum, point) => sum + point.apparentTemp, 0) / bucket.length),
            pop: Math.round(Math.max(...bucket.map(({ pop }) => pop))),
            windSpeed: Math.max(...bucket.map(({ windSpeed }) => windSpeed)),
            humidity: Math.round(bucket.reduce((sum, point) => sum + point.humidity, 0) / bucket.length),
            iconCode: highestPopPoint.iconCode,
            isDay: highestPopPoint.isDay,
        };
    });
}

function buildNext24HourSummary(args: {
    dayparts: ForecastDaypartCard[];
    high: number;
    low: number;
    peakPop: number;
    peakTimeLabel: string | null;
    solarEvent: ForecastSummarySolarEvent | null;
}): string {
    const { dayparts, high, low, peakPop, peakTimeLabel, solarEvent } = args;
    const firstDaypart = dayparts[0] ?? null;
    const firstCondition = firstDaypart ? getSummaryConditionGroup(firstDaypart.iconCode) : null;
    const nextDifferentDaypart = firstCondition
        ? dayparts.slice(1).find((daypart) => getSummaryConditionGroup(daypart.iconCode) !== firstCondition) ?? null
        : null;

    const timingSentence = getNext24TimingSummary(firstDaypart, nextDifferentDaypart);
    const temperatureSentence = `Temperatures range from ${low}° to ${high}°.`;
    const solarSentence = solarEvent
        ? `${solarEvent.type === "sunset" ? "Sunset" : "Sunrise"} is at ${solarEvent.label}.`
        : null;

    if (peakPop >= 60 && peakTimeLabel) {
        return `${timingSentence} The strongest precipitation signal arrives near ${peakTimeLabel}. ${temperatureSentence}`;
    }

    if (peakPop >= 30) {
        return `${timingSentence} A passing precipitation chance shows up later. ${temperatureSentence}`;
    }

    return [timingSentence, temperatureSentence, solarSentence].filter(Boolean).join(" ");
}

function getSummaryConditionGroup(code: number): ForecastSummaryCondition {
    if (code >= 95) return "thunder";
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snow";
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
    if (code >= 51 && code <= 57) return "light-precip";
    if (code === 45 || code === 48) return "fog";
    if (code === 3) return "cloudy";
    if (code === 2) return "partly-cloudy";
    return "clear";
}

function getSummaryConditionLabel(condition: ForecastSummaryCondition): string {
    switch (condition) {
        case "partly-cloudy":
            return "partly cloudy skies";
        case "cloudy":
            return "overcast skies";
        case "fog":
            return "fog";
        case "light-precip":
            return "light precipitation chances";
        case "rain":
            return "rain chances";
        case "snow":
            return "snow chances";
        case "thunder":
            return "thunderstorm chances";
        default:
            return "clear skies";
    }
}

function getDaypartSummaryTiming(daypart: ForecastDaypartCard): string {
    if (daypart.detail === "This evening") return "this evening";
    if (daypart.detail === "Late tonight") return "late tonight";
    if (daypart.detail === "Today") return `today ${daypart.label.toLowerCase()}`;
    if (daypart.detail === "Tomorrow") return `tomorrow ${daypart.label.toLowerCase()}`;
    return daypart.detail.toLowerCase();
}

function capitalizeSentence(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function getNext24TimingSummary(
    firstDaypart: ForecastDaypartCard | null,
    nextDifferentDaypart: ForecastDaypartCard | null,
): string {
    if (!firstDaypart) {
        return "Conditions stay fairly steady through the next 24 hours.";
    }

    const firstLabel = getSummaryConditionLabel(getSummaryConditionGroup(firstDaypart.iconCode));
    const firstTiming = getDaypartSummaryTiming(firstDaypart);

    if (!nextDifferentDaypart) {
        return `${capitalizeSentence(firstLabel)} hold through the next 24 hours.`;
    }

    const nextLabel = getSummaryConditionLabel(getSummaryConditionGroup(nextDifferentDaypart.iconCode));
    const nextTiming = getDaypartSummaryTiming(nextDifferentDaypart);

    return `${capitalizeSentence(firstLabel)} ${firstTiming}, then shift to ${nextLabel} by ${nextTiming}.`;
}

function getNext24HourSolarEvent(
    sunriseValues: string[] | undefined,
    sunsetValues: string[] | undefined,
    windowStart: Date,
    windowEnd: Date,
): ForecastSummarySolarEvent | null {
    const events: Array<{ type: "sunrise" | "sunset"; time: Date }> = [];

    sunriseValues?.forEach((value) => {
        const time = parseLocationDateTime(value);
        if (time >= windowStart && time <= windowEnd) {
            events.push({ type: "sunrise", time });
        }
    });

    sunsetValues?.forEach((value) => {
        const time = parseLocationDateTime(value);
        if (time >= windowStart && time <= windowEnd) {
            events.push({ type: "sunset", time });
        }
    });

    events.sort((a, b) => a.time.getTime() - b.time.getTime());

    if (events.length === 0) return null;

    return {
        type: events[0].type,
        label: format(events[0].time, "h:mm a"),
    };
}

function AggregatedMetricBadge({ title = "Aggregated from multiple forecast models." }: { title?: string }) {
    return (
        <span
            title={title}
            aria-label={title}
            className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[color:var(--text-muted)] opacity-70"
        >
            <Sparkles size={10} strokeWidth={2.2} />
        </span>
    );
}

function MetricLabel({
    children,
    aggregated = false,
    aggregatedTitle,
}: {
    children: ReactNode;
    aggregated?: boolean;
    aggregatedTitle?: string;
}) {
    if (!aggregated) {
        return <span className="min-w-0 whitespace-normal">{children}</span>;
    }

    return (
        <span className="inline-flex min-w-0 items-center gap-1.5 align-top">
            <span className="min-w-0 truncate">{children}</span>
            <AggregatedMetricBadge title={aggregatedTitle} />
        </span>
    );
}

type WeatherCardProps = {
    locationName: string,
    weatherData: WeatherData | null,
    isDetailed: boolean,
    onToggleDetail: () => void,
    aiHeroSummary: string,
    aiNext24Summary: string,
    aiAdvice: string,
    allPersonalities: Personality[],
    personalityId: string,
    selectedPersonality: Personality,
    customPersonalitiesCount: number,
    customIdea: string,
    customPersonalityError: string | null,
    isGeneratingCustomPersonality: boolean,
    onCustomIdeaChange: (value: string) => void,
    onPersonalityChange: (id: string) => void,
    onDeleteCustomPersonality: (id: string) => void,
    onGenerateCustomPersonality: () => void | Promise<void>,
    onDismissAlert: (source: "weatherapi" | "nws", alert: { event: string; headline: string; severity: string; expires: string }) => void,
    distUnit?: "kmh" | "mph",
    airQuality?: AirQualityData | null,
    marine?: MarineData | null,
    flood?: FloodData | null,
    historical?: HistoricalData | null,
    astronomy?: AstronomyData | null,
    weatherAlerts?: WeatherAPIAlert[],
    nwsAlerts?: NWSAlert[],
    forecastConfidence?: ForecastConfidence | null,
    climateNormal?: ClimateNormal | null,
    metar?: MetarData | null,
    metarConnected?: boolean,
    rainSummary?: RainSummary | null,
    pirateWeatherConnected?: boolean,
    nwsConnected?: boolean,
};

export default function WeatherCard({
    locationName,
    weatherData,
    isDetailed,
    onToggleDetail,
    aiHeroSummary,
    aiNext24Summary,
    aiAdvice,
    allPersonalities,
    personalityId,
    selectedPersonality,
    customPersonalitiesCount,
    customIdea,
    customPersonalityError,
    isGeneratingCustomPersonality,
    onCustomIdeaChange,
    onPersonalityChange,
    onDeleteCustomPersonality,
    onGenerateCustomPersonality,
    onDismissAlert,
    distUnit = "mph",
    airQuality,
    marine,
    flood,
    historical,
    astronomy,
    weatherAlerts,
    nwsAlerts,
    forecastConfidence,
    climateNormal,
    metar,
    rainSummary,
    pirateWeatherConnected,
}: WeatherCardProps) {
    const [showConfidenceDetail, setShowConfidenceDetail] = useState(false);
    const [showStationDetail, setShowStationDetail] = useState(false);
    const [showMinutelyDetail, setShowMinutelyDetail] = useState(false);
    const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
    const [expandedAlertKey, setExpandedAlertKey] = useState<string | null>(null);
    const [openDetailSections, setOpenDetailSections] = useState<Record<DetailSectionId, boolean>>({
        forecast: false,
        conditions: true,
        extras: false,
    });
    const [showDataSources, setShowDataSources] = useState(false);

    if (!weatherData || !weatherData.current) return null;

    const current = weatherData.current;
    const currentTemp = Math.round(current.temperature_2m);
    const feelsLike = Math.round(current.apparent_temperature);
    const iconName = getWeatherIconFromCode(current.weather_code, current.is_day);
    const iconConfig = IconMap[iconName] || IconMap["cloud"];
    const IconComponent = iconConfig.icon;
    const isNightIcon = iconName === "moon" || iconName === "cloud-moon";
    const iconBadgeClass = isNightIcon
        ? "shadow-[0_16px_36px_rgba(15,23,42,0.28)] ring-1 ring-white/20"
        : "shadow-[0_10px_22px_rgba(148,163,184,0.25)] ring-1 ring-white/70";
    const iconBadgeStyle = isNightIcon
        ? { background: "radial-gradient(circle at top, rgba(255,255,255,0.18), rgba(255,255,255,0.02) 40%), linear-gradient(160deg, #0f172a, #1e3a5f 55%, #312e81)" }
        : { background: "radial-gradient(circle at top, #ffffff, #f8fafc 55%, #e2e8f0)" };
    const iconSize = isNightIcon ? 88 : 84;
    const PersonalityIcon = PersonalityIconMap[selectedPersonality.icon];

    const dailyHigh = Math.round(weatherData.daily.temperature_2m_max[0]);
    const dailyLow = Math.round(weatherData.daily.temperature_2m_min[0]);
    const currentCondition = getWeatherDescriptionFromCode(current.weather_code, current.is_day);
    const localTimestamp = getLocalTimeForOffset(weatherData.utc_offset_seconds);
    const localTimeLabel = format(localTimestamp, "h:mm a");
    const heroSummary = aiHeroSummary.trim();
    const resolvedAdvice = (aiAdvice || "Looking out the window...").trim();
    const handleVoiceSelection = (nextPersonalityId: string) => {
        onPersonalityChange(nextPersonalityId);
        setIsVoiceMenuOpen(false);
    };

    // Alerts (deduplicated by source + headline + expiry)
    const allAlerts = [
        ...(weatherAlerts ?? []).map((alert) => ({
            source: "weatherapi" as const,
            key: ["weatherapi", alert.event, alert.headline, alert.expires].join("|"),
            event: alert.event,
            headline: alert.headline,
            severity: alert.severity,
            expires: alert.expires,
            details: alert.desc,
        })),
        ...(nwsAlerts ?? []).map((alert) => ({
            source: "nws" as const,
            key: ["nws", alert.event, alert.headline, alert.expires].join("|"),
            event: alert.event,
            headline: alert.headline,
            severity: alert.severity,
            expires: alert.expires,
            details: alert.description,
        })),
    ].filter((alert, index, alerts) => alerts.findIndex((candidate) => candidate.key === alert.key) === index);

    // AQI
    const aqiValue = airQuality?.current?.us_aqi ?? null;
    const aqiLevel = aqiValue !== null ? getAQILevel(aqiValue) : null;

    // Pollen (first hourly slot)
    const grassPollen = airQuality?.hourly?.grass_pollen?.[0] ?? null;
    const birchPollen = airQuality?.hourly?.birch_pollen?.[0] ?? null;
    const alderPollen = airQuality?.hourly?.alder_pollen?.[0] ?? null;
    const hasPollenData = grassPollen !== null || birchPollen !== null || alderPollen !== null;

    // Historical
    const histHigh = historical?.daily?.temperature_2m_max?.[0] != null
        ? Math.round(historical.daily.temperature_2m_max[0]) : null;
    const histLow = historical?.daily?.temperature_2m_min?.[0] != null
        ? Math.round(historical.daily.temperature_2m_min[0]) : null;

    const riverDischarge = flood?.daily?.river_discharge?.[0] ?? null;
    const riverDischargeMin = flood?.daily?.river_discharge_min?.[0] ?? null;
    const riverDischargeMean = flood?.daily?.river_discharge_mean?.[0] ?? null;
    const riverDischargeMax = flood?.daily?.river_discharge_max?.[0] ?? null;

    // Forecast confidence styling
    const confidenceStyle = {
        High: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50", label: "Models agree" },
        Moderate: { dot: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50", label: "Some uncertainty" },
        Uncertain: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", label: "Models disagree" },
    };
    const conf = forecastConfidence ? confidenceStyle[forecastConfidence.label] : null;
    const confidenceDotClass = conf?.dot ?? "bg-[color:var(--border-contrast)]";
    const confidenceAggregatedTemp = forecastConfidence?.aggregatedTemp ?? currentTemp;
    const displayTemp = currentTemp;
    const confidenceModelNames = forecastConfidence?.modelNames ?? [];
    const confidenceModelTemps = forecastConfidence?.modelTemps ?? [];
    const confidenceSummaryLabel = forecastConfidence?.label === "High"
        ? "Tight spread"
        : forecastConfidence?.label === "Moderate"
            ? "Some spread"
            : forecastConfidence?.label === "Uncertain"
                ? "Wide spread"
                : null;

    // METAR: convert Celsius to display unit
    const metarTempDisplay = metar != null
        ? (distUnit === "mph"
            ? Math.round(metar.temp * 9 / 5 + 32)
            : Math.round(metar.temp))
        : null;
    const metarTempDiff = metarTempDisplay != null ? metarTempDisplay - displayTemp : null;
    const showStationTempDelta = metarTempDiff != null && Math.abs(metarTempDiff) >= 1;
    const stationDistanceDisplay = metar?.distance_km != null
        ? distUnit === "mph"
            ? `${(metar.distance_km * 0.621371).toFixed(1)} mi away`
            : `${metar.distance_km.toFixed(1)} km away`
        : null;
    const stationName = metar?.name ?? "Nearest station";
    const stationIcaoId = metar?.icaoId ?? "----";
    const stationWind = metar ? `${waveDirectionToCardinal(metar.wind_dir)} ${metar.wind_speed} kt` : "No recent report";
    const stationVisibility = metar ? `${metar.visibility} mi` : "N/A";

    // Pirate Weather returns useful "no precipitation" summaries too.
    const minutelyTimeline = rainSummary?.timeline ?? [];
    const showMinutelyBanner = Boolean(rainSummary?.summary || minutelyTimeline.length > 0);
    const minutelyBannerClass = rainSummary?.isRaining
        ? "bg-blue-50/80 border-blue-200 text-blue-800"
        : "surface-tile text-secondary-var";
    const minutelyIconClass = rainSummary?.isRaining ? "text-blue-500" : "text-muted-var";
    const minutelyBadgeClass = rainSummary?.isRaining
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "surface-chip";
    const minutelyPillToneClass = rainSummary?.isRaining
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-soft-var bg-surface-chip-var text-secondary-var";
    const minutelyStatusLabel = rainSummary?.isRaining ? "Rain signal" : "No rain signal";

    const minutelySummaryText = rainSummary?.summary ?? "No precipitation expected in the next hour.";
    const minutelyGuidanceText = rainSummary?.isRaining
        ? "Watch the darker bars for strongest precip"
        : "Flat bars mean no meaningful precip signal";
    const maxMinutelyIntensity = minutelyTimeline.reduce((max, point) => Math.max(max, point.precip_intensity), 0);
    const peakMinutelyChance = Math.round(Math.max(...minutelyTimeline.map((point) => point.precip_probability), 0) * 100);

    const currentPrecipChanceLabel = formatCurrentPrecipChance(current.precipitation_probability);
    const hasConfidencePill = Boolean(conf && forecastConfidence);
    const hasStationPill = metarTempDisplay != null;
    const hasMinutelyPill = Boolean(showMinutelyBanner && rainSummary);
    const stationNeedsAttention = showStationTempDelta && metarTempDiff != null && Math.abs(metarTempDiff) >= 3;


    const sourceEntries = [
        {
            name: "Open-Meteo",
            role: "Current conditions · Hourly & 16-day forecast · UV index",
            active: true,
            sections: ["hero", "conditions", "forecast"] as SourceSectionId[],
        },
        {
            name: forecastConfidence
                ? `Forecast Models (${forecastConfidence.modelNames.join(", ")})`
                : "Forecast Models",
            role: "Multi-model spread · Confidence score · Aggregated temperature",
            active: !!forecastConfidence,
            sections: ["hero", "forecast"] as SourceSectionId[],
        },
        {
            name: "Open-Meteo Air Quality",
            role: "US AQI · EU AQI · PM2.5 · PM10 · Ozone · NO₂ · CO · Pollen counts",
            active: aqiValue !== null || hasPollenData,
            sections: ["conditions"] as SourceSectionId[],
        },
        {
            name: "Open-Meteo Marine",
            role: "Wave height · Direction · Period (coastal only)",
            active: !!marine,
            sections: ["extras"] as SourceSectionId[],
        },
        {
            name: "Open-Meteo Flood",
            role: "River discharge · low / mean / high flow bands",
            active: riverDischarge !== null,
            sections: ["extras"] as SourceSectionId[],
        },
        {
            name: "Open-Meteo Archive",
            role: "Historical comparison · 3-year climate normals",
            active: !!historical || !!climateNormal,
            sections: ["extras"] as SourceSectionId[],
        },
        {
            name: "WeatherAPI Astronomy",
            role: "Moon phase · Moonrise/set · Illumination",
            active: !!astronomy,
            sections: ["extras"] as SourceSectionId[],
        },
        {
            name: "WeatherAPI Alerts",
            role: "Supplemental severe weather alerts",
            active: (weatherAlerts?.length ?? 0) > 0,
            sections: ["alerts"] as SourceSectionId[],
        },
        {
            name: "Pirate Weather",
            role: rainSummary ? `Next-hour precipitation trend · ${rainSummary.summary}` : "Next-hour precipitation trend in 5-minute steps",
            active: !!pirateWeatherConnected && showMinutelyBanner,
            sections: ["hero"] as SourceSectionId[],
        },
        {
            name: metar ? `Aviation Weather · ${metar.name}` : "Aviation Weather (METAR)",
            role: "Actual observed temp · Wind · Visibility at nearest airport",
            active: !!metar,
            sections: ["hero", "conditions"] as SourceSectionId[],
        },
        {
            name: "NOAA / NWS",
            role: `Official US weather alerts${(nwsAlerts?.length ?? 0) > 0 ? ` · ${nwsAlerts?.length ?? 0} active` : ""}`,
            active: (nwsAlerts?.length ?? 0) > 0,
            sections: ["alerts"] as SourceSectionId[],
        },
    ] as const;

    const visibleSourceSections = new Set<SourceSectionId>(["hero"]);

    if (allAlerts.length > 0) {
        visibleSourceSections.add("alerts");
    }
    if (isDetailed && openDetailSections.conditions) {
        visibleSourceSections.add("conditions");
    }
    if (isDetailed && openDetailSections.forecast) {
        visibleSourceSections.add("forecast");
    }
    if (isDetailed && openDetailSections.extras) {
        visibleSourceSections.add("extras");
    }

    const activeSourceEntries = sourceEntries.filter(({ active, sections }) => (
        active && sections.some((section) => visibleSourceSections.has(section))
    ));
    const visibleSourceSummary = activeSourceEntries.slice(0, 3);
    const locationSegments = locationName.split(",").map((segment) => segment.trim()).filter(Boolean);
    const primaryLocationName = locationSegments[0] || locationName || "Current Location";
    const secondaryLocationName = locationSegments.length > 1 ? locationSegments.slice(1, 3).join(" · ") : null;
    const nowMinusOneHour = new Date(localTimestamp.getTime() - 3600000);
    const twentyFourHoursAhead = new Date(localTimestamp.getTime() + 24 * 3600000);
    const upcomingHourlyPoints = weatherData.hourly.time.slice(0, 48).flatMap((timeString: string, index: number) => {
        const hourDate = parseLocationDateTime(timeString);
        if (hourDate < nowMinusOneHour || hourDate > twentyFourHoursAhead) {
            return [];
        }

        return [{
            time: hourDate,
            temp: Math.round(weatherData.hourly.temperature_2m[index]),
            apparentTemp: Math.round(weatherData.hourly.apparent_temperature[index]),
            iconCode: weatherData.hourly.weather_code[index],
            isDay: weatherData.hourly.is_day[index],
            pop: weatherData.hourly.precipitation_probability?.[index] ?? 0,
            windSpeed: weatherData.hourly.wind_speed_10m?.[index] ?? current.wind_speed_10m,
            humidity: weatherData.hourly.relative_humidity_2m?.[index] ?? current.relative_humidity_2m,
        }];
    });

    const next24HourlyPoints = upcomingHourlyPoints.filter((point) => point.time >= localTimestamp);
    const nextDaypartCards = buildForecastDaypartCards(
        next24HourlyPoints,
        localTimestamp,
    );
    const next24Temps = next24HourlyPoints.map(({ temp }) => temp);
    const next24High = next24Temps.length > 0 ? Math.max(...next24Temps) : dailyHigh;
    const next24Low = next24Temps.length > 0 ? Math.min(...next24Temps) : dailyLow;
    const peakPrecipPoint = next24HourlyPoints
        .reduce<HourlyForecastPoint | null>((best, point) => {
            if (!best || point.pop >= best.pop) {
                return point;
            }
            return best;
        }, null);
    const peakPrecipChance = peakPrecipPoint?.pop ?? current.precipitation_probability;
    const next24SolarEvent = getNext24HourSolarEvent(
        weatherData.daily.sunrise?.slice(0, 3),
        weatherData.daily.sunset?.slice(0, 3),
        localTimestamp,
        twentyFourHoursAhead,
    );
    const next24Summary = buildNext24HourSummary({
        dayparts: nextDaypartCards,
        high: next24High,
        low: next24Low,
        peakPop: peakPrecipChance,
        peakTimeLabel: peakPrecipPoint ? format(peakPrecipPoint.time, "h a") : null,
        solarEvent: next24SolarEvent,
    });
    const next24SectionSummary = aiNext24Summary.trim()
        ? aiNext24Summary.trim()
        : next24Summary;
    const tenDayForecast = weatherData.daily.time.slice(0, 10).map((timeString: string, index: number) => {
        const dayDate = parseLocationDate(timeString);
        const dayCode = weatherData.daily.weather_code[index];
        const dayHigh = Math.round(weatherData.daily.temperature_2m_max[index]);
        const dayLow = Math.round(weatherData.daily.temperature_2m_min[index]);
        const dayPrecipProbability = weatherData.daily.precipitation_probability_max?.[index] ?? 0;
        const dayRainTotal = (weatherData.daily.rain_sum?.[index] ?? 0) + (weatherData.daily.showers_sum?.[index] ?? 0);
        const daySnowfallTotal = weatherData.daily.snowfall_sum?.[index] ?? 0;
        const showRainChance = shouldShowForecastChance(dayPrecipProbability)
            && dayRainTotal > 0
            && daySnowfallTotal === 0
            && isLiquidPrecipitationCode(dayCode);

        return {
            key: timeString,
            label: index === 0 ? "Today" : format(dayDate, "EEE"),
            subLabel: index === 0 ? format(dayDate, "MMM d") : format(dayDate, "MMM d"),
            dayCode,
            dayHigh,
            dayLow,
            dayPrecipProbability,
            showRainChance,
        };
    });
    const tenDayMin = Math.min(...tenDayForecast.map(({ dayLow }) => dayLow));
    const tenDayMax = Math.max(...tenDayForecast.map(({ dayHigh }) => dayHigh));
    const tenDaySpread = Math.max(tenDayMax - tenDayMin, 1);
    const toggleDetailSection = (section: DetailSectionId) => {
        setOpenDetailSections((current) => ({
            ...current,
            [section]: !current[section],
        }));
    };

    const detailedContent = (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
                <button
                    type="button"
                    onClick={() => toggleDetailSection("conditions")}
                    className={sectionAccordionButtonClass}
                >
                    <div className="min-w-0">
                        <p className="theme-heading text-sm font-bold">Right Now</p>
                        <p className="theme-muted text-xs">Core stats, air quality, pollen, and station readings.</p>
                    </div>
                    <ChevronDown className={`theme-subtle h-5 w-5 shrink-0 transition-transform ${openDetailSections.conditions ? "rotate-180" : ""}`} />
                </button>
                <CollapsiblePanel open={openDetailSections.conditions} className="w-full">
                    <div className="flex flex-col gap-6 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className={statTileClass}>
                                <Thermometer className="text-orange-500" size={20} />
                                <div className="flex flex-col">
                                    <span className="theme-section-label text-xs font-bold">
                                        <MetricLabel aggregated>Feels Like</MetricLabel>
                                    </span>
                                    <span className={statValueClass}>{feelsLike}&deg;</span>
                                </div>
                            </div>
                            <div className={statTileClass}>
                                <Wind className="text-blue-400" size={20} />
                                <div className="flex flex-col">
                                    <span className="theme-section-label text-xs font-bold">
                                        <MetricLabel aggregated>Wind</MetricLabel>
                                    </span>
                                    <span className={statValueClass}>
                                        {formatWindSpeed(current.wind_speed_10m, weatherData.current_units.wind_speed_10m)}
                                    </span>
                                </div>
                            </div>
                            <div className={statTileClass}>
                                <Droplets className="text-blue-500" size={20} />
                                <div className="flex flex-col">
                                    <span className="theme-section-label text-xs font-bold">
                                        <MetricLabel aggregated>Precip Chance</MetricLabel>
                                    </span>
                                    <span className={statValueClass}>{currentPrecipChanceLabel}</span>
                                </div>
                            </div>
                            <div className={statTileClass}>
                                <Droplets className="text-cyan-500" size={20} />
                                <div className="flex flex-col">
                                    <span className="theme-section-label text-xs font-bold">
                                        <MetricLabel aggregated>Humidity</MetricLabel>
                                    </span>
                                    <span className={statValueClass}>{current.relative_humidity_2m}%</span>
                                </div>
                            </div>
                            <div className={statTileClass}>
                                <SunDim className="text-yellow-500" size={20} />
                                <div className="flex flex-col">
                                    <span className="theme-section-label text-xs font-bold">UV Index</span>
                                    <span className={statValueClass}>{weatherData.daily.uv_index_max[0]}</span>
                                </div>
                            </div>
                            <div className={statTileClass}>
                                <Cloud className="text-[var(--text-muted)]" size={20} />
                                <div className="flex flex-col">
                                    <span className="theme-section-label text-xs font-bold">
                                        <MetricLabel aggregated>Cloud Cover</MetricLabel>
                                    </span>
                                    <span className={statValueClass}>{current.cloud_cover}%</span>
                                </div>
                            </div>
                            <div className={statTileClass}>
                                <Eye className="text-indigo-400" size={20} />
                                <div className="flex flex-col">
                                    <span className="theme-section-label text-xs font-bold">
                                        <MetricLabel aggregated>Visibility</MetricLabel>
                                    </span>
                                    <span className={statValueClass}>
                                        {formatVisibility(current.visibility, distUnit, weatherData.current_units.visibility)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {aqiValue !== null && aqiLevel && (
                            <div className="flex flex-col gap-2">
                                <span className={sectionLabelClass}>Air Quality</span>
                                <div className="surface-tile rounded-2xl p-4 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold">{aqiValue}</span>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${aqiLevel.bg} ${aqiLevel.color}`}>
                                                {aqiLevel.label}
                                            </span>
                                        </div>
                                        <span className="theme-muted text-xs font-medium">US AQI</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
                                        <div className="surface-tile-strong rounded-xl p-2">
                                            <p className="theme-section-label text-[10px] font-bold">US AQI</p>
                                            <p className="font-semibold text-sm">{aqiValue}</p>
                                        </div>
                                        <div className="surface-tile-strong rounded-xl p-2">
                                            <p className="theme-section-label text-[10px] font-bold">EU AQI</p>
                                            <p className="font-semibold text-sm">{airQuality?.current?.european_aqi?.toFixed(0) ?? "—"}</p>
                                        </div>
                                        <div className="surface-tile-strong rounded-xl p-2">
                                            <p className="theme-section-label text-[10px] font-bold">PM2.5</p>
                                            <p className="font-semibold text-sm">{airQuality?.current?.pm2_5?.toFixed(1) ?? "—"}</p>
                                        </div>
                                        <div className="surface-tile-strong rounded-xl p-2">
                                            <p className="theme-section-label text-[10px] font-bold">PM10</p>
                                            <p className="font-semibold text-sm">{airQuality?.current?.pm10?.toFixed(1) ?? "—"}</p>
                                        </div>
                                        <div className="surface-tile-strong rounded-xl p-2">
                                            <p className="theme-section-label text-[10px] font-bold">Ozone</p>
                                            <p className="font-semibold text-sm">{airQuality?.current?.ozone?.toFixed(0) ?? "—"}</p>
                                        </div>
                                        <div className="surface-tile-strong rounded-xl p-2">
                                            <p className="theme-section-label text-[10px] font-bold">NO2</p>
                                            <p className="font-semibold text-sm">{airQuality?.current?.nitrogen_dioxide?.toFixed(1) ?? "—"}</p>
                                        </div>
                                        <div className="surface-tile-strong rounded-xl p-2">
                                            <p className="theme-section-label text-[10px] font-bold">CO</p>
                                            <p className="font-semibold text-sm">{airQuality?.current?.carbon_monoxide?.toFixed(0) ?? "—"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {hasPollenData && (
                            <div className="flex flex-col gap-2">
                                <span className={sectionLabelClass}>Pollen</span>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {grassPollen !== null && (
                                        <div className="surface-tile rounded-2xl p-3 flex flex-col items-center gap-1">
                                            <Leaf className="text-green-500" size={18} />
                                            <span className="theme-section-label text-[10px] font-bold">Grass</span>
                                            <span className="font-semibold text-sm">{grassPollen.toFixed(0)}</span>
                                        </div>
                                    )}
                                    {birchPollen !== null && (
                                        <div className="surface-tile rounded-2xl p-3 flex flex-col items-center gap-1">
                                            <Leaf className="text-lime-600" size={18} />
                                            <span className="theme-section-label text-[10px] font-bold">Birch</span>
                                            <span className="font-semibold text-sm">{birchPollen.toFixed(0)}</span>
                                        </div>
                                    )}
                                    {alderPollen !== null && (
                                        <div className="surface-tile rounded-2xl p-3 flex flex-col items-center gap-1">
                                            <Leaf className="text-emerald-600" size={18} />
                                            <span className="theme-section-label text-[10px] font-bold">Alder</span>
                                            <span className="font-semibold text-sm">{alderPollen.toFixed(0)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {metar && metarTempDisplay != null && (
                            <div className="flex flex-col gap-2">
                                <span className={sectionLabelClass}>Actual Observed</span>
                                <div className="surface-tile rounded-2xl p-4 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Radio className="text-indigo-500" size={18} />
                                            <div>
                                                <p className="theme-heading font-bold text-sm">{metar.name || metar.icaoId}</p>
                                                <p className="theme-muted text-xs">Nearest weather station</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold">{metarTempDisplay}&deg;</p>
                                            {metarTempDiff != null && Math.abs(metarTempDiff) >= 1 && (
                                                <div className="flex items-center gap-1 justify-end">
                                                    {metarTempDiff > 0
                                                        ? <TrendingUp size={12} className="text-orange-500" />
                                                        : metarTempDiff < 0
                                                            ? <TrendingDown size={12} className="text-blue-500" />
                                                            : <Minus size={12} className="text-[var(--text-muted)]" />
                                                    }
                                                    <span className={`text-xs font-bold ${metarTempDiff > 0 ? "text-orange-500" : "text-blue-500"}`}>
                                                        {metarTempDiff > 0 ? "+" : ""}{metarTempDiff}° vs forecast
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-center">
                                        <div className="surface-tile-strong rounded-xl p-2">
                                            <p className="theme-section-label text-[10px] font-bold">Wind</p>
                                            <p className="font-semibold text-sm">
                                                {waveDirectionToCardinal(metar.wind_dir)} {metar.wind_speed} kt
                                            </p>
                                        </div>
                                        <div className="surface-tile-strong rounded-xl p-2">
                                            <p className="theme-section-label text-[10px] font-bold">Visibility</p>
                                            <p className="font-semibold text-sm">{metar.visibility} mi</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsiblePanel>
            </div>

            <div className="flex flex-col gap-3">
                <button
                    type="button"
                    onClick={() => toggleDetailSection("forecast")}
                    className={sectionAccordionButtonClass}
                >
                    <div className="min-w-0">
                        <p className="theme-heading text-sm font-bold">Forecast Flow</p>
                        <p className="theme-muted text-xs">24-hour rhythm and a temperature-range outlook for the next 10 days.</p>
                    </div>
                    <ChevronDown className={`theme-subtle h-5 w-5 shrink-0 transition-transform ${openDetailSections.forecast ? "rotate-180" : ""}`} />
                </button>
                <CollapsiblePanel open={openDetailSections.forecast} className="w-full">
                    <div className="flex flex-col gap-6 pt-2">
                        <div className="surface-tile rounded-[28px] p-4 sm:p-5">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-start justify-between gap-6">
                                    <div className="min-w-0 flex-1">
                                        <span className={sectionLabelClass}>
                                            <MetricLabel aggregated={Boolean(forecastConfidence)}>Next 24 Hours</MetricLabel>
                                        </span>
                                        <p className="theme-heading mt-3 text-lg font-medium leading-[1.6] tracking-tight sm:text-xl">
                                            {next24SectionSummary}
                                        </p>
                                    </div>
                                    <div className="surface-chip shrink-0 rounded-[16px] px-3.5 py-2 text-right shadow-sm border border-[color:var(--border-soft)]">
                                        <p className="theme-section-label text-[10px] font-bold uppercase tracking-wider">
                                            <MetricLabel aggregated={Boolean(forecastConfidence)}>Swing</MetricLabel>
                                        </p>
                                        <p className="theme-heading mt-0.5 text-sm font-bold">{next24Low}&deg; to {next24High}&deg;</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {nextDaypartCards.map((daypart) => {
                                        const daypartIconName = getWeatherIconFromCode(daypart.iconCode, daypart.isDay);
                                        const daypartIconConfig = IconMap[daypartIconName] || IconMap.cloud;
                                        const DaypartIcon = daypartIconConfig.icon;

                                        return (
                                            <div key={daypart.key} className="surface-tile-strong rounded-[22px] px-3 py-2.5 sm:px-3.5 sm:py-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="pl-0.5">
                                                        <p className="theme-heading text-sm font-bold">{daypart.label}</p>
                                                        <p className="theme-muted text-xs">{daypart.detail}</p>
                                                    </div>
                                                    <div className="flex min-w-[34px] flex-col items-center justify-start gap-1">
                                                        <DaypartIcon
                                                            size={22}
                                                            strokeWidth={daypartIconConfig.strokeWidth ?? 1.9}
                                                            className={daypartIconConfig.className}
                                                        />
                                                        {shouldShowForecastChance(daypart.pop) ? (
                                                            <span className="rounded-full bg-sky-500/12 px-1.5 py-0.5 text-[9px] font-bold leading-none text-sky-400">
                                                                {daypart.pop}%
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="mt-2.5">
                                                    <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                                                        <p className="theme-heading text-[1.9rem] font-bold leading-none">{daypart.temp}&deg;</p>
                                                        <p className="theme-muted pb-0.5 text-[0.95rem] font-medium">
                                                            {getWeatherDescriptionFromCode(daypart.iconCode, daypart.isDay)}
                                                        </p>
                                                    </div>
                                                    <div className="theme-muted mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Thermometer size={12} className="theme-subtle" />
                                                            Feels {daypart.apparentTemp}&deg;
                                                        </span>
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Wind size={12} className="theme-subtle" />
                                                            Gusts {formatWindSpeed(Math.round(daypart.windSpeed), weatherData.current_units.wind_speed_10m)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className={sectionLabelClass}>
                                    <MetricLabel aggregated={Boolean(forecastConfidence)}>Next 24 Hours</MetricLabel>
                                </span>
                                <span className="surface-chip-muted rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                                    Interactive
                                </span>
                            </div>
                            <div className="surface-tile rounded-[28px] p-4 sm:p-5 mt-1 overflow-hidden">
                                <Next24HoursChart points={next24HourlyPoints} windUnit={weatherData.current_units.wind_speed_10m} />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className={sectionLabelClass}>
                                    <MetricLabel aggregated={Boolean(forecastConfidence)}>10-Day Outlook</MetricLabel>
                                </span>
                                <span className="surface-chip-muted rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                                    Range View
                                </span>
                            </div>
                            <div className="surface-tile rounded-[28px] p-3 sm:p-4">
                                <div className="flex flex-col divide-y divide-[color:var(--border-soft)]">
                                    {tenDayForecast.map((day) => {
                                        const dIconName = getWeatherIconFromCode(day.dayCode, 1);
                                        const dailyIconConfig = IconMap[dIconName] || IconMap.cloud;
                                        const DIcon = dailyIconConfig.icon;
                                        const conditionLabel = getWeatherDescriptionFromCode(day.dayCode, 1);
                                        const offset = ((day.dayLow - tenDayMin) / tenDaySpread) * 100;
                                        const width = Math.max(((day.dayHigh - day.dayLow) / tenDaySpread) * 100, 10);
                                        const roundedPrecipProbability = Math.round(day.dayPrecipProbability);

                                        return (
                                            <div
                                                key={day.key}
                                                className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(132px,1fr)] items-center gap-3 py-3 first:pt-1 last:pb-1 sm:grid-cols-[minmax(88px,0.85fr)_minmax(0,1.15fr)_minmax(170px,1fr)] sm:gap-4"
                                            >
                                                <div className="min-w-0">
                                                    <p className="theme-heading text-sm font-bold">{day.label}</p>
                                                    <p className="theme-muted text-xs">{day.subLabel}</p>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${day.showRainChance ? "border-sky-400/20 bg-sky-500/10" : "border-soft-var bg-white/[0.03]"}`}>
                                                            <DIcon
                                                                size={22}
                                                                strokeWidth={dailyIconConfig.strokeWidth ?? 1.9}
                                                                className={dailyIconConfig.className}
                                                            />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="theme-heading truncate text-sm font-semibold">
                                                                {conditionLabel}
                                                            </p>
                                                            {day.showRainChance ? (
                                                                <span className="mt-1 inline-flex rounded-full bg-sky-500/12 px-2 py-0.5 text-[10px] font-bold leading-none text-sky-400">
                                                                    Rain {roundedPrecipProbability}%
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="theme-muted w-9 text-right text-sm font-semibold">{day.dayLow}&deg;</span>
                                                    <div
                                                        className="relative h-3 flex-1 rounded-full"
                                                        style={{ background: "color-mix(in srgb, var(--surface-elevated) 82%, transparent)" }}
                                                    >
                                                        <div
                                                            className="absolute top-0 h-3 rounded-full bg-[linear-gradient(90deg,rgba(56,189,248,0.95),rgba(251,146,60,0.92))] shadow-[0_0_0_1px_rgba(255,255,255,0.14)_inset]"
                                                            style={{
                                                                left: `${offset}%`,
                                                                width: `${Math.min(width, 100 - offset)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="theme-heading w-9 text-sm font-bold">{day.dayHigh}&deg;</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </CollapsiblePanel>
            </div>

            <div className="flex flex-col gap-3">
                <button
                    type="button"
                    onClick={() => toggleDetailSection("extras")}
                    className={sectionAccordionButtonClass}
                >
                    <div className="min-w-0">
                        <p className="theme-heading text-sm font-bold">Extras</p>
                        <p className="theme-muted text-xs">Moon, marine, and historical context.</p>
                    </div>
                    <ChevronDown className={`theme-subtle h-5 w-5 shrink-0 transition-transform ${openDetailSections.extras ? "rotate-180" : ""}`} />
                </button>
                <CollapsiblePanel open={openDetailSections.extras} className="w-full">
                    <div className="flex flex-col gap-6 pt-2">
                        {astronomy && (
                            <div className="flex flex-col gap-2">
                                <span className={sectionLabelClass}>Moon</span>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <div className="surface-tile rounded-2xl p-3 flex flex-col items-center gap-1 text-center">
                                        <Moon className="text-indigo-400" size={18} />
                                        <span className="theme-section-label text-[10px] font-bold">Phase</span>
                                        <span className="font-semibold text-sm leading-tight">{astronomy.moon_phase}</span>
                                    </div>
                                    <div className="surface-tile rounded-2xl p-3 flex flex-col items-center gap-1 text-center">
                                        <SunDim className="text-amber-400" size={18} />
                                        <span className="theme-section-label text-[10px] font-bold">Illumination</span>
                                        <span className="font-semibold text-sm leading-tight">{Math.round(astronomy.moon_illumination)}%</span>
                                    </div>
                                    {astronomy.moonrise && astronomy.moonrise !== "No moonrise" && (
                                        <div className="surface-tile rounded-2xl p-3 flex flex-col items-center gap-1 text-center">
                                            <TrendingUp className="text-indigo-400" size={18} />
                                            <span className="theme-section-label text-[10px] font-bold">Rise</span>
                                            <span className="font-semibold text-sm leading-tight">{astronomy.moonrise}</span>
                                        </div>
                                    )}
                                    {astronomy.moonset && astronomy.moonset !== "No moonset" && (
                                        <div className="surface-tile rounded-2xl p-3 flex flex-col items-center gap-1 text-center">
                                            <TrendingDown className="text-indigo-400" size={18} />
                                            <span className="theme-section-label text-[10px] font-bold">Set</span>
                                            <span className="font-semibold text-sm leading-tight">{astronomy.moonset}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {marine && marine.current && (
                            <div className="flex flex-col gap-2">
                                <span className={sectionLabelClass}>Marine</span>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    <div className="surface-tile rounded-2xl p-3 flex flex-col items-center gap-1">
                                        <Waves className="text-blue-500" size={18} />
                                        <span className="theme-section-label text-[10px] font-bold">Height</span>
                                        <span className="font-semibold text-sm">
                                            {marine.current.wave_height != null
                                                ? distUnit === "mph"
                                                    ? `${(marine.current.wave_height * 3.281).toFixed(1)} ft`
                                                    : `${marine.current.wave_height.toFixed(1)} m`
                                                : "—"}
                                        </span>
                                    </div>
                                    <div className="surface-tile rounded-2xl p-3 flex flex-col items-center gap-1">
                                        <Waves className="text-cyan-500" size={18} />
                                        <span className="theme-section-label text-[10px] font-bold">Direction</span>
                                        <span className="font-semibold text-sm">{marine.current.wave_direction != null ? waveDirectionToCardinal(marine.current.wave_direction) : "—"}</span>
                                    </div>
                                    <div className="surface-tile rounded-2xl p-3 flex flex-col items-center gap-1">
                                        <Waves className="text-teal-500" size={18} />
                                        <span className="theme-section-label text-[10px] font-bold">Period</span>
                                        <span className="font-semibold text-sm">{marine.current.wave_period != null ? `${marine.current.wave_period.toFixed(1)}s` : "—"}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(histHigh !== null || climateNormal || riverDischarge !== null) && (
                            <div className="flex flex-col gap-2">
                                <span className={sectionLabelClass}>Historical Context</span>
                                <div className="surface-tile rounded-2xl p-4 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="theme-section-label text-xs font-bold">Today</span>
                                        <span className="font-bold text-sm">H: {dailyHigh}&deg; / L: {dailyLow}&deg;</span>
                                    </div>
                                    {histHigh !== null && histLow !== null && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <History className="text-violet-500" size={14} />
                                                <span className="theme-section-label text-xs font-bold">Last year</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">H: {histHigh}&deg; / L: {histLow}&deg;</span>
                                                {(() => {
                                                    const diff = dailyHigh - histHigh;
                                                    if (Math.abs(diff) < 1) return null;
                                                    return (
                                                        <span className={`text-xs font-bold ${diff > 0 ? "text-orange-500" : "text-blue-500"}`}>
                                                            {diff > 0 ? "+" : ""}{diff}&deg;
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                    {climateNormal && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="surface-chip-muted rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase">3yr avg</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">H: {climateNormal.avg_high}&deg; / L: {climateNormal.avg_low}&deg;</span>
                                                {(() => {
                                                    const diff = dailyHigh - climateNormal.avg_high;
                                                    if (Math.abs(diff) < 1) return <span className="theme-subtle text-xs font-bold">Normal</span>;
                                                    return (
                                                        <span className={`text-xs font-bold ${diff > 0 ? "text-orange-500" : "text-blue-500"}`}>
                                                            {diff > 0 ? "+" : ""}{diff}&deg; vs avg
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                    {riverDischarge !== null && (
                                        <>
                                            <div className="theme-divider border-t" />
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Waves className="text-blue-700" size={14} />
                                                    <span className="theme-section-label text-xs font-bold">River Discharge</span>
                                                </div>
                                                <span className="font-semibold text-sm">{riverDischarge.toFixed(1)} m³/s</span>
                                            </div>
                                            {(riverDischargeMin !== null || riverDischargeMean !== null || riverDischargeMax !== null) && (
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="surface-tile-strong rounded-xl p-2">
                                                        <p className="theme-section-label text-[10px] font-bold">Low</p>
                                                        <p className="font-semibold text-sm">{riverDischargeMin?.toFixed(1) ?? "—"}</p>
                                                    </div>
                                                    <div className="surface-tile-strong rounded-xl p-2">
                                                        <p className="theme-section-label text-[10px] font-bold">Mean</p>
                                                        <p className="font-semibold text-sm">{riverDischargeMean?.toFixed(1) ?? "—"}</p>
                                                    </div>
                                                    <div className="surface-tile-strong rounded-xl p-2">
                                                        <p className="theme-section-label text-[10px] font-bold">High</p>
                                                        <p className="font-semibold text-sm">{riverDischargeMax?.toFixed(1) ?? "—"}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsiblePanel>
            </div>

            <button
                type="button"
                onClick={() => setShowDataSources(true)}
                className="surface-tile flex min-h-[56px] flex-col gap-3 rounded-[24px] px-4 py-4 text-left transition-all hover-border-strong-var hover-bg-surface-elevated-var"
            >
                <div className="flex w-full items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="theme-heading text-sm font-bold">About Data</p>
                        <p className="theme-muted text-xs">
                            {activeSourceEntries.length} {activeSourceEntries.length === 1 ? "source is" : "sources are"} supporting the sections currently open.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="surface-chip rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm">
                            {activeSourceEntries.length}
                        </span>
                        <ChevronDown className="theme-subtle -rotate-90 h-5 w-5" />
                    </div>
                </div>
                <div className="flex w-full flex-wrap gap-2">
                    {visibleSourceSummary.map(({ name }) => (
                        <span key={name} className="surface-chip rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm">
                            {name}
                        </span>
                    ))}
                    {activeSourceEntries.length > visibleSourceSummary.length ? (
                        <span className="surface-chip-muted rounded-full px-2.5 py-1 text-[10px] font-bold">
                            +{activeSourceEntries.length - visibleSourceSummary.length} more
                        </span>
                    ) : null}
                </div>
            </button>
        </div>
    );

    return (
        <div className="weather-card-shell mx-auto flex w-full max-w-7xl flex-col gap-6 sm:overflow-visible overflow-hidden">

            {/* Alerts banner */}
            {allAlerts.length > 0 && (
                <div className="flex flex-col gap-2">
                    {allAlerts.map((alert) => (
                        <div
                            key={alert.key}
                            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 transition-all hover:border-red-300 hover:bg-red-50"
                        >
                            <AlertTriangle className="mt-0.5 shrink-0 text-red-500" size={18} />
                            <div className="min-h-[56px] min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedAlertKey(expandedAlertKey === alert.key ? null : alert.key)}
                                        className="min-w-0 flex-1 text-left"
                                    >
                                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-600">{alert.severity} · {alert.event}</p>
                                        <p className={`mt-1 text-[15px] font-semibold leading-snug text-red-900 ${expandedAlertKey === alert.key ? "" : "line-clamp-3"}`}>
                                            {alert.headline}
                                        </p>
                                    </button>
                                    <div className="flex shrink-0 items-start gap-2">
                                        <span className="rounded-full border border-red-200 bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
                                            {expandedAlertKey === alert.key ? "Hide" : "Details"}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (expandedAlertKey === alert.key) {
                                                    setExpandedAlertKey(null);
                                                }
                                                onDismissAlert(alert.source, {
                                                    event: alert.event,
                                                    headline: alert.headline,
                                                    severity: alert.severity,
                                                    expires: alert.expires,
                                                });
                                            }}
                                            className="rounded-full border border-red-200 bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700 transition-colors hover:bg-white"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                                {expandedAlertKey === alert.key && alert.details ? (
                                    <p className="mt-2 text-sm leading-relaxed text-red-800">
                                        {alert.details}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="weather-card-columns flex w-full min-w-0 flex-1 flex-col items-start gap-6 sm:flex-row sm:flex-nowrap">
                {/* Left Column (Hero & Personality) */}
                <div className="weather-card-sidebar flex w-full flex-col gap-6 sm:w-[42%] sm:min-w-[340px] sm:flex-none sm:flex-shrink-0">
                    <div className={heroCardClass}>
                        <div className="weather-hero-overlay pointer-events-none absolute inset-0" />
                        <div className="bg-weather-glow-var pointer-events-none absolute -left-12 top-8 h-32 w-32 rounded-full blur-3xl opacity-40" />
                        <div className="bg-accent-soft-var pointer-events-none absolute -right-10 bottom-6 h-28 w-28 rounded-full blur-3xl" />

                        {/* Top Header - Always visible */}
                        <div className="relative flex flex-col items-center text-center">
                            <div className="weather-hero-badges flex flex-wrap items-center justify-center gap-2">
                                <span className="surface-chip-muted rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em]">
                                    {currentCondition}
                                </span>
                                <span className="surface-chip-muted rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em]">
                                    Local {localTimeLabel}
                                </span>
                            </div>

                            <div className="mt-6 flex flex-col items-center gap-4">
                                <div className="weather-hero-icon-shell">
                                    <div className={`weather-hero-icon-core flex h-24 w-24 items-center justify-center rounded-full ${iconBadgeClass}`} style={iconBadgeStyle}>
                                        <IconComponent
                                            size={iconSize}
                                            strokeWidth={iconConfig.strokeWidth ?? 1.75}
                                            className={iconConfig.className}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <span className="weather-hero-temperature theme-heading flex items-start justify-center gap-1 font-bold tracking-tight">
                                        <span>{displayTemp}</span>
                                        <span className="weather-hero-degree">&deg;</span>
                                    </span>
                                    {forecastConfidence ? (
                                        <AggregatedMetricBadge title="Main temperature is blended from multiple forecast models." />
                                    ) : null}
                                    <span
                                        className="weather-hero-location theme-heading max-w-[16rem] capitalize"
                                        title={locationName || "Current Location"}
                                    >
                                        {primaryLocationName}
                                    </span>
                                    {secondaryLocationName ? (
                                        <span className="weather-hero-subtitle theme-muted max-w-[18rem] text-center font-semibold leading-snug sm:max-w-none">
                                            {secondaryLocationName}
                                        </span>
                                    ) : null}
                                    <span className="theme-heading mt-2 text-sm font-bold tracking-wide">
                                        H: {dailyHigh}&deg; L: {dailyLow}&deg;
                                    </span>
                                    {heroSummary ? (
                                        <p className="weather-hero-summary theme-muted mt-3 max-w-[34ch] text-center text-sm font-medium leading-relaxed sm:text-[15px]">
                                            {heroSummary}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            {(hasConfidencePill || hasStationPill || hasMinutelyPill) && (
                                <div className="mt-6 flex w-full flex-col gap-2.5">
                                    {(hasConfidencePill || hasStationPill) && (
                                        <div className="grid w-full grid-cols-2 gap-2.5">
                                            {conf && forecastConfidence && (
                                                <button
                                                    onClick={() => setShowConfidenceDetail(v => !v)}
                                                    className={`${insightPillClass} justify-between ${showConfidenceDetail ? insightPillOpenClass : ""}`}
                                                >
                                                    <div className="flex w-full flex-col text-left">
                                                        <p className="theme-section-label text-[10px] font-bold tracking-[0.18em] uppercase">Models</p>
                                                        <div className="mt-1.5 flex w-full items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Sparkles className="text-amber-400" size={16} />
                                                                <span className="theme-heading text-[15px] font-semibold">{confidenceSummaryLabel ?? "Forecast spread"}</span>
                                                            </div>
                                                            <ChevronDown className={`theme-subtle h-4 w-4 shrink-0 transition-transform ${showConfidenceDetail ? "rotate-180" : ""}`} />
                                                        </div>
                                                        <p className="theme-subtle mt-1 flex items-center gap-1 text-[13px]">
                                                            {confidenceAggregatedTemp}&deg; &plusmn;{forecastConfidence.spread}&deg;
                                                        </p>
                                                    </div>
                                                </button>
                                            )}
                                            {metarTempDisplay != null && (
                                                <button
                                                    onClick={() => setShowStationDetail(v => !v)}
                                                    className={`${insightPillClass} justify-between ${showStationDetail ? insightPillOpenClass : ""} ${stationNeedsAttention ? "border-orange-300/70 bg-[linear-gradient(135deg,rgba(251,146,60,0.16),rgba(255,255,255,0.08))]" : ""}`}
                                                >
                                                    <div className="flex w-full flex-col text-left">
                                                        <p className="theme-section-label text-[10px] font-bold tracking-[0.18em] uppercase">Station</p>
                                                        <div className="mt-1.5 flex w-full items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Radio className="text-sky-400" size={16} />
                                                                <span className="theme-heading text-[15px] font-semibold">{metarTempDisplay}&deg; observed</span>
                                                            </div>
                                                            <ChevronDown className={`theme-subtle h-4 w-4 shrink-0 transition-transform ${showStationDetail ? "rotate-180" : ""}`} />
                                                        </div>
                                                        <p className="theme-subtle mt-1 text-[13px]">
                                                            {showStationTempDelta && metarTempDiff != null
                                                                ? `${metarTempDiff > 0 ? "+" : ""}${metarTempDiff}° vs main temp`
                                                                : stationDistanceDisplay ?? stationIcaoId}
                                                        </p>
                                                    </div>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {showMinutelyBanner && rainSummary && (
                                        <button
                                            onClick={() => setShowMinutelyDetail(v => !v)}
                                            className={`${insightPillClass} justify-between ${showMinutelyDetail ? insightPillOpenClass : ""} ${minutelyPillToneClass}`}
                                        >
                                            <div className="flex w-full flex-col text-left">
                                                <p className="theme-section-label text-[10px] font-bold tracking-[0.18em] uppercase">Next-Hour Trend</p>
                                                <div className="mt-1.5 flex w-full items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <CloudRain className={minutelyIconClass} size={16} />
                                                        <span className="theme-heading text-[15px] font-semibold">{minutelyStatusLabel}</span>
                                                    </div>
                                                    <ChevronDown className={`theme-subtle h-4 w-4 shrink-0 transition-transform ${showMinutelyDetail ? "rotate-180" : ""}`} />
                                                </div>
                                                <p className="theme-subtle mt-1 text-[13px]">
                                                    {rainSummary.isRaining ? minutelySummaryText : "Next-hour rain trend in 5-minute steps"}
                                                </p>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            )}

                            <CollapsiblePanel open={Boolean(conf && forecastConfidence && showConfidenceDetail)} className="mt-2 w-full">
                                <div className="surface-tile rounded-2xl border px-4 py-3">
                                    <div className="border-soft-var mb-3 flex items-center justify-between border-b pb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2 w-2 rounded-full ${confidenceDotClass}`} />
                                            <span className="theme-section-label text-xs font-bold tracking-wide">
                                                <MetricLabel aggregated aggregatedTitle="Consensus from multiple forecast models.">Model Average</MetricLabel>
                                            </span>
                                        </div>
                                        <span className="theme-heading text-sm font-bold">{confidenceAggregatedTemp}&deg;</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                        {confidenceModelNames.map((name, i) => (
                                            confidenceModelTemps[i] != null && (
                                                <div key={name} className="flex items-center justify-between gap-2">
                                                    <span className="theme-muted text-xs font-medium">{name}</span>
                                                    <span className="theme-heading text-xs font-bold">{confidenceModelTemps[i]}&deg;</span>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>
                            </CollapsiblePanel>
                            <CollapsiblePanel open={Boolean(metar && metarTempDisplay != null && showStationDetail)} className="mt-2 w-full">
                                <div className="surface-tile rounded-2xl border px-4 py-3 text-left">
                                    <div className="border-soft-var mb-3 flex items-start justify-between gap-3 border-b pb-2">
                                        <div className="min-w-0">
                                            <p className="theme-section-label text-xs font-bold tracking-wide">Nearest Station</p>
                                            <p className="theme-heading truncate text-sm font-bold">{stationName}</p>
                                            <p className="theme-muted text-xs">{stationIcaoId}{stationDistanceDisplay ? ` · ${stationDistanceDisplay}` : ""}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="theme-heading text-sm font-bold">{metarTempDisplay}&deg;</p>
                                            {showStationTempDelta && metarTempDiff != null && (
                                                <p className={`text-xs font-bold ${metarTempDiff > 0 ? "text-orange-500" : "text-blue-500"}`}>
                                                    {metarTempDiff > 0 ? "+" : ""}{metarTempDiff}&deg; vs main temp
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="surface-tile-strong rounded-xl p-2">
                                            <p className="theme-section-label text-[10px] font-bold">Wind</p>
                                            <p className="theme-heading text-sm font-semibold">
                                                {stationWind}
                                            </p>
                                        </div>
                                        <div className="surface-tile-strong rounded-xl p-2">
                                            <p className="theme-section-label text-[10px] font-bold">Visibility</p>
                                            <p className="theme-heading text-sm font-semibold">{stationVisibility}</p>
                                        </div>
                                    </div>
                                </div>
                            </CollapsiblePanel>
                            <CollapsiblePanel open={Boolean(showMinutelyBanner && rainSummary && showMinutelyDetail)} className="mt-2 w-full">
                                <div className={`w-full rounded-2xl border px-4 py-3 text-left ${minutelyBannerClass}`}>
                                    <div className="mb-3 flex items-start justify-between gap-3 border-b border-current/10 pb-2">
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-70">
                                                Short-range rain trend
                                            </p>
                                            <p className="text-sm font-bold">
                                                Precipitation over the next hour
                                            </p>
                                        </div>
                                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${minutelyBadgeClass}`}>
                                            {minutelyStatusLabel}
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <CloudRain className={`${minutelyIconClass} mt-0.5 shrink-0`} size={18} />
                                        <p className="text-sm font-semibold leading-relaxed">
                                            {minutelySummaryText}
                                        </p>
                                    </div>
                                    {minutelyTimeline.length > 0 && (
                                        <div className="mt-4">
                                            <div className="mb-2 flex items-center justify-between">
                                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-70">
                                                    Timeline
                                                </p>
                                                <p className="text-xs font-medium opacity-80">
                                                    5-minute steps
                                                </p>
                                            </div>
                                            <div className="surface-tile-strong rounded-2xl px-3 py-4">
                                                <div className="flex h-24 items-end gap-1.5">
                                                    {minutelyTimeline.map((point) => {
                                                        const probabilityHeight = Math.max(8, Math.round(point.precip_probability * 100));
                                                        const intensityRatio = maxMinutelyIntensity > 0
                                                            ? point.precip_intensity / maxMinutelyIntensity
                                                            : 0;
                                                        const barHeight = point.precip_probability > 0 || point.precip_intensity > 0
                                                            ? Math.max(probabilityHeight, Math.round(intensityRatio * 100))
                                                            : 8;

                                                        return (
                                                            <div key={point.offset_minutes} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                                                                <div className="flex h-full w-full items-end">
                                                                    <div
                                                                        className={`w-full rounded-full transition-all ${point.precip_probability >= 0.5 || point.precip_intensity > 0.05
                                                                            ? "bg-gradient-to-t from-sky-500 to-cyan-300"
                                                                            : point.precip_probability > 0 || point.precip_intensity > 0
                                                                                ? "bg-gradient-to-t from-sky-400/70 to-cyan-200/70"
                                                                                : "bg-[color:var(--border-soft)]"
                                                                            }`}
                                                                        style={{ height: `${barHeight}%` }}
                                                                        title={`${point.offset_minutes} min: ${Math.round(point.precip_probability * 100)}%`}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="mt-3 flex justify-between text-[10px] font-bold uppercase tracking-wide opacity-70">
                                                    <span>Now</span>
                                                    <span>15m</span>
                                                    <span>30m</span>
                                                    <span>45m</span>
                                                    <span>1h</span>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {shouldShowForecastChance(peakMinutelyChance) ? (
                                                    <span className="surface-chip rounded-full px-2.5 py-1 text-[10px] font-bold">
                                                        Peak chance {peakMinutelyChance}%
                                                    </span>
                                                ) : (
                                                    <span className="surface-chip rounded-full px-2.5 py-1 text-[10px] font-bold">
                                                        Weak signal
                                                    </span>
                                                )}
                                                <span className="surface-chip rounded-full px-2.5 py-1 text-[10px] font-bold">
                                                    {minutelyGuidanceText}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CollapsiblePanel>
                        </div>
                    </div>

                    {/* Personality + AI advice */}
                    <div className="personality-card-shell personality-card-bg border-strong-var shadow-soft-var relative isolate overflow-hidden rounded-[28px] border">
                        <div className="bg-accent-soft-var pointer-events-none absolute -left-10 top-4 h-32 w-32 rounded-full blur-3xl opacity-70" />
                        <div className="pointer-events-none absolute -right-6 top-1/3 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
                        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        <div className="relative px-5 py-5 sm:px-8 sm:py-8">
                            <div className="flex flex-col gap-5 sm:gap-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
                                            <div className="border-accent-var bg-accent-soft-var text-accent-var shadow-soft-var flex h-12 w-12 shrink-0 items-center justify-center rounded-[22px] border sm:h-14 sm:w-14">
                                                <PersonalityIcon size={20} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                                    <p className="theme-section-label text-[11px] font-bold tracking-[0.22em]">Forecast Voice</p>
                                                    <span className="border-accent-var bg-accent-soft-var text-accent-var rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                                                        Active
                                                    </span>
                                                    {selectedPersonality.isCustom ? (
                                                        <span className="surface-chip rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                                                            Custom
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <h2 className="theme-heading mt-3 text-[clamp(1.85rem,7vw,2.6rem)] font-bold leading-none tracking-[-0.03em]">
                                                    {selectedPersonality.label}
                                                </h2>
                                                <p className="theme-subtle mx-auto mt-2 max-w-[34ch] text-[14px] leading-relaxed opacity-90 sm:mx-0 sm:text-[15px]">
                                                    {selectedPersonality.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setIsVoiceMenuOpen((currentValue) => !currentValue)}
                                            className="surface-chip shadow-soft-var inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 hover-border-accent-var hover-text-accent-var"
                                            aria-expanded={isVoiceMenuOpen}
                                        >
                                            Change voice
                                            <ChevronDown className={`transition-transform ${isVoiceMenuOpen ? "rotate-180" : "-rotate-90"}`} size={14} />
                                        </button>
                                    </div>
                                </div>

                                <CollapsiblePanel open={isVoiceMenuOpen} className="mt-0">
                                    <div className="surface-tile rounded-[26px] p-4 sm:p-5">
                                        <VoiceSettingsMenu
                                            allPersonalities={allPersonalities}
                                            personalityId={personalityId}
                                            selectedPersonality={selectedPersonality}
                                            customPersonalitiesCount={customPersonalitiesCount}
                                            customIdea={customIdea}
                                            customPersonalityError={customPersonalityError}
                                            isGeneratingCustomPersonality={isGeneratingCustomPersonality}
                                            onCustomIdeaChange={onCustomIdeaChange}
                                            onPersonalityChange={handleVoiceSelection}
                                            onDeleteCustomPersonality={onDeleteCustomPersonality}
                                            onGenerateCustomPersonality={onGenerateCustomPersonality}
                                            showSelectedSummary={false}
                                        />
                                    </div>
                                </CollapsiblePanel>

                                <div className="theme-divider border-t pt-5 sm:pt-6">
                                    <div className="surface-tile-strong shadow-soft-var flex flex-col items-center rounded-[26px] px-5 py-5 text-center transition-all hover:-translate-y-0.5 sm:items-start sm:px-7 sm:py-6 sm:text-left">
                                        <p className="theme-subtle text-[11px] font-bold uppercase tracking-[0.22em]">Current Read</p>
                                        <p className="theme-heading mt-3 max-w-[34ch] text-[1.08rem] font-medium leading-[1.75] tracking-[-0.015em] sm:text-[1.16rem] lg:max-w-[38ch]">
                                            {resolvedAdvice}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="weather-card-mobile-detail-toggle surface-card rounded-[28px] p-3 sm:hidden">
                        <button
                            onClick={onToggleDetail}
                            className="organic-button w-full justify-between px-5 text-sm"
                        >
                            <span>{isDetailed ? "Show Less" : "Show Detail"}</span>
                            <span className="theme-subtle text-xs font-bold uppercase tracking-[0.18em]">
                                Forecast, conditions, extras
                            </span>
                        </button>
                    </div>

                    <div className="weather-card-mobile-detail relative z-10 w-full sm:hidden">
                        <CollapsiblePanel open={isDetailed} className="w-full">
                            {detailedContent}
                        </CollapsiblePanel>
                    </div>
                </div>

                {/* Detailed View Section (Always visible on desktop) */}
                <div className="weather-card-desktop-detail hidden sm:block sm:min-w-0 sm:flex-1 sm:flex-grow">
                    {detailedContent}
                </div>
            </div>

            {showDataSources && (
                <div
                    className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:items-center"
                    onClick={() => setShowDataSources(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="surface-card-strong shadow-strong-var w-full max-w-md rounded-[28px] border p-5"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="theme-section-label text-[11px] font-bold tracking-[0.18em]">About Data</p>
                                <h3 className="theme-heading mt-1 text-lg font-bold">Sources in this view</h3>
                                <p className="theme-muted mt-1 text-sm">
                                    Only sources contributing to the sections currently visible are listed here.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDataSources(false)}
                                className="surface-chip inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full"
                                aria-label="Close data sources"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="theme-divider mt-4 flex max-h-[min(24rem,60dvh)] flex-col gap-3 overflow-y-auto border-t pt-4 pr-1">
                            {activeSourceEntries.map(({ name, role }) => (
                                <div key={name} className="border-soft-var bg-surface-tile-var flex items-start gap-3 rounded-2xl border px-3 py-3">
                                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
                                    <div className="min-w-0">
                                        <p className="theme-heading text-sm font-bold leading-tight">{name}</p>
                                        <p className="theme-muted mt-1 text-sm leading-snug">{role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
