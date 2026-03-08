import { useState, type CSSProperties, type ReactNode } from "react";
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
    getAirQualitySummary,
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
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    Thermometer,
    Wind,
    Droplets,
    Gauge,
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
    MapPin,
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
const heroCardClass = "weather-card-hero surface-card-strong relative overflow-hidden rounded-[32px] px-4 py-5 sm:px-6 sm:py-6";

const insightPillClass = "weather-card-insight-pill flex w-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-soft-var bg-surface-chip-var px-3 py-2.5 text-left transition-all active:opacity-70 hover:-translate-y-0.5 hover-border-strong-var shadow-soft-var";
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
type DailyOutlookDay = {
    key: string;
    label: string;
    subLabel: string;
    dayCode: number;
    dayHigh: number;
    dayLow: number;
    dayPrecipProbability: number;
    showRainChance: boolean;
};
type HistoricalRangeItem = {
    key: string;
    label: string;
    subLabel: string;
    low: number;
    high: number;
    accentClass: string;
    comparisonText?: string;
    comparisonToneClass?: string;
};
type ObservedTempChartPoint = {
    value: number;
    shortLabel: string;
    axisLabel: string;
    fullLabel: string;
    isLatest: boolean;
};

type ObservedTempTooltipProps = {
    active?: boolean;
    payload?: Array<{
        payload: ObservedTempChartPoint;
    }>;
};

function shouldShowForecastChance(probability: number | null | undefined): probability is number {
    return probability != null && probability >= MIN_FORECAST_CHANCE_TO_SHOW;
}

function formatCurrentPrecipChance(probability: number): string {
    if (probability < MIN_FORECAST_CHANCE_TO_SHOW) return "Low";
    return `${probability}%`;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function getHistoricalDeltaCopy(delta: number, variant: "last-year" | "average"): {
    text: string;
    toneClass: string;
} {
    const absoluteDelta = Math.abs(delta);

    if (absoluteDelta < 1) {
        return {
            text: variant === "average" ? "Near avg high" : "Same high as last year",
            toneClass: "theme-subtle",
        };
    }

    if (variant === "average") {
        return {
            text: delta > 0 ? `+${delta}° above avg high` : `${absoluteDelta}° below avg high`,
            toneClass: delta > 0 ? "text-orange-500" : "text-blue-500",
        };
    }

    return {
        text: delta > 0 ? `+${delta}° warmer high` : `${absoluteDelta}° cooler high`,
        toneClass: delta > 0 ? "text-orange-500" : "text-blue-500",
    };
}

function hasMeaningfulSpread(values: number[], minimumSpread = 0.05): boolean {
    if (values.length < 2) return false;
    return Math.max(...values) - Math.min(...values) >= minimumSpread;
}

function getAirQualityTone(aqi: number): {
    accent: string;
    accentSoft: string;
    accentStrong: string;
    fill: string;
    glow: string;
} {
    if (aqi <= 50) {
        return {
            accent: "#4ade80",
            accentSoft: "rgba(74, 222, 128, 0.14)",
            accentStrong: "rgba(16, 185, 129, 0.24)",
            fill: "linear-gradient(90deg, rgba(74, 222, 128, 0.95), rgba(45, 212, 191, 0.9))",
            glow: "0 0 30px rgba(74, 222, 128, 0.28)",
        };
    }
    if (aqi <= 100) {
        return {
            accent: "#facc15",
            accentSoft: "rgba(250, 204, 21, 0.14)",
            accentStrong: "rgba(245, 158, 11, 0.26)",
            fill: "linear-gradient(90deg, rgba(250, 204, 21, 0.95), rgba(251, 191, 36, 0.88))",
            glow: "0 0 30px rgba(250, 204, 21, 0.24)",
        };
    }
    if (aqi <= 150) {
        return {
            accent: "#fb923c",
            accentSoft: "rgba(251, 146, 60, 0.14)",
            accentStrong: "rgba(249, 115, 22, 0.26)",
            fill: "linear-gradient(90deg, rgba(251, 146, 60, 0.95), rgba(248, 113, 113, 0.88))",
            glow: "0 0 30px rgba(251, 146, 60, 0.24)",
        };
    }
    if (aqi <= 200) {
        return {
            accent: "#f87171",
            accentSoft: "rgba(248, 113, 113, 0.14)",
            accentStrong: "rgba(239, 68, 68, 0.26)",
            fill: "linear-gradient(90deg, rgba(248, 113, 113, 0.95), rgba(244, 63, 94, 0.88))",
            glow: "0 0 30px rgba(248, 113, 113, 0.24)",
        };
    }
    if (aqi <= 300) {
        return {
            accent: "#c084fc",
            accentSoft: "rgba(192, 132, 252, 0.14)",
            accentStrong: "rgba(168, 85, 247, 0.26)",
            fill: "linear-gradient(90deg, rgba(192, 132, 252, 0.95), rgba(129, 140, 248, 0.88))",
            glow: "0 0 30px rgba(192, 132, 252, 0.24)",
        };
    }
    return {
        accent: "#fb7185",
        accentSoft: "rgba(251, 113, 133, 0.14)",
        accentStrong: "rgba(244, 63, 94, 0.26)",
        fill: "linear-gradient(90deg, rgba(251, 113, 133, 0.95), rgba(225, 29, 72, 0.88))",
        glow: "0 0 30px rgba(251, 113, 133, 0.24)",
    };
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

function ObservedTempTooltip({ active, payload }: ObservedTempTooltipProps) {
    if (!active || !payload?.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    return (
        <div className="surface-card-strong min-w-[132px] rounded-[18px] border border-soft-var px-3 py-2 shadow-soft-var">
            <p className="theme-heading text-sm font-bold">{data.fullLabel}</p>
            <p className="mt-1 text-sm font-bold text-indigo-300">{Math.round(data.value)}&deg;</p>
        </div>
    );
}

function formatStatPercent(value: number): string {
    return `${Math.round(value)}%`;
}

function getHumidityLabel(value: number): string {
    if (value < 35) return "Dry air";
    if (value < 60) return "Comfortable";
    if (value < 75) return "Muggy";
    return "Very humid";
}

function getCloudCoverLabel(value: number): string {
    if (value < 15) return "Mostly clear";
    if (value < 45) return "A few clouds";
    if (value < 75) return "Partly cloudy";
    return "Mostly cloudy";
}

function getUvLabel(value: number): string {
    if (value < 3) return "Low";
    if (value < 6) return "Moderate";
    if (value < 8) return "High";
    if (value < 11) return "Very high";
    return "Extreme";
}

function getWindLabel(speed: number): string {
    if (speed < 5) return "Calm";
    if (speed < 12) return "Light breeze";
    if (speed < 20) return "Steady breeze";
    if (speed < 30) return "Breezy";
    return "Strong wind";
}

function getVisibilityLabel(meters: number, currentUnitsVisibility: string): string {
    const miles = currentUnitsVisibility === "m" ? meters / 1609.34 : meters / 5280;
    if (miles >= 10) return "Far-reaching view";
    if (miles >= 6) return "Clear enough";
    if (miles >= 3) return "Slight haze";
    return "Reduced view";
}

function clampPercentage(value: number): number {
    return Math.max(0, Math.min(100, value));
}

function ConditionRingMetric({
    icon,
    label,
    value,
    detail,
    aggregated = false,
    aggregatedTitle,
    progress,
    stroke,
    glow,
    badgeClassName,
    accentStyle,
    animationDelayMs = 0,
}: {
    icon: ReactNode;
    label: ReactNode;
    value: string;
    detail: string;
    aggregated?: boolean;
    aggregatedTitle?: string;
    progress: number;
    stroke: string;
    glow: string;
    badgeClassName: string;
    accentStyle?: CSSProperties;
    animationDelayMs?: number;
}) {
    const normalizedProgress = clampPercentage(progress);
    const circumference = 2 * Math.PI * 44;
    const statStyle = {
        "--ring-circumference": circumference,
        "--ring-offset": circumference * (1 - normalizedProgress / 100),
        "--ring-stroke": stroke,
        "--ring-glow": glow,
        "--metric-delay": `${animationDelayMs}ms`,
        ...accentStyle,
        animationDelay: `${animationDelayMs}ms`,
    } as CSSProperties;

    return (
        <article
            className="conditions-ring-metric"
            style={statStyle}
        >
            <div className="conditions-ring-metric-head">
                <div className="conditions-ring-metric-title-group">
                    <span className="conditions-ring-metric-label theme-section-label text-[10px] font-bold">{label}</span>
                    {aggregated ? <AggregatedMetricBadge title={aggregatedTitle} /> : null}
                </div>
                <div className={`conditions-ring-icon ${badgeClassName}`}>
                    {icon}
                </div>
            </div>
            <div className="conditions-ring-visual">
                <svg
                    aria-hidden="true"
                    viewBox="0 0 100 100"
                    className="conditions-ring-svg"
                >
                    <circle className="conditions-ring-track" cx="50" cy="50" r="44" />
                    <circle className="conditions-ring-progress" cx="50" cy="50" r="44" />
                </svg>
                <div className="conditions-ring-value-wrap">
                    <p className="conditions-ring-value">{value}</p>
                </div>
            </div>
            <p className="conditions-ring-detail">{detail}</p>
        </article>
    );
}

type WeatherCardProps = {
    locationName: string,
    weatherData: WeatherData | null,
    isDetailed: boolean,
    onToggleDetail: () => void,
    aiHeroSummary: string,
    aiNext24Summary: string,
    aiAirQualitySummary: string,
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
    aiAirQualitySummary,
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
    const [showAirQualityDetail, setShowAirQualityDetail] = useState(false);
    const [showFullTenDayOutlook, setShowFullTenDayOutlook] = useState(false);
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
    const iconSize = isNightIcon ? 72 : 68;
    const PersonalityIcon = PersonalityIconMap[selectedPersonality.icon];

    const dailyHigh = Math.round(weatherData.daily.temperature_2m_max[0]);
    const dailyLow = Math.round(weatherData.daily.temperature_2m_min[0]);
    const currentCondition = getWeatherDescriptionFromCode(current.weather_code, current.is_day);
    const localTimestamp = getLocalTimeForOffset(weatherData.utc_offset_seconds);
    const localTimeLabel = format(localTimestamp, "h:mm a");
    const heroSummary = aiHeroSummary.trim();
    const resolvedAirQualitySummary = aiAirQualitySummary.trim();
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
    const aqiTone = aqiValue !== null ? getAirQualityTone(aqiValue) : null;
    const aqiProgress = aqiValue !== null
        ? aqiValue === 0
            ? 0
            : clamp((aqiValue / 300) * 100, 4, 100)
        : 0;
    const airQualitySummary = aqiLevel ? getAirQualitySummary(aqiLevel.label) : null;
    const airQualityMetrics = [
        { label: "US AQI", value: aqiValue?.toFixed(0) ?? "—", detail: "Primary index" },
        { label: "EU AQI", value: airQuality?.current?.european_aqi?.toFixed(0) ?? "—", detail: "Alternate scale" },
        { label: "PM2.5", value: airQuality?.current?.pm2_5?.toFixed(1) ?? "—", detail: "Fine particles" },
        { label: "PM10", value: airQuality?.current?.pm10?.toFixed(1) ?? "—", detail: "Larger dust" },
        { label: "Ozone", value: airQuality?.current?.ozone?.toFixed(0) ?? "—", detail: "Surface ozone" },
        { label: "NO2", value: airQuality?.current?.nitrogen_dioxide?.toFixed(1) ?? "—", detail: "Traffic-related gas" },
        { label: "CO", value: airQuality?.current?.carbon_monoxide?.toFixed(0) ?? "—", detail: "Combustion marker" },
    ];
    const aqiScaleStops = [0, 50, 100, 150, 200, 300];

    // Pollen (first hourly slot)
    const grassPollen = airQuality?.hourly?.grass_pollen?.[0] ?? null;
    const birchPollen = airQuality?.hourly?.birch_pollen?.[0] ?? null;
    const alderPollen = airQuality?.hourly?.alder_pollen?.[0] ?? null;
    const hasPollenData = grassPollen !== null || birchPollen !== null || alderPollen !== null;
    const pollenMetrics = [
        grassPollen !== null
            ? { key: "grass", label: "Grass", value: grassPollen.toFixed(0), iconClassName: "text-green-400" }
            : null,
        birchPollen !== null
            ? { key: "birch", label: "Birch", value: birchPollen.toFixed(0), iconClassName: "text-lime-400" }
            : null,
        alderPollen !== null
            ? { key: "alder", label: "Alder", value: alderPollen.toFixed(0), iconClassName: "text-emerald-400" }
            : null,
    ].filter((metric): metric is { key: string; label: string; value: string; iconClassName: string } => metric !== null);

    // Historical
    const histHigh = historical?.daily?.temperature_2m_max?.[0] != null
        ? Math.round(historical.daily.temperature_2m_max[0]) : null;
    const histLow = historical?.daily?.temperature_2m_min?.[0] != null
        ? Math.round(historical.daily.temperature_2m_min[0]) : null;
    const lastYearDelta = histHigh !== null ? getHistoricalDeltaCopy(dailyHigh - histHigh, "last-year") : null;
    const climateDelta = climateNormal ? getHistoricalDeltaCopy(dailyHigh - climateNormal.avg_high, "average") : null;
    const historicalRangeItems: HistoricalRangeItem[] = [
        {
            key: "today",
            label: "Today",
            subLabel: "Current forecast",
            low: dailyLow,
            high: dailyHigh,
            accentClass: "bg-[linear-gradient(90deg,rgba(56,189,248,0.95),rgba(251,146,60,0.92))]",
        },
        ...(histHigh !== null && histLow !== null
            ? [{
                key: "last-year",
                label: "Last year",
                subLabel: "Same date",
                low: histLow,
                high: histHigh,
                accentClass: "bg-[linear-gradient(90deg,rgba(167,139,250,0.92),rgba(96,165,250,0.86))]",
                comparisonText: lastYearDelta?.text,
                comparisonToneClass: lastYearDelta?.toneClass,
            }]
            : []),
        ...(climateNormal
            ? [{
                key: "average",
                label: "3yr avg",
                subLabel: "Climate normal",
                low: climateNormal.avg_low,
                high: climateNormal.avg_high,
                accentClass: "bg-[linear-gradient(90deg,rgba(148,163,184,0.9),rgba(203,213,225,0.82))]",
                comparisonText: climateDelta?.text,
                comparisonToneClass: climateDelta?.toneClass,
            }]
            : []),
    ];
    const historicalChartMin = historicalRangeItems.length > 0
        ? Math.min(...historicalRangeItems.map((item) => item.low))
        : null;
    const historicalChartMax = historicalRangeItems.length > 0
        ? Math.max(...historicalRangeItems.map((item) => item.high))
        : null;
    const historicalChartRange = historicalChartMin != null && historicalChartMax != null
        ? Math.max(historicalChartMax - historicalChartMin, 1)
        : 1;

    const riverDischarge = flood?.daily?.river_discharge?.[0] ?? null;
    const riverDischargeMin = flood?.daily?.river_discharge_min?.[0] ?? null;
    const riverDischargeMean = flood?.daily?.river_discharge_mean?.[0] ?? null;
    const riverDischargeMax = flood?.daily?.river_discharge_max?.[0] ?? null;
    const riverBandValues = [riverDischargeMin, riverDischargeMean, riverDischargeMax]
        .filter((value): value is number => value != null);
    const hasRiverBandSpread = hasMeaningfulSpread(riverBandValues);

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
    const confidenceModelEntries = confidenceModelNames.reduce<Array<{ name: string; temp: number }>>((entries, name, index) => {
        const temp = confidenceModelTemps[index];
        if (temp == null) return entries;
        entries.push({ name, temp });
        return entries;
    }, []);
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
    const observedMetrics = [
        { label: "Wind", value: stationWind, detail: "Field observation" },
        { label: "Visibility", value: stationVisibility, detail: "Station report" },
    ];
    const stationSummaryTitle = !showStationTempDelta
        ? "Station and forecast are closely aligned."
        : metarTempDiff != null && metarTempDiff > 0
            ? "The station is running warmer than the forecast."
            : "The station is running cooler than the forecast.";
    const observedTempChartPoints: ObservedTempChartPoint[] = (metar?.history ?? [])
        .slice(-12)
        .map((entry, index, recentEntries) => {
            const reportTime = new Date(entry.reportTime);
            if (Number.isNaN(reportTime.getTime())) return null;

            const displayValue = distUnit === "mph"
                ? Math.round(entry.temp * 9 / 5 + 32)
                : Math.round(entry.temp);
            const shouldShowLabel = index === 0 || index === recentEntries.length - 1 || index % 3 === 0;

            return {
                value: displayValue,
                shortLabel: format(reportTime, "ha"),
                axisLabel: shouldShowLabel ? format(reportTime, "ha") : "",
                fullLabel: format(reportTime, "h:mm a"),
                isLatest: index === recentEntries.length - 1,
            };
        })
        .filter((entry): entry is ObservedTempChartPoint => entry !== null);
    const observedTempMin = observedTempChartPoints.length > 0
        ? Math.min(...observedTempChartPoints.map((point) => point.value))
        : null;
    const observedTempMax = observedTempChartPoints.length > 0
        ? Math.max(...observedTempChartPoints.map((point) => point.value))
        : null;
    const observedTempChartDomain: [number, number] = observedTempMin != null && observedTempMax != null
        ? [
            Math.floor(observedTempMin - 1),
            Math.ceil(observedTempMax + Math.max((observedTempMax - observedTempMin) * 0.12, 1)),
        ]
        : [0, 100];
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
    const feelsLikeDetail = feelsLike === currentTemp
        ? "Matches the air temp"
        : `${feelsLike > currentTemp ? "+" : ""}${feelsLike - currentTemp}° vs actual`;
    const conditionsHeroSummary = currentPrecipChanceLabel === "Low"
        ? `${currentCondition} right now with no immediate rain signal.`
        : `${currentCondition} right now with ${currentPrecipChanceLabel} precip potential in the mix.`;
    const dayRange = Math.max(dailyHigh - dailyLow, 1);
    const primaryConditionSignals = [
        {
            key: "feels-like",
            icon: <Thermometer className="text-orange-400" size={22} />,
            label: "Feels Like",
            aggregated: true,
            value: `${feelsLike}°`,
            detail: feelsLikeDetail,
            progress: clampPercentage(((feelsLike - dailyLow) / dayRange) * 100),
            stroke: "#fb923c",
            glow: "rgba(249, 115, 22, 0.36)",
            badgeClassName: "bg-orange-500/10",
            accentStyle: { background: "radial-gradient(circle at top left, rgba(249, 115, 22, 0.16), transparent 62%)" },
        },
        {
            key: "wind",
            icon: <Wind className="text-blue-300" size={22} />,
            label: "Wind",
            aggregated: true,
            value: formatWindSpeed(current.wind_speed_10m, weatherData.current_units.wind_speed_10m),
            detail: getWindLabel(current.wind_speed_10m),
            progress: clampPercentage((current.wind_speed_10m / 30) * 100),
            stroke: "#60a5fa",
            glow: "rgba(96, 165, 250, 0.34)",
            badgeClassName: "bg-blue-500/10",
            accentStyle: { background: "radial-gradient(circle at top left, rgba(96, 165, 250, 0.16), transparent 62%)" },
        },
        {
            key: "precip",
            icon: <Droplets className="text-blue-400" size={22} />,
            label: "Precip",
            aggregated: true,
            value: currentPrecipChanceLabel,
            detail: currentPrecipChanceLabel === "Low" ? "No rain signal" : "Showers possible",
            progress: clampPercentage(current.precipitation_probability),
            stroke: "#3b82f6",
            glow: "rgba(59, 130, 246, 0.34)",
            badgeClassName: "bg-blue-500/10",
            accentStyle: { background: "radial-gradient(circle at top left, rgba(59, 130, 246, 0.16), transparent 62%)" },
        },
    ];
    const visibilityInMiles = weatherData.current_units.visibility === "m"
        ? current.visibility / 1609.34
        : current.visibility / 5280;
    const currentUvIndex = current.is_day === 1 ? (current.uv_index ?? 0) : 0;
    const secondaryConditionSignals = [
        {
            key: "humidity",
            icon: <Droplets className="text-cyan-400" size={22} />,
            label: "Humidity",
            aggregated: true,
            value: formatStatPercent(current.relative_humidity_2m),
            detail: getHumidityLabel(current.relative_humidity_2m),
            badgeClassName: "bg-cyan-500/10",
            progress: clampPercentage(current.relative_humidity_2m),
            stroke: "#22d3ee",
            glow: "rgba(34, 211, 238, 0.3)",
            accentStyle: { background: "radial-gradient(circle at top left, rgba(34, 211, 238, 0.14), transparent 62%)" },
        },
        {
            key: "uv",
            icon: <SunDim className="text-yellow-400" size={22} />,
            label: "UV",
            aggregated: true,
            value: currentUvIndex.toFixed(1),
            detail: current.is_day === 1 ? getUvLabel(currentUvIndex) : "Nighttime",
            badgeClassName: "bg-yellow-500/10",
            progress: clampPercentage((currentUvIndex / 11) * 100),
            stroke: "#facc15",
            glow: "rgba(250, 204, 21, 0.28)",
            accentStyle: { background: "radial-gradient(circle at top left, rgba(250, 204, 21, 0.14), transparent 62%)" },
        },
        ...(aqiValue !== null && aqiLevel
            ? [{
                key: "air-quality",
                icon: <Gauge size={22} style={{ color: aqiTone?.accent ?? "#4ade80" }} />,
                label: "Air Quality",
                aggregated: false,
                value: aqiValue.toFixed(0),
                detail: `AQI ${aqiLevel.label}`,
                badgeClassName: "bg-emerald-500/10",
                progress: aqiProgress,
                stroke: aqiTone?.accent ?? "#4ade80",
                glow: aqiTone?.accentStrong ?? "rgba(16, 185, 129, 0.24)",
                accentStyle: {
                    background: `radial-gradient(circle at top left, ${aqiTone?.accentSoft ?? "rgba(74, 222, 128, 0.14)"}, transparent 62%)`,
                },
            }]
            : []),
        {
            key: "cloud-cover",
            icon: <Cloud className="text-slate-300" size={22} />,
            label: "Cloud Cover",
            aggregated: true,
            value: formatStatPercent(current.cloud_cover),
            detail: getCloudCoverLabel(current.cloud_cover),
            badgeClassName: "bg-slate-400/10",
            progress: clampPercentage(current.cloud_cover),
            stroke: "#94a3b8",
            glow: "rgba(148, 163, 184, 0.24)",
            accentStyle: { background: "radial-gradient(circle at top left, rgba(148, 163, 184, 0.12), transparent 62%)" },
        },
        {
            key: "visibility",
            icon: <Eye className="text-indigo-300" size={22} />,
            label: "Visibility",
            aggregated: true,
            value: formatVisibility(current.visibility, distUnit, weatherData.current_units.visibility),
            detail: getVisibilityLabel(current.visibility, weatherData.current_units.visibility),
            badgeClassName: "bg-indigo-500/10",
            progress: clampPercentage((visibilityInMiles / 10) * 100),
            stroke: "#818cf8",
            glow: "rgba(129, 140, 248, 0.28)",
            accentStyle: { background: "radial-gradient(circle at top left, rgba(129, 140, 248, 0.14), transparent 62%)" },
        },
    ];
    const allConditionSignals = [...primaryConditionSignals, ...secondaryConditionSignals];
    const stationNeedsAttention = showStationTempDelta && metarTempDiff != null && Math.abs(metarTempDiff) >= 3;
    const conditionsMetaPills = [
        {
            key: "local-time",
            value: `Updated ${localTimeLabel}`,
        },
        ...(aqiLevel
            ? [{
                key: "air-quality",
                value: `AQI ${aqiLevel.label}`,
            }]
            : []),
        ...(metarTempDisplay != null
            ? [{
                key: "station-status",
                value: stationNeedsAttention ? "Station off forecast" : "Station tracking well",
            }]
            : []),
    ];
    const conditionsShellStyle = isNightIcon
        ? {
            background: "radial-gradient(circle at top left, rgba(99, 102, 241, 0.18), transparent 34%), radial-gradient(circle at 88% 10%, rgba(56, 189, 248, 0.12), transparent 28%), linear-gradient(155deg, color-mix(in srgb, var(--surface-card-strong) 96%, transparent), color-mix(in srgb, #0f172a 44%, var(--surface-tile) 56%))",
        }
        : {
            background: "radial-gradient(circle at top left, rgba(251, 146, 60, 0.16), transparent 30%), radial-gradient(circle at 82% 12%, rgba(56, 189, 248, 0.12), transparent 24%), linear-gradient(155deg, color-mix(in srgb, var(--surface-card-strong) 96%, transparent), color-mix(in srgb, #172554 36%, var(--surface-tile) 64%))",
        };
    const conditionsHeroPanelStyle = isNightIcon
        ? {
            background: "radial-gradient(circle at 18% 18%, rgba(129, 140, 248, 0.2), transparent 22%), radial-gradient(circle at 84% 18%, rgba(56, 189, 248, 0.12), transparent 24%), linear-gradient(145deg, rgba(15, 23, 42, 0.88), rgba(24, 24, 66, 0.8))",
        }
        : {
            background: "radial-gradient(circle at 18% 18%, rgba(251, 146, 60, 0.18), transparent 24%), radial-gradient(circle at 84% 18%, rgba(56, 189, 248, 0.12), transparent 24%), linear-gradient(145deg, rgba(30, 41, 59, 0.84), rgba(24, 24, 66, 0.76))",
        };
    const hasConditionsExtras = Boolean((aqiValue !== null && aqiLevel) || hasPollenData || (metar && metarTempDisplay != null));
    const hasConfidencePill = Boolean(conf && forecastConfidence);
    const hasStationPill = metarTempDisplay != null;
    const hasMinutelyPill = Boolean(showMinutelyBanner && rainSummary);

    const toggleConfidenceDetail = () => {
        setShowConfidenceDetail((current) => {
            const next = !current;
            if (next) {
                setShowStationDetail(false);
                setShowMinutelyDetail(false);
            }
            return next;
        });
    };

    const toggleStationDetail = () => {
        setShowStationDetail((current) => {
            const next = !current;
            if (next) {
                setShowConfidenceDetail(false);
                setShowMinutelyDetail(false);
            }
            return next;
        });
    };

    const toggleMinutelyDetail = () => {
        setShowMinutelyDetail((current) => {
            const next = !current;
            if (next) {
                setShowConfidenceDetail(false);
                setShowStationDetail(false);
            }
            return next;
        });
    };


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
    const tenDayForecast: DailyOutlookDay[] = weatherData.daily.time.slice(0, 10).map((timeString: string, index: number) => {
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
    const hasExtendedTenDayOutlook = tenDayForecast.length > 5;
    const primaryTenDayForecast = hasExtendedTenDayOutlook ? tenDayForecast.slice(0, 5) : tenDayForecast;
    const extendedTenDayForecast = hasExtendedTenDayOutlook ? tenDayForecast.slice(5) : [];
    const toggleDetailSection = (section: DetailSectionId) => {
        setOpenDetailSections((current) => ({
            ...current,
            [section]: !current[section],
        }));
    };
    const renderTenDayForecastRow = (
        day: DailyOutlookDay,
        options?: {
            animatedIndex?: number;
            isFirstRow?: boolean;
            isLastRow?: boolean;
            showDivider?: boolean;
        }
    ) => {
        const { animatedIndex, isFirstRow = false, isLastRow = false, showDivider = false } = options ?? {};
        const displayDayCode = !day.showRainChance && isLiquidPrecipitationCode(day.dayCode)
            ? 3
            : day.dayCode;
        const dIconName = getWeatherIconFromCode(displayDayCode, 1);
        const dailyIconConfig = IconMap[dIconName] || IconMap.cloud;
        const DIcon = dailyIconConfig.icon;
        const conditionLabel = getWeatherDescriptionFromCode(displayDayCode, 1);
        const offset = ((day.dayLow - tenDayMin) / tenDaySpread) * 100;
        const width = Math.max(((day.dayHigh - day.dayLow) / tenDaySpread) * 100, 10);
        const roundedPrecipProbability = Math.round(day.dayPrecipProbability);
        const rowStyle = animatedIndex == null
            ? undefined
            : { animationDelay: `${animatedIndex * 55}ms` } satisfies CSSProperties;
        const rowPaddingClass = `${isFirstRow ? "pt-1" : "pt-3"} ${isLastRow ? "pb-1" : "pb-3"}`;

        return (
            <div
                key={day.key}
                className={`grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(132px,1fr)] items-center gap-3 sm:grid-cols-[minmax(88px,0.85fr)_minmax(0,1.15fr)_minmax(170px,1fr)] sm:gap-4 ${rowPaddingClass} ${showDivider ? "border-t border-[color:var(--border-soft)]" : ""} ${animatedIndex == null ? "" : "forecast-outlook-row-enter"}`}
                style={rowStyle}
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
                        <section className="conditions-collection-shell">
                            <div className="conditions-collection-shell-bg" style={conditionsShellStyle} />
                            <div className="conditions-collection-header">
                                <div className="min-w-0">
                                    <div className="conditions-collection-kicker">Right Now</div>
                                    <h3 className="conditions-collection-title">Forecast, comfort, and real-world readings.</h3>
                                    <p className="conditions-collection-lead">{conditionsHeroSummary}</p>
                                </div>
                                <div className="conditions-meta-row">
                                    {conditionsMetaPills.map((pill) => (
                                        <span key={pill.key} className="conditions-meta-pill">
                                            {pill.value}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="conditions-overview-grid">
                                <div className="conditions-hero-panel" style={conditionsHeroPanelStyle}>
                                    <div className="conditions-hero-main">
                                        <div className={`conditions-hero-icon ${iconBadgeClass}`} style={iconBadgeStyle}>
                                            <IconComponent
                                                size={iconSize}
                                                strokeWidth={iconConfig.strokeWidth ?? 1.9}
                                                className={iconConfig.className}
                                            />
                                        </div>

                                        <div className="min-w-0">
                                            <div className="conditions-hero-reading">
                                                <p className="conditions-hero-temp">{currentTemp}&deg;</p>
                                                <p className="conditions-hero-caption">Actual temperature</p>
                                            </div>
                                            <div className="conditions-status-row">
                                                <span className="conditions-status-pill">{currentCondition}</span>
                                                <span className="conditions-status-pill">High {dailyHigh}&deg;</span>
                                                <span className="conditions-status-pill">Low {dailyLow}&deg;</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="conditions-ring-grid">
                                        {allConditionSignals.map((stat, index) => (
                                            <ConditionRingMetric
                                                key={stat.key}
                                                icon={stat.icon}
                                                label={stat.label}
                                                value={stat.value}
                                                detail={stat.detail}
                                                aggregated={stat.aggregated}
                                                progress={stat.progress}
                                                stroke={stat.stroke}
                                                glow={stat.glow}
                                                badgeClassName={stat.badgeClassName}
                                                accentStyle={stat.accentStyle}
                                                animationDelayMs={index * 40}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {hasConditionsExtras ? (
                                <div className="conditions-support-grid">
                                    {aqiValue !== null && aqiLevel && (
                                        <div
                                            className="conditions-support-card"
                                            style={{
                                                background: aqiTone
                                                    ? `radial-gradient(circle at top right, ${aqiTone.accentSoft}, transparent 38%), linear-gradient(180deg, color-mix(in srgb, var(--surface-tile) 97%, transparent), color-mix(in srgb, var(--surface-card-strong) 92%, transparent))`
                                                    : undefined,
                                            }}
                                        >
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="inline-flex items-center gap-2">
                                                            <Gauge size={15} style={{ color: aqiTone?.accent }} />
                                                            <span className="theme-section-label text-[11px] font-bold">Air Quality</span>
                                                        </div>
                                                        <p className="theme-heading mt-2 text-xl font-semibold">AQI {aqiValue} · {aqiLevel.label}</p>
                                                        <p className="theme-muted mt-2 text-sm leading-6">
                                                            {resolvedAirQualitySummary || airQualitySummary}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className="rounded-full px-3 py-1 text-xs font-bold"
                                                        style={{
                                                            background: aqiTone?.accentSoft,
                                                            color: aqiTone?.accent ?? "var(--text-primary)",
                                                        }}
                                                    >
                                                        Updated {localTimeLabel}
                                                    </span>
                                                </div>

                                                <div className="conditions-support-meter">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="theme-muted text-xs font-semibold">AQI scale</span>
                                                        <span className="theme-muted text-xs font-medium">{aqiValue} / 300+</span>
                                                    </div>
                                                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/8">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${aqiProgress}%`,
                                                                background: aqiTone?.fill,
                                                                boxShadow: aqiTone?.glow,
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="theme-subtle mt-2 flex justify-between text-[10px] font-medium">
                                                        {aqiScaleStops.map((stop) => (
                                                            <span key={stop}>{stop}</span>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="theme-muted text-xs">
                                                        Expand for the pollutant breakdown.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAirQualityDetail((currentOpen) => !currentOpen)}
                                                        className="surface-chip inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all hover-border-strong-var hover-bg-surface-elevated-var"
                                                    >
                                                        <span>{showAirQualityDetail ? "Hide details" : "Show details"}</span>
                                                        <ChevronDown
                                                            className={`h-4 w-4 transition-transform ${showAirQualityDetail ? "rotate-180" : ""}`}
                                                        />
                                                    </button>
                                                </div>

                                                <CollapsiblePanel open={showAirQualityDetail} className="w-full" innerClassName="pt-3">
                                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                                        {airQualityMetrics.map((metric) => (
                                                            <div
                                                                key={metric.label}
                                                                className="surface-tile-strong rounded-[20px] p-3 text-left"
                                                            >
                                                                <p className="theme-section-label text-[10px] font-bold">{metric.label}</p>
                                                                <p className="theme-heading mt-2 text-xl font-semibold leading-none">{metric.value}</p>
                                                                <p className="theme-muted mt-2 text-[11px] leading-5">{metric.detail}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CollapsiblePanel>
                                            </div>
                                        </div>
                                    )}

                                    {hasPollenData && (
                                        <div className="conditions-support-card">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <span className="theme-section-label text-[11px] font-bold">Pollen</span>
                                                    <p className="theme-heading mt-2 text-lg font-semibold">Seasonal snapshot</p>
                                                </div>
                                                <Leaf className="text-emerald-300" size={18} />
                                            </div>
                                            <div className="mt-4 grid grid-cols-3 gap-3">
                                                {pollenMetrics.map((metric) => (
                                                    <div key={metric.key} className="conditions-pollen-chip">
                                                        <Leaf className={metric.iconClassName} size={16} />
                                                        <span className="theme-section-label text-[10px] font-bold">{metric.label}</span>
                                                        <span className="theme-heading text-lg font-semibold">{metric.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {metar && metarTempDisplay != null && (
                                        <div
                                            className="conditions-support-card"
                                            style={{
                                                background: "radial-gradient(circle at top right, rgba(99, 102, 241, 0.12), transparent 38%), linear-gradient(180deg, color-mix(in srgb, var(--surface-tile) 97%, transparent), color-mix(in srgb, var(--surface-card-strong) 92%, transparent))",
                                            }}
                                        >
                                            <div className="flex flex-col gap-4">
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10">
                                                                <Radio className="text-indigo-300" size={18} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="theme-section-label text-[11px] font-bold">Observed Conditions</span>
                                                                <p className="theme-heading truncate text-lg font-semibold">{stationName}</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <span className="surface-chip rounded-full px-3 py-1 text-xs font-semibold">{stationIcaoId}</span>
                                                            {stationDistanceDisplay ? (
                                                                <span className="surface-chip rounded-full px-3 py-1 text-xs font-semibold">
                                                                    <span className="inline-flex items-center gap-1.5">
                                                                        <MapPin size={12} />
                                                                        {stationDistanceDisplay}
                                                                    </span>
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <p className="theme-muted mt-3 text-sm leading-6">{stationSummaryTitle}</p>
                                                    </div>

                                                    <div className="conditions-station-reading">
                                                        <p className="theme-section-label text-[10px] font-bold">Observed Temp</p>
                                                        <p className="theme-heading mt-2 text-[44px] font-bold leading-[0.9] tracking-tight">
                                                            {metarTempDisplay}&deg;
                                                        </p>
                                                        {showStationTempDelta && metarTempDiff != null ? (
                                                            <div
                                                                className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
                                                                style={{
                                                                    background: metarTempDiff > 0 ? "rgba(249, 115, 22, 0.12)" : "rgba(59, 130, 246, 0.12)",
                                                                    borderColor: metarTempDiff > 0 ? "rgba(249, 115, 22, 0.22)" : "rgba(59, 130, 246, 0.22)",
                                                                    color: metarTempDiff > 0 ? "#fb923c" : "#60a5fa",
                                                                }}
                                                            >
                                                                {metarTempDiff > 0
                                                                    ? <TrendingUp size={12} />
                                                                    : metarTempDiff < 0
                                                                        ? <TrendingDown size={12} />
                                                                        : <Minus size={12} />
                                                                }
                                                                {metarTempDiff > 0 ? "+" : ""}{metarTempDiff}° vs forecast
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                {observedTempChartPoints.length >= 2 ? (
                                                    <div
                                                        className="overflow-hidden rounded-[18px] border border-white/6 px-3 py-2"
                                                        style={{
                                                            background: "linear-gradient(180deg, color-mix(in srgb, #818cf8 8%, transparent), color-mix(in srgb, #818cf8 2%, transparent))",
                                                        }}
                                                    >
                                                        <div className="mb-1 flex items-center justify-between">
                                                            <span className="theme-muted text-[10px] font-bold uppercase tracking-[0.16em]">
                                                                Past 12 Hours
                                                            </span>
                                                            <span className="theme-subtle text-[10px] font-medium">
                                                                Aviation Weather
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between px-1">
                                                            <span className="text-[11px] font-bold text-indigo-200/90">Low {observedTempMin}&deg;</span>
                                                            <span className="text-[11px] font-bold text-indigo-200/75">High {observedTempMax}&deg;</span>
                                                        </div>
                                                        <div className="mt-1 h-[92px] w-full">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <AreaChart
                                                                    data={observedTempChartPoints}
                                                                    margin={{ top: 8, right: 10, left: 0, bottom: -2 }}
                                                                >
                                                                    <defs>
                                                                        <linearGradient id="observed-temp-history" x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.32} />
                                                                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0.02} />
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <CartesianGrid
                                                                        vertical={false}
                                                                        stroke="var(--border-soft)"
                                                                        strokeDasharray="4 7"
                                                                        opacity={0.22}
                                                                    />
                                                                    <XAxis
                                                                        dataKey="shortLabel"
                                                                        axisLine={false}
                                                                        tickLine={false}
                                                                        tickMargin={6}
                                                                        minTickGap={20}
                                                                        tickFormatter={(_value: string, index: number) => observedTempChartPoints[index]?.axisLabel ?? ""}
                                                                        tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 700 }}
                                                                    />
                                                                    <YAxis
                                                                        yAxisId={0}
                                                                        hide={true}
                                                                        domain={observedTempChartDomain}
                                                                    />
                                                                    <Tooltip
                                                                        cursor={{ stroke: "var(--border-soft)", strokeWidth: 1, strokeDasharray: "4 6" }}
                                                                        content={<ObservedTempTooltip />}
                                                                    />
                                                                    <Area
                                                                        type="monotone"
                                                                        dataKey="value"
                                                                        yAxisId={0}
                                                                        baseValue={observedTempChartDomain[0]}
                                                                        stroke="#8b93ff"
                                                                        strokeWidth={2.5}
                                                                        fill="url(#observed-temp-history)"
                                                                        fillOpacity={1}
                                                                        dot={({ cx, cy, payload }) => {
                                                                            if (!payload?.isLatest || cx == null || cy == null) return <></>;

                                                                            return (
                                                                                <circle
                                                                                    cx={cx}
                                                                                    cy={cy}
                                                                                    r={4}
                                                                                    fill="#8b93ff"
                                                                                    stroke="var(--surface-card-strong)"
                                                                                    strokeWidth={2}
                                                                                />
                                                                            );
                                                                        }}
                                                                        activeDot={{
                                                                            r: 4,
                                                                            strokeWidth: 2,
                                                                            stroke: "var(--surface-card-strong)",
                                                                            fill: "#8b93ff",
                                                                        }}
                                                                        isAnimationActive={true}
                                                                        animationBegin={70}
                                                                        animationDuration={420}
                                                                        animationEasing="ease-out"
                                                                    />
                                                                </AreaChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                <div className="grid grid-cols-2 gap-3">
                                                    {observedMetrics.map((metric) => (
                                                        <div
                                                            key={metric.label}
                                                            className="surface-tile-strong rounded-[20px] p-3 text-left"
                                                        >
                                                            <p className="theme-section-label text-[10px] font-bold">{metric.label}</p>
                                                            <p className="theme-heading mt-2 text-lg font-semibold leading-tight">{metric.value}</p>
                                                            <p className="theme-muted mt-2 text-[11px] leading-5">{metric.detail}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </section>
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
                                            <MetricLabel aggregated={Boolean(forecastConfidence)}>24h Range</MetricLabel>
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
                                <Next24HoursChart points={next24HourlyPoints} />
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
                                <div className="flex flex-col">
                                    {primaryTenDayForecast.map((day, index) => renderTenDayForecastRow(day, {
                                        isFirstRow: index === 0,
                                        isLastRow: !showFullTenDayOutlook && !hasExtendedTenDayOutlook && index === primaryTenDayForecast.length - 1,
                                        showDivider: index > 0,
                                    }))}
                                </div>
                                {hasExtendedTenDayOutlook ? (
                                    <CollapsiblePanel open={showFullTenDayOutlook} className="forecast-outlook-expanded-shell">
                                        <div className="flex flex-col">
                                            {extendedTenDayForecast.map((day, index) => renderTenDayForecastRow(day, {
                                                animatedIndex: index,
                                                isLastRow: index === extendedTenDayForecast.length - 1,
                                                showDivider: true,
                                            }))}
                                        </div>
                                    </CollapsiblePanel>
                                ) : null}
                                {hasExtendedTenDayOutlook ? (
                                    <div className="border-soft-var mt-2 border-t pt-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowFullTenDayOutlook((current) => !current)}
                                            className="surface-chip-muted inline-flex w-full items-center justify-center gap-2 rounded-[18px] px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-all hover-border-strong-var hover-bg-surface-elevated-var"
                                        >
                                            <span>{showFullTenDayOutlook ? "Show Fewer Days" : "Show 5 More Days"}</span>
                                            <ChevronDown className={`h-4 w-4 transition-transform ${showFullTenDayOutlook ? "rotate-180" : ""}`} />
                                        </button>
                                    </div>
                                ) : null}
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
                                    {historicalRangeItems.length > 1 && historicalChartMin != null && historicalChartMax != null && (
                                        <div className="surface-tile-strong rounded-[22px] p-3 sm:p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="theme-heading text-sm font-semibold">Temperature range</p>
                                                    <p className="theme-muted text-xs">Compare today&apos;s forecast range with last year and the recent average for this date.</p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="theme-subtle text-[10px] font-bold uppercase tracking-[0.14em]">Same scale</p>
                                                    <p className="theme-subtle text-[11px] font-semibold">
                                                        {historicalChartMin}&deg; to {historicalChartMax}&deg;
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex flex-col gap-3">
                                                {historicalRangeItems.map((item) => {
                                                    const offset = ((item.low - historicalChartMin) / historicalChartRange) * 100;
                                                    const width = ((item.high - item.low) / historicalChartRange) * 100;

                                                    return (
                                                        <div key={item.key} className="surface-tile rounded-[20px] px-3 py-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="theme-heading text-sm font-semibold">{item.label}</p>
                                                                    <p className="theme-muted text-[11px]">{item.subLabel}</p>
                                                                </div>
                                                                <div className="shrink-0 text-right">
                                                                    <p className="theme-heading text-sm font-semibold">
                                                                        {item.low}&deg; to {item.high}&deg;
                                                                    </p>
                                                                    {item.comparisonText ? (
                                                                        <p className={`text-[11px] font-bold ${item.comparisonToneClass ?? "theme-subtle"}`}>
                                                                            {item.comparisonText}
                                                                        </p>
                                                                    ) : (
                                                                        <p className="theme-subtle text-[11px] font-semibold">Reference line</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 flex items-center gap-3">
                                                                <span className="theme-muted w-9 shrink-0 text-right text-xs font-semibold">
                                                                    {item.low}&deg;
                                                                </span>
                                                                <div
                                                                    className="relative h-3 flex-1 rounded-full"
                                                                    style={{ background: "color-mix(in srgb, var(--surface-elevated) 82%, transparent)" }}
                                                                >
                                                                    <div
                                                                        className={`absolute top-0 h-3 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.14)_inset] ${item.accentClass}`}
                                                                        style={{
                                                                            left: `${offset}%`,
                                                                            width: `${Math.min(width, 100 - offset)}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="theme-heading w-9 shrink-0 text-xs font-bold">
                                                                    {item.high}&deg;
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {riverDischarge !== null && (
                                        <>
                                            <div className="theme-divider border-t" />
                                            <div className="surface-tile-strong rounded-[22px] p-3 sm:p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Waves className="text-blue-700" size={14} />
                                                            <span className="theme-section-label text-xs font-bold">River Discharge</span>
                                                        </div>
                                                        <p className="theme-muted mt-2 text-xs">
                                                            {hasRiverBandSpread
                                                                ? "Hydrology model spread for today."
                                                                : "Hydrology guidance is essentially steady through the day."}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <p className="theme-subtle text-[10px] font-bold uppercase tracking-[0.14em]">Estimated flow</p>
                                                        <p className="theme-heading text-lg font-bold">{riverDischarge.toFixed(1)} m&sup3;/s</p>
                                                    </div>
                                                </div>
                                                {(riverDischargeMin !== null || riverDischargeMean !== null || riverDischargeMax !== null) && hasRiverBandSpread && (
                                                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                                                        <div className="surface-tile rounded-xl p-2">
                                                        <p className="theme-section-label text-[10px] font-bold">Low</p>
                                                        <p className="font-semibold text-sm">{riverDischargeMin?.toFixed(1) ?? "—"}</p>
                                                    </div>
                                                        <div className="surface-tile rounded-xl p-2">
                                                        <p className="theme-section-label text-[10px] font-bold">Typical</p>
                                                        <p className="font-semibold text-sm">{riverDischargeMean?.toFixed(1) ?? "—"}</p>
                                                    </div>
                                                        <div className="surface-tile rounded-xl p-2">
                                                        <p className="theme-section-label text-[10px] font-bold">High</p>
                                                        <p className="font-semibold text-sm">{riverDischargeMax?.toFixed(1) ?? "—"}</p>
                                                    </div>
                                                    </div>
                                                )}
                                            </div>
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

                            <div className="mt-4 flex w-full flex-col items-center gap-3 sm:mt-5 sm:flex-row sm:items-center sm:justify-center sm:gap-5">
                                <div className="weather-hero-icon-shell">
                                    <div className={`weather-hero-icon-core flex h-20 w-20 items-center justify-center rounded-full sm:h-[5.5rem] sm:w-[5.5rem] ${iconBadgeClass}`} style={iconBadgeStyle}>
                                        <IconComponent
                                            size={iconSize}
                                            strokeWidth={iconConfig.strokeWidth ?? 1.75}
                                            className={iconConfig.className}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-1.5 sm:items-start sm:text-left">
                                    <span className="weather-hero-temperature theme-heading flex items-start justify-center gap-1 font-bold tracking-tight">
                                        <span>{displayTemp}</span>
                                        <span className="weather-hero-degree">&deg;</span>
                                    </span>
                                    {forecastConfidence ? (
                                        <AggregatedMetricBadge title="Main temperature is blended from multiple forecast models." />
                                    ) : null}
                                    <span
                                        className="weather-hero-location theme-heading max-w-[16rem] capitalize sm:max-w-none"
                                        title={locationName || "Current Location"}
                                    >
                                        {primaryLocationName}
                                    </span>
                                    {secondaryLocationName ? (
                                        <span className="weather-hero-subtitle theme-muted max-w-[18rem] text-center font-semibold leading-snug sm:max-w-none sm:text-left">
                                            {secondaryLocationName}
                                        </span>
                                    ) : null}
                                    <span className="theme-heading mt-1 text-sm font-bold tracking-wide">
                                        H: {dailyHigh}&deg; L: {dailyLow}&deg;
                                    </span>
                                </div>
                            </div>

                            {heroSummary ? (
                                <p className="weather-hero-summary theme-muted mt-4 max-w-[34ch] text-center text-sm font-medium leading-relaxed sm:mt-3 sm:max-w-[42ch] sm:text-[15px]">
                                    {heroSummary}
                                </p>
                            ) : null}

                            {(hasConfidencePill || hasStationPill || hasMinutelyPill) && (
                                <div className="mt-4 flex w-full flex-col gap-2">
                                    {(hasConfidencePill || hasStationPill) && (
                                        <div className="grid w-full grid-cols-2 items-start gap-2">
                                            {conf && forecastConfidence && (
                                                <div className={`${insightPillClass} ${showConfidenceDetail ? insightPillOpenClass : ""}`}>
                                                    <button
                                                        type="button"
                                                        onClick={toggleConfidenceDetail}
                                                        className="w-full text-left"
                                                    >
                                                        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-stretch gap-3 text-left">
                                                            <div className="min-w-0">
                                                                <p className="theme-section-label text-[10px] font-bold tracking-[0.18em] uppercase">Models</p>
                                                                <div className="mt-2 grid grid-cols-[18px_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1">
                                                                    <Sparkles className="mt-0.5 text-amber-400" size={16} />
                                                                    <span className="theme-heading block truncate text-[15px] font-semibold leading-[1.2]">
                                                                        {confidenceSummaryLabel ?? "Forecast spread"}
                                                                    </span>
                                                                    <p className="theme-subtle col-start-2 text-[13px] leading-[1.25]">
                                                                        {confidenceAggregatedTemp}&deg; &plusmn;{forecastConfidence.spread}&deg;
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-center pt-5">
                                                                <ChevronDown className={`theme-subtle h-4 w-4 shrink-0 transition-transform ${showConfidenceDetail ? "rotate-180" : ""}`} />
                                                            </div>
                                                        </div>
                                                    </button>
                                                    <CollapsiblePanel open={Boolean(conf && forecastConfidence && showConfidenceDetail)} className="mt-3 w-full">
                                                        <div className="border-soft-var border-t pt-3">
                                                            <div className="border-soft-var border-b pb-3">
                                                                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                                                                    <div className="min-w-0">
                                                                        <div className="flex min-w-0 items-center gap-2">
                                                                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${confidenceDotClass}`} />
                                                                            <span className="theme-heading min-w-0 text-sm font-semibold">
                                                                                Consensus
                                                                            </span>
                                                                        </div>
                                                                        <p className="theme-muted mt-1.5 text-xs leading-[1.35]">
                                                                            Blended from {confidenceModelEntries.length} forecast models.
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="theme-heading shrink-0 text-xl font-bold leading-none">{confidenceAggregatedTemp}&deg;</p>
                                                                        <p className="theme-subtle mt-1 text-xs font-medium">
                                                                            &plusmn;{forecastConfidence.spread}&deg; spread
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="mt-3">
                                                                <div className="mb-2 flex items-center justify-between px-1">
                                                                    <p className="theme-section-label text-[10px] font-bold tracking-[0.18em] uppercase">Model Forecasts</p>
                                                                    <p className="theme-muted text-[10px] font-bold uppercase tracking-[0.14em]">Forecast</p>
                                                                </div>
                                                                <div className="flex flex-col divide-y divide-[color:var(--border-soft)]">
                                                                    {confidenceModelEntries.map(({ name, temp }) => (
                                                                        <div key={name} className="flex items-center justify-between gap-3 py-2.5">
                                                                            <span className="theme-heading text-sm font-semibold">{name}</span>
                                                                            <span className="surface-chip rounded-full px-2.5 py-1 text-xs font-bold">
                                                                                {temp}&deg;
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CollapsiblePanel>
                                                </div>
                                            )}
                                            {metarTempDisplay != null && (
                                                <div className={`${insightPillClass} ${showStationDetail ? insightPillOpenClass : ""} ${stationNeedsAttention ? "border-orange-300/70 bg-[linear-gradient(135deg,rgba(251,146,60,0.16),rgba(255,255,255,0.08))]" : ""}`}>
                                                    <button
                                                        type="button"
                                                        onClick={toggleStationDetail}
                                                        className="w-full text-left"
                                                    >
                                                        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-stretch gap-3 text-left">
                                                            <div className="min-w-0">
                                                                <p className="theme-section-label text-[10px] font-bold tracking-[0.18em] uppercase">Station</p>
                                                                <div className="mt-2 grid grid-cols-[18px_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1">
                                                                    <Radio className="mt-0.5 text-sky-400" size={16} />
                                                                    <span className="theme-heading block truncate text-[15px] font-semibold leading-[1.2]">
                                                                        {metarTempDisplay}&deg; observed
                                                                    </span>
                                                                    <p className="theme-subtle col-start-2 text-[13px] leading-[1.25]">
                                                                        {showStationTempDelta && metarTempDiff != null
                                                                            ? `${metarTempDiff > 0 ? "+" : ""}${metarTempDiff}° vs main temp`
                                                                            : stationDistanceDisplay ?? stationIcaoId}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-center pt-5">
                                                                <ChevronDown className={`theme-subtle h-4 w-4 shrink-0 transition-transform ${showStationDetail ? "rotate-180" : ""}`} />
                                                            </div>
                                                        </div>
                                                    </button>
                                                    <CollapsiblePanel open={Boolean(metar && metarTempDisplay != null && showStationDetail)} className="mt-3 w-full">
                                                        <div className="border-soft-var border-t pt-3 text-left">
                                                            <div className="mb-3 flex items-start justify-between gap-3">
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
                                                                <div className="bg-surface-tile-var rounded-xl px-3 py-2.5">
                                                                    <p className="theme-section-label text-[10px] font-bold">Wind</p>
                                                                    <p className="theme-heading text-sm font-semibold">
                                                                        {stationWind}
                                                                    </p>
                                                                </div>
                                                                <div className="bg-surface-tile-var rounded-xl px-3 py-2.5">
                                                                    <p className="theme-section-label text-[10px] font-bold">Visibility</p>
                                                                    <p className="theme-heading text-sm font-semibold">{stationVisibility}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CollapsiblePanel>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {showMinutelyBanner && rainSummary && (
                                        <div className={`${insightPillClass} ${showMinutelyDetail ? insightPillOpenClass : ""} ${minutelyPillToneClass}`}>
                                            <button
                                                type="button"
                                                onClick={toggleMinutelyDetail}
                                                className="w-full text-left"
                                            >
                                                <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-stretch gap-3 text-left">
                                                    <div className="min-w-0">
                                                        <p className="theme-section-label text-[10px] font-bold tracking-[0.18em] uppercase">Next-Hour Trend</p>
                                                        <div className="mt-2 grid grid-cols-[18px_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1">
                                                            <CloudRain className={`${minutelyIconClass} mt-0.5`} size={16} />
                                                            <span className="theme-heading block truncate text-[15px] font-semibold leading-[1.2]">
                                                                {minutelyStatusLabel}
                                                            </span>
                                                            <p className="theme-subtle col-start-2 text-[13px] leading-[1.25]">
                                                                {rainSummary.isRaining ? minutelySummaryText : "Next-hour rain trend in 5-minute steps"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-center pt-5">
                                                        <ChevronDown className={`theme-subtle h-4 w-4 shrink-0 transition-transform ${showMinutelyDetail ? "rotate-180" : ""}`} />
                                                    </div>
                                                </div>
                                            </button>
                                            <CollapsiblePanel open={Boolean(showMinutelyBanner && rainSummary && showMinutelyDetail)} className="mt-3 w-full">
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
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Personality + AI advice */}
                    <div className="personality-card-shell personality-card-bg border-strong-var shadow-soft-var relative isolate overflow-hidden rounded-[28px] border">
                        <div className="bg-accent-soft-var pointer-events-none absolute -left-10 top-4 h-32 w-32 rounded-full blur-3xl opacity-70" />
                        <div className="pointer-events-none absolute -right-6 top-1/3 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
                        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        <div className="relative px-5 py-4 sm:px-8 sm:py-6">
                            <div className="flex flex-col gap-4 sm:gap-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="border-accent-var bg-accent-soft-var text-accent-var shadow-soft-var flex h-11 w-11 shrink-0 items-center justify-center rounded-[20px] border">
                                            <PersonalityIcon size={18} />
                                        </div>
                                        <p className="theme-section-label text-[11px] font-bold tracking-[0.22em]">Forecast Voice</p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <span className="border-accent-var bg-accent-soft-var text-accent-var rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                                            Active
                                        </span>
                                        {selectedPersonality.isCustom ? (
                                            <span className="surface-chip rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                                                Custom
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="surface-tile-strong shadow-soft-var relative overflow-hidden rounded-[26px] border border-soft-var px-4 py-4 sm:px-5 sm:py-4">
                                    <div className="bg-accent-soft-var pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full blur-3xl opacity-75" />

                                    <div className="relative flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <h2 className="theme-heading truncate pb-1 text-[clamp(1.9rem,7vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.03em]">
                                                {selectedPersonality.label}
                                            </h2>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setIsVoiceMenuOpen((currentValue) => !currentValue)}
                                            className="surface-chip shadow-soft-var inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold transition-all hover:-translate-y-0.5 hover-border-accent-var hover-text-accent-var sm:text-sm"
                                            aria-expanded={isVoiceMenuOpen}
                                        >
                                            Change
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

                                <div className="theme-divider border-t pt-4 sm:pt-5">
                                    <div className="surface-tile-strong shadow-soft-var relative overflow-hidden rounded-[26px] border border-soft-var px-5 py-5 transition-all hover:-translate-y-0.5 sm:px-6 sm:py-5">
                                        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-400/8 blur-3xl" />

                                        <div className="relative">
                                            <p className="theme-subtle mb-3 text-[11px] font-bold uppercase tracking-[0.22em]">Current Read</p>

                                            <p className="theme-heading max-w-none text-left text-[1.08rem] font-medium leading-[1.72] tracking-[-0.015em] sm:text-[1.15rem] lg:text-[1.2rem]">
                                                {resolvedAdvice}
                                            </p>
                                        </div>
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
