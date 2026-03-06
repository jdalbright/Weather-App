import { useState } from "react";
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
    getMoonPhaseEmoji,
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
import VoiceSettingsMenu from "@/components/VoiceSettingsMenu";
import {
    Thermometer,
    Wind,
    Droplets,
    Sun,
    Moon,
    Sunset,
    Sunrise,
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
const forecastTileClass = "surface-tile flex min-w-[70px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl p-3";
const forecastDayTileClass = "surface-tile flex min-w-[80px] shrink-0 snap-start flex-col items-center justify-between gap-1 rounded-2xl p-3 h-[120px]";
const heroCardClass = "weather-card-hero surface-card-strong relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-8 sm:py-10";
const insightGridClass = "weather-card-insight-grid mt-3 grid w-full max-w-[26rem] grid-cols-2 gap-2 sm:max-w-none sm:grid-cols-3 sm:gap-3";
const insightPillClass = "weather-card-insight-pill flex min-h-[76px] w-full min-w-0 items-center justify-between gap-2 sm:gap-3 rounded-[24px] border border-[color:var(--border-soft)] bg-[var(--surface-chip)] text-[var(--text-secondary)] px-3 sm:px-4 py-3.5 text-left transition-all active:opacity-70 hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-soft)]";
const insightPillOpenClass = "border-[color:var(--accent-border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-soft)]";
const sectionAccordionButtonClass = "surface-tile flex min-h-[56px] w-full items-center justify-between gap-3 rounded-[24px] px-4 py-3 text-left transition-all hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-elevated)]";
const MIN_FORECAST_CHANCE_TO_SHOW = 15;
type DetailSectionId = "forecast" | "conditions" | "extras";
type SourceSectionId = "hero" | "alerts" | "conditions" | "forecast" | "extras";

function shouldShowForecastChance(probability: number | null | undefined): probability is number {
    return probability != null && probability >= MIN_FORECAST_CHANCE_TO_SHOW;
}

function formatCurrentPrecipChance(probability: number): string {
    if (probability < MIN_FORECAST_CHANCE_TO_SHOW) return "Low";
    return `${probability}%`;
}

type WeatherCardProps = {
    locationName: string,
    weatherData: WeatherData | null,
    isDetailed: boolean,
    onToggleDetail: () => void,
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
        ? "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_rgba(255,255,255,0.02)_40%),linear-gradient(160deg,_#0f172a,_#1e3a5f_55%,_#312e81)] shadow-[0_16px_36px_rgba(15,23,42,0.28)] ring-1 ring-white/20"
        : "bg-[radial-gradient(circle_at_top,_#ffffff,_#f8fafc_55%,_#e2e8f0)] shadow-[0_10px_22px_rgba(148,163,184,0.25)] ring-1 ring-white/70";
    const iconSize = isNightIcon ? 88 : 84;
    const PersonalityIcon = PersonalityIconMap[selectedPersonality.icon];

    const dailyHigh = Math.round(weatherData.daily.temperature_2m_max[0]);
    const dailyLow = Math.round(weatherData.daily.temperature_2m_min[0]);
    const currentCondition = getWeatherDescriptionFromCode(current.weather_code);
    const localTimestamp = getLocalTimeForOffset(weatherData.utc_offset_seconds);
    const localTimeLabel = format(localTimestamp, "h:mm a");
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

    // Forecast confidence styling
    const confidenceStyle = {
        High: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50", label: "Models agree" },
        Moderate: { dot: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50", label: "Some uncertainty" },
        Uncertain: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", label: "Models disagree" },
    };
    const conf = forecastConfidence ? confidenceStyle[forecastConfidence.label] : null;
    const confidenceDotClass = conf?.dot ?? "bg-[color:var(--border-contrast)]";
    const confidenceAggregatedTemp = currentTemp;
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
        : "surface-tile text-[var(--text-secondary)]";
    const minutelyIconClass = rainSummary?.isRaining ? "text-blue-500" : "text-[var(--text-muted)]";
    const minutelyBadgeClass = rainSummary?.isRaining
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "surface-chip";
    const minutelyPillToneClass = rainSummary?.isRaining
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-[color:var(--border-soft)] bg-[var(--surface-chip)] text-[var(--text-secondary)]";
    const minutelyStatusLabel = rainSummary?.isRaining ? "Rain signal" : "No rain signal";
    const minutelyWindowLabel = "Next-hour trend";
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
            role: "US AQI · PM2.5 · PM10 · Ozone · Pollen counts",
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
            role: "River discharge levels",
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
            name: astronomy ? "WeatherAPI Astronomy" : "WeatherAPI Alerts",
            role: astronomy
                ? "Moon phase · Moonrise/set · Illumination"
                : "Severe weather alerts",
            active: !!astronomy || (weatherAlerts?.length ?? 0) > 0,
            sections: [
                ...(astronomy ? (["extras"] as SourceSectionId[]) : []),
                ...((weatherAlerts?.length ?? 0) > 0 ? (["alerts"] as SourceSectionId[]) : []),
            ],
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
                                    <span className="theme-section-label text-xs font-bold">Feels Like</span>
                                    <span className={statValueClass}>{feelsLike}&deg;</span>
                                </div>
                            </div>
                            <div className={statTileClass}>
                                <Wind className="text-blue-400" size={20} />
                                <div className="flex flex-col">
                                    <span className="theme-section-label text-xs font-bold">Wind</span>
                                    <span className={statValueClass}>
                                        {formatWindSpeed(current.wind_speed_10m, weatherData.current_units.wind_speed_10m)}
                                    </span>
                                </div>
                            </div>
                            <div className={statTileClass}>
                                <Droplets className="text-blue-500" size={20} />
                                <div className="flex flex-col">
                                    <span className="theme-section-label text-xs font-bold">Precip Chance</span>
                                    <span className={statValueClass}>{currentPrecipChanceLabel}</span>
                                </div>
                            </div>
                            <div className={statTileClass}>
                                <Droplets className="text-cyan-500" size={20} />
                                <div className="flex flex-col">
                                    <span className="theme-section-label text-xs font-bold">Humidity</span>
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
                                    <span className="theme-section-label text-xs font-bold">Cloud Cover</span>
                                    <span className={statValueClass}>{current.cloud_cover}%</span>
                                </div>
                            </div>
                            <div className={statTileClass}>
                                <Eye className="text-indigo-400" size={20} />
                                <div className="flex flex-col">
                                    <span className="theme-section-label text-xs font-bold">Visibility</span>
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
                        <p className="theme-muted text-xs">Hourly and multi-day outlook with swipe cues.</p>
                    </div>
                    <ChevronDown className={`theme-subtle h-5 w-5 shrink-0 transition-transform ${openDetailSections.forecast ? "rotate-180" : ""}`} />
                </button>
                <CollapsiblePanel open={openDetailSections.forecast} className="w-full">
                    <div className="flex flex-col gap-6 pt-2">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className={sectionLabelClass}>Hourly Forecast</span>
                                <span className="surface-chip-muted rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                                    Swipe
                                </span>
                            </div>
                            <div className="scroll-fade-horizontal">
                                <div className="flex overflow-x-auto gap-3 px-2 pb-4 pt-2 snap-x hide-scrollbar">
                                    {(() => {
                                        const localNow = getLocalTimeForOffset(weatherData.utc_offset_seconds);
                                        const oneHourAgo = new Date(localNow.getTime() - 3600000);
                                        const twelveHoursFromNow = new Date(localNow.getTime() + 12 * 3600000);
                                        const events: {
                                            type: "hour" | "sunrise" | "sunset";
                                            time: Date;
                                            temp?: number;
                                            iconCode?: number;
                                            isDay?: number;
                                            pop?: number;
                                        }[] = [];

                                        weatherData.hourly.time.slice(0, 48).forEach((timeString: string, index: number) => {
                                            const hourDate = parseLocationDateTime(timeString);
                                            if (hourDate >= oneHourAgo && hourDate <= twelveHoursFromNow) {
                                                events.push({
                                                    type: "hour",
                                                    time: hourDate,
                                                    temp: Math.round(weatherData.hourly.temperature_2m[index]),
                                                    iconCode: weatherData.hourly.weather_code[index],
                                                    isDay: weatherData.hourly.is_day[index],
                                                    pop: weatherData.hourly.precipitation_probability?.[index]
                                                });
                                            }
                                        });

                                        weatherData.daily.time.slice(0, 3).forEach((_: string, index: number) => {
                                            const sunriseStr = weatherData.daily.sunrise?.[index];
                                            const sunsetStr = weatherData.daily.sunset?.[index];
                                            if (sunriseStr) {
                                                const sunriseDate = parseLocationDateTime(sunriseStr);
                                                if (sunriseDate >= localNow && sunriseDate <= twelveHoursFromNow) {
                                                    events.push({ type: "sunrise", time: sunriseDate });
                                                }
                                            }
                                            if (sunsetStr) {
                                                const sunsetDate = parseLocationDateTime(sunsetStr);
                                                if (sunsetDate >= localNow && sunsetDate <= twelveHoursFromNow) {
                                                    events.push({ type: "sunset", time: sunsetDate });
                                                }
                                            }
                                        });

                                        events.sort((a, b) => a.time.getTime() - b.time.getTime());

                                        return events.map((event, idx) => {
                                            if (event.type === "hour") {
                                                const hIconName = getWeatherIconFromCode(event.iconCode ?? 0, event.isDay ?? 1);
                                                const hourlyIconConfig = IconMap[hIconName] || IconMap["cloud"];
                                                const HIcon = hourlyIconConfig.icon;
                                                return (
                                                    <div key={`hour-${idx}`} className={forecastTileClass}>
                                                        <span className="font-semibold text-sm">{format(event.time, "h a")}</span>
                                                        <HIcon
                                                            size={24}
                                                            strokeWidth={hourlyIconConfig.strokeWidth ?? 1.9}
                                                            className={hourlyIconConfig.className}
                                                        />
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-bold">{event.temp}&deg;</span>
                                                            {shouldShowForecastChance(event.pop) && (
                                                                <span className="text-[10px] font-bold text-blue-500">{event.pop}%</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            if (event.type === "sunrise") {
                                                return (
                                                    <div key={`sunrise-${idx}`} className="surface-tile flex min-w-[70px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-orange-200/70 bg-gradient-to-t from-orange-200/55 to-[var(--surface-card-strong)] p-3">
                                                        <span className="font-semibold text-sm">{format(event.time, "h:mm")}</span>
                                                        <Sunrise size={24} className="text-orange-500" />
                                                        <span className="font-bold text-xs">Sunrise</span>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={`sunset-${idx}`} className="surface-tile flex min-w-[70px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-indigo-200/70 bg-gradient-to-t from-indigo-200/40 to-[var(--surface-card-strong)] p-3">
                                                    <span className="font-semibold text-sm">{format(event.time, "h:mm")}</span>
                                                    <Sunset size={24} className="text-indigo-500" />
                                                    <span className="font-bold text-xs">Sunset</span>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className={sectionLabelClass}>16-Day Forecast</span>
                                <span className="surface-chip-muted rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                                    Swipe
                                </span>
                            </div>
                            <div className="scroll-fade-horizontal">
                                <div className="flex overflow-x-auto gap-3 px-2 pb-4 pt-2 snap-x hide-scrollbar">
                                    {weatherData.daily.time.slice(0, 16).map((timeString: string, index: number) => {
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
                                        const dIconName = getWeatherIconFromCode(dayCode, 1);
                                        const dailyIconConfig = IconMap[dIconName] || IconMap["cloud"];
                                        const DIcon = dailyIconConfig.icon;

                                        return (
                                            <div key={timeString} className={forecastDayTileClass}>
                                                <span className="font-semibold text-sm">{index === 0 ? "Today" : format(dayDate, "MMM d")}</span>
                                                <DIcon
                                                    size={28}
                                                    strokeWidth={dailyIconConfig.strokeWidth ?? 1.9}
                                                    className={`${dailyIconConfig.className} my-1 flex-shrink-0`}
                                                />
                                                {showRainChance && (
                                                    <span className="text-[10px] font-bold text-blue-500 -mt-1 mb-1">{dayPrecipProbability}%</span>
                                                )}
                                                <div className="flex items-center gap-2 text-xs font-bold w-full justify-between">
                                                    <span className="theme-muted font-medium">{dayLow}&deg;</span>
                                                    <span>{dayHigh}&deg;</span>
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
                                <div className="surface-tile rounded-2xl p-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-5xl leading-none">{getMoonPhaseEmoji(astronomy.moon_phase)}</span>
                                        <div>
                                            <p className="theme-heading font-bold">{astronomy.moon_phase}</p>
                                            <p className="theme-muted text-xs">{astronomy.moon_illumination}% illuminated</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 text-right text-sm">
                                        {astronomy.moonrise && astronomy.moonrise !== "No moonrise" && (
                                            <div className="flex items-center gap-1 justify-end">
                                                <span className="theme-muted text-xs">Rise</span>
                                                <span className="font-semibold">{astronomy.moonrise}</span>
                                            </div>
                                        )}
                                        {astronomy.moonset && astronomy.moonset !== "No moonset" && (
                                            <div className="flex items-center gap-1 justify-end">
                                                <span className="theme-muted text-xs">Set</span>
                                                <span className="font-semibold">{astronomy.moonset}</span>
                                            </div>
                                        )}
                                    </div>
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
                className="surface-tile flex min-h-[56px] flex-col gap-3 rounded-[24px] px-4 py-4 text-left transition-all hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-elevated)]"
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
                <div className="weather-card-sidebar flex w-full flex-col gap-6 sm:w-[42%] sm:min-w-[340px] sm:flex-none sm:flex-shrink-0 sm:sticky sm:top-[5.5rem] sm:-mt-1.5 sm:pb-[5.5rem]">
                    <div className={heroCardClass}>
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--weather-glow),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)]" />
                        <div className="pointer-events-none absolute -left-12 top-8 h-32 w-32 rounded-full bg-[var(--weather-glow)] blur-3xl opacity-40" />
                        <div className="pointer-events-none absolute -right-10 bottom-6 h-28 w-28 rounded-full bg-[var(--accent-soft)] blur-3xl" />

                        {/* Top Header - Always visible */}
                        <div className="relative flex flex-col items-center text-center">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <span className="surface-chip-muted rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">
                                    {currentCondition}
                                </span>
                                <span className="surface-chip-muted rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">
                                    Local {localTimeLabel}
                                </span>
                            </div>

                            <div className="mt-5 flex flex-col items-center gap-3">
                                <div className={`flex h-24 w-24 items-center justify-center rounded-full ${iconBadgeClass}`}>
                                    <IconComponent
                                        size={iconSize}
                                        strokeWidth={iconConfig.strokeWidth ?? 1.75}
                                        className={iconConfig.className}
                                    />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="theme-heading flex items-center justify-center gap-2 text-6xl font-bold tracking-tight sm:text-7xl">
                                        {displayTemp}&deg;
                                    </span>
                                    <span
                                        className="theme-heading max-w-[16rem] text-[1.7rem] font-bold capitalize leading-none sm:max-w-none sm:text-4xl"
                                        title={locationName || "Current Location"}
                                    >
                                        {primaryLocationName}
                                    </span>
                                    {secondaryLocationName ? (
                                        <span className="theme-muted max-w-[18rem] text-center text-sm font-semibold leading-snug sm:max-w-none">
                                            {secondaryLocationName}
                                        </span>
                                    ) : null}
                                    <span className="theme-muted text-sm font-semibold">
                                        H: {dailyHigh}&deg; L: {dailyLow}&deg;
                                    </span>
                                </div>
                            </div>

                            {(hasConfidencePill || hasStationPill || hasMinutelyPill) && (
                                <div className={insightGridClass}>
                                    {conf && forecastConfidence && (
                                        <button
                                            onClick={() => setShowConfidenceDetail(v => !v)}
                                            className={`${insightPillClass} ${showConfidenceDetail ? insightPillOpenClass : ""} ${(!hasStationPill && !hasMinutelyPill) ? "col-span-2 sm:col-span-3" : !hasStationPill ? "col-span-2" : ""}`}
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${confidenceDotClass}`} />
                                                <div className="min-w-0">
                                                    <p className="theme-section-label text-[10px] font-bold tracking-[0.2em]">Models</p>
                                                    <p className="theme-heading mt-1 line-clamp-2 text-sm font-semibold leading-tight">
                                                        {confidenceSummaryLabel ?? "Forecast spread"}
                                                    </p>
                                                    <p className="theme-subtle mt-0.5 text-xs font-medium">
                                                        {confidenceAggregatedTemp}&deg; &plusmn;{forecastConfidence.spread}&deg;
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronDown className={`theme-subtle h-4 w-4 shrink-0 transition-transform ${showConfidenceDetail ? "rotate-180" : ""}`} />
                                        </button>
                                    )}
                                    {metarTempDisplay != null && (
                                        <button
                                            onClick={() => setShowStationDetail(v => !v)}
                                            className={`${insightPillClass} ${showStationDetail ? insightPillOpenClass : ""} ${stationNeedsAttention ? "border-orange-300/70 bg-[linear-gradient(135deg,rgba(251,146,60,0.16),rgba(255,255,255,0.08))]" : ""} ${!hasConfidencePill ? "col-span-2" : ""}`}
                                        >
                                            <div className="min-w-0">
                                                <p className="theme-section-label text-[10px] font-bold tracking-[0.2em]">Station</p>
                                                <p className="theme-heading mt-1 line-clamp-2 text-sm font-semibold leading-tight">
                                                    {metarTempDisplay}&deg; observed
                                                </p>
                                                <p className="theme-subtle mt-0.5 line-clamp-2 text-xs font-medium">
                                                    {showStationTempDelta && metarTempDiff != null
                                                        ? `${metarTempDiff > 0 ? "+" : ""}${metarTempDiff}° vs main temp`
                                                        : stationDistanceDisplay ?? stationIcaoId}
                                                </p>
                                            </div>
                                            <ChevronDown className={`theme-subtle h-4 w-4 shrink-0 transition-transform ${showStationDetail ? "rotate-180" : ""}`} />
                                        </button>
                                    )}
                                    {showMinutelyBanner && rainSummary && (
                                        <button
                                            onClick={() => setShowMinutelyDetail(v => !v)}
                                            className={`${insightPillClass} ${showMinutelyDetail ? insightPillOpenClass : ""} ${minutelyPillToneClass} col-span-2 sm:col-span-1`}
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                <CloudRain className={`${minutelyIconClass} shrink-0`} size={16} />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">{minutelyWindowLabel}</p>
                                                    <p className="mt-1 line-clamp-2 text-sm font-semibold leading-tight">
                                                        {minutelyStatusLabel}
                                                    </p>
                                                    <p className="mt-0.5 line-clamp-2 text-xs font-medium opacity-75">
                                                        Next-hour rain trend in 5-minute steps
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronDown className={`theme-subtle h-4 w-4 shrink-0 transition-transform ${showMinutelyDetail ? "rotate-180" : ""}`} />
                                        </button>
                                    )}
                                </div>
                            )}

                            <CollapsiblePanel open={Boolean(conf && forecastConfidence && showConfidenceDetail)} className="mt-2 w-full">
                                <div className="surface-tile rounded-2xl border px-4 py-3">
                                    <div className="mb-3 flex items-center justify-between border-b border-[color:var(--border-soft)] pb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2 w-2 rounded-full ${confidenceDotClass}`} />
                                            <span className="theme-section-label text-xs font-bold tracking-wide">Model Average</span>
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
                                    <div className="mb-3 flex items-start justify-between gap-3 border-b border-[color:var(--border-soft)] pb-2">
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
                    <div className="personality-card-shell overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_left,var(--accent-soft),transparent_38%),linear-gradient(160deg,rgba(255,255,255,0.06),transparent_62%)] border border-[color:var(--border-strong)] shadow-[var(--shadow-soft)]">
                        <div className="px-5 py-5 sm:px-8 sm:py-8">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 flex-col items-center gap-2.5 text-center sm:flex-row sm:items-start sm:text-left">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-text)] shadow-sm sm:h-11 sm:w-11">
                                            <PersonalityIcon size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                                <p className="theme-section-label text-[11px] font-bold tracking-[0.22em]">Forecast Voice</p>
                                                <span className="rounded-full border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-text)]">
                                                    Active
                                                </span>
                                                {selectedPersonality.isCustom ? (
                                                    <span className="surface-chip rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                                                        Custom
                                                    </span>
                                                ) : null}
                                            </div>
                                            <h2 className="theme-heading mt-2 text-[clamp(1.7rem,9vw,2.45rem)] font-bold leading-none">
                                                {selectedPersonality.label}
                                            </h2>
                                            <p className="theme-subtle mx-auto mt-2 max-w-[30ch] text-[13px] leading-relaxed opacity-90 sm:mx-0 sm:text-sm">
                                                {selectedPersonality.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-center sm:block">
                                    <button
                                        type="button"
                                        onClick={() => setIsVoiceMenuOpen((currentValue) => !currentValue)}
                                        className="surface-chip inline-flex min-h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all hover:border-[color:var(--accent-border)] hover:text-[var(--accent-text)]"
                                        aria-expanded={isVoiceMenuOpen}
                                    >
                                        Change voice
                                        <ChevronDown className={`transition-transform ${isVoiceMenuOpen ? "rotate-180" : "-rotate-90"}`} size={14} />
                                    </button>
                                </div>
                            </div>

                            <CollapsiblePanel open={isVoiceMenuOpen} className="mt-4">
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

                            <div className="mt-4 flex justify-center sm:justify-start">
                                <div className="surface-chip max-w-fit rounded-full px-4 py-2 text-center sm:text-left">
                                    <p className="theme-subtle text-[10px] font-bold uppercase tracking-[0.18em]">Preview</p>
                                    <p className="theme-heading mt-1 text-sm font-medium italic leading-relaxed">
                                        &ldquo;{selectedPersonality.preview}&rdquo;
                                    </p>
                                </div>
                            </div>

                            <div className="theme-divider mt-5 border-t pt-5">
                                <div className="surface-tile-strong mx-auto flex max-w-[38rem] flex-col items-center rounded-[26px] px-6 py-6 text-center transition-all hover:shadow-[var(--shadow-soft)] hover:-translate-y-0.5 sm:px-8 sm:py-8">
                                    <p className="theme-subtle text-[11px] font-bold uppercase tracking-[0.22em]">Current Read</p>
                                    <p className="theme-heading mt-4 max-w-[32ch] text-center text-[1.12rem] font-medium leading-[1.8] tracking-[-0.01em] sm:max-w-[36ch] sm:text-[1.15rem]">
                                        {resolvedAdvice}
                                    </p>
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
                        className="surface-card-strong w-full max-w-md rounded-[28px] border p-5 shadow-[var(--shadow-strong)]"
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
                                <div key={name} className="flex items-start gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-[var(--surface-tile)] px-3 py-3">
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
