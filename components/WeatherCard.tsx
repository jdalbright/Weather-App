import {
    getWeatherIconFromCode,
    WeatherData,
    formatVisibility,
    formatWindSpeed,
    getLocalTimeForOffset
} from "@/lib/weather";
import { format } from "date-fns";
import {
    Thermometer,
    Wind,
    Droplets,
    Sunset,
    Sunrise,
    SunDim,
    Cloud,
    Eye
} from "lucide-react";
import {
    JoySun,
    JoyMoon,
    JoyCloudSun,
    JoyCloudMoon,
    JoyCloud,
    JoyRain,
    JoyHeavyRain,
    JoySnow,
    JoyLightning,
    JoyFog
} from "@/components/JoyWeatherIcons";
import { LucideProps } from "lucide-react";

interface WeatherIconProps extends LucideProps {
    size?: number | string;
}

const IconMap: Record<string, React.ComponentType<WeatherIconProps>> = {
    "sun": JoySun,
    "moon": JoyMoon,
    "cloud-sun": JoyCloudSun,
    "cloud-moon": JoyCloudMoon,
    "cloud": JoyCloud,
    "cloud-rain": JoyRain,
    "cloud-heavy-rain": JoyHeavyRain,
    "cloud-snow": JoySnow,
    "cloud-fog": JoyFog,
    "cloud-lightning": JoyLightning,
};

export default function WeatherCard({
    locationName,
    weatherData,
    isDetailed,
    onToggleDetail,
    aiAdvice,
    distUnit = "mph"
}: {
    locationName: string,
    weatherData: WeatherData | null,
    isDetailed: boolean,
    onToggleDetail: () => void,
    aiAdvice: string,
    distUnit?: "kmh" | "mph"
}) {
    if (!weatherData || !weatherData.current) return null;

    const current = weatherData.current;
    const currentTemp = Math.round(current.temperature_2m);
    const feelsLike = Math.round(current.apparent_temperature);
    const iconName = getWeatherIconFromCode(current.weather_code, current.is_day);
    const IconComponent = IconMap[iconName] || JoyCloud;
    const isNightIcon = iconName === "moon" || iconName === "cloud-moon";
    const iconBadgeClass = isNightIcon
        ? "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_rgba(255,255,255,0.02)_40%),linear-gradient(160deg,_#0f172a,_#1e3a5f_55%,_#312e81)] shadow-[0_16px_36px_rgba(15,23,42,0.28)] ring-1 ring-white/20"
        : "bg-[radial-gradient(circle_at_top,_#ffffff,_#f8fafc_55%,_#e2e8f0)] shadow-[0_10px_22px_rgba(148,163,184,0.25)] ring-1 ring-white/70";
    const iconSize = isNightIcon ? 88 : 84;

    // High/Low
    const dailyHigh = Math.round(weatherData.daily.temperature_2m_max[0]);
    const dailyLow = Math.round(weatherData.daily.temperature_2m_min[0]);

    return (
        <div className="organic-card flex flex-col gap-6 w-full max-w-lg mx-auto overflow-hidden transition-all duration-500">
            {/* Top Header - Always visible */}
            <div className="flex flex-col items-center text-center gap-4">
                <div className={`flex h-24 w-24 items-center justify-center rounded-full ${iconBadgeClass}`}>
                    <IconComponent size={iconSize} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-6xl font-bold flex items-center justify-center gap-2">
                        {currentTemp}&deg;
                    </span>
                    <span className="text-var(--color-text-secondary) mt-1 font-medium text-xl capitalize">
                        {locationName || "Current Location"}
                    </span>
                    <span className="text-sm font-semibold opacity-70 mt-1">
                        H: {dailyHigh}&deg; L: {dailyLow}&deg;
                    </span>
                </div>
            </div>

            {/* AI Advice Box - Simply styled */}
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 text-center border-2 border-white/60 shadow-inner">
                <p className="font-medium text-lg leading-relaxed text-var(--color-text-primary)">
                    {aiAdvice || "Looking out the window..."}
                </p>
            </div>

            <button
                onClick={onToggleDetail}
                className="organic-button mx-auto mt-2 mb-2 text-sm"
            >
                {isDetailed ? "Show Less" : "Show Detail"}
            </button>

            {/* Detailed View Section */}
            {isDetailed && (
                <div className="flex flex-col gap-6 animate-in slide-in-from-top-4 fade-in duration-500">

                    {/* Detailed stats grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/50 rounded-2xl p-3 flex items-center gap-3">
                            <Thermometer className="text-orange-500" size={20} />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-500 uppercase">Feels Like</span>
                                <span className="font-semibold">{feelsLike}&deg;</span>
                            </div>
                        </div>
                        <div className="bg-white/50 rounded-2xl p-3 flex items-center gap-3">
                            <Wind className="text-blue-400" size={20} />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-500 uppercase">Wind</span>
                                <span className="font-semibold">
                                    {formatWindSpeed(current.wind_speed_10m, weatherData.current_units.wind_speed_10m)}
                                </span>
                            </div>
                        </div>
                        <div className="bg-white/50 rounded-2xl p-3 flex items-center gap-3">
                            <Droplets className="text-blue-500" size={20} />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-500 uppercase">Rain Chance</span>
                                <span className="font-semibold">{current.precipitation_probability}%</span>
                            </div>
                        </div>
                        <div className="bg-white/50 rounded-2xl p-3 flex items-center gap-3">
                            <Droplets className="text-cyan-500" size={20} />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-500 uppercase">Humidity</span>
                                <span className="font-semibold">{current.relative_humidity_2m}%</span>
                            </div>
                        </div>
                        <div className="bg-white/50 rounded-2xl p-3 flex items-center gap-3">
                            <SunDim className="text-yellow-500" size={20} />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-500 uppercase">UV Index</span>
                                <span className="font-semibold">{weatherData.daily.uv_index_max[0]}</span>
                            </div>
                        </div>
                        <div className="bg-white/50 rounded-2xl p-3 flex items-center gap-3">
                            <Cloud className="text-gray-400" size={20} />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-500 uppercase">Cloud Cover</span>
                                <span className="font-semibold">{current.cloud_cover}%</span>
                            </div>
                        </div>
                        <div className="bg-white/50 rounded-2xl p-3 flex items-center gap-3">
                            <Eye className="text-indigo-400" size={20} />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-500 uppercase">Visibility</span>
                                <span className="font-semibold">
                                    {formatVisibility(current.visibility, distUnit, weatherData.current_units.visibility)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Hourly Forecast Scroll */}
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-gray-500 uppercase ml-2">Hourly Forecast</span>
                        <div className="flex overflow-x-auto gap-3 pb-4 pt-2 px-2 snap-x hide-scrollbar">
                            {(() => {
                                // 1. Gather next 12 hours of regular data
                                const localNow = getLocalTimeForOffset(weatherData.utc_offset_seconds);
                                const twelveHoursFromNow = new Date(localNow.getTime() + 12 * 3600000);
                                const events: {
                                    type: 'hour' | 'sunrise' | 'sunset';
                                    time: Date;
                                    temp?: number;
                                    iconCode?: number;
                                    isDay?: number;
                                    pop?: number;
                                }[] = [];

                                weatherData.hourly.time.slice(0, 48).forEach((timeString: string, index: number) => {
                                    const hourDate = new Date(timeString);
                                    if (hourDate >= new Date(localNow.getTime() - 3600000) && hourDate <= twelveHoursFromNow) {
                                        events.push({
                                            type: 'hour',
                                            time: hourDate,
                                            temp: Math.round(weatherData.hourly.temperature_2m[index]),
                                            iconCode: weatherData.hourly.weather_code[index],
                                            isDay: weatherData.hourly.is_day[index],
                                            pop: weatherData.hourly.precipitation_probability?.[index]
                                        });
                                    }
                                });

                                // 2. Gather sunrise and sunset events for the next few days
                                weatherData.daily.time.slice(0, 3).forEach((_: string, index: number) => {
                                    const sunriseStr = weatherData.daily.sunrise?.[index];
                                    const sunsetStr = weatherData.daily.sunset?.[index];

                                    if (sunriseStr) {
                                        const sunriseDate = new Date(sunriseStr);
                                        if (sunriseDate >= localNow && sunriseDate <= twelveHoursFromNow) {
                                            events.push({ type: 'sunrise', time: sunriseDate });
                                        }
                                    }
                                    if (sunsetStr) {
                                        const sunsetDate = new Date(sunsetStr);
                                        if (sunsetDate >= localNow && sunsetDate <= twelveHoursFromNow) {
                                            events.push({ type: 'sunset', time: sunsetDate });
                                        }
                                    }
                                });

                                // 3. Sort chronologically
                                events.sort((a, b) => a.time.getTime() - b.time.getTime());

                                return events.map((event, idx) => {
                                    if (event.type === 'hour') {
                                        const hIconName = getWeatherIconFromCode(event.iconCode ?? 0, event.isDay ?? 1);
                                        const HIcon = IconMap[hIconName] || JoyCloud;
                                        return (
                                            <div key={`hour-${idx}`} className="flex flex-col items-center gap-2 bg-white/40 min-w-[70px] p-3 rounded-2xl snap-start shrink-0">
                                                <span className="font-semibold text-sm">{format(event.time, "h a")}</span>
                                                <HIcon size={24} className="text-gray-700" />
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold">{event.temp}&deg;</span>
                                                    {(event.pop ?? 0) > 0 && (
                                                        <span className="text-[10px] font-bold text-blue-500">{event.pop}%</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    } else if (event.type === 'sunrise') {
                                        return (
                                            <div key={`sunrise-${idx}`} className="flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-orange-200 to-white/40 min-w-[70px] p-3 rounded-2xl snap-start shrink-0 border border-orange-200">
                                                <span className="font-semibold text-sm">{format(event.time, "h:mm")}</span>
                                                <Sunrise size={24} className="text-orange-500" />
                                                <span className="font-bold text-xs">Sunrise</span>
                                            </div>
                                        );
                                    } else if (event.type === 'sunset') {
                                        return (
                                            <div key={`sunset-${idx}`} className="flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-indigo-200 to-white/40 min-w-[70px] p-3 rounded-2xl snap-start shrink-0 border border-indigo-200">
                                                <span className="font-semibold text-sm">{format(event.time, "h:mm")}</span>
                                                <Sunset size={24} className="text-indigo-500" />
                                                <span className="font-bold text-xs">Sunset</span>
                                            </div>
                                        );
                                    }
                                    return null;
                                });
                            })()}
                        </div>
                    </div>

                    {/* 16-Day Forecast Scroll */}
                    <div className="flex flex-col gap-2 mt-4">
                        <span className="text-sm font-bold text-gray-500 uppercase ml-2">16-Day Forecast</span>
                        <div className="flex overflow-x-auto gap-3 pb-4 pt-2 px-2 snap-x hide-scrollbar">
                            {weatherData.daily.time.slice(0, 16).map((timeString: string, index: number) => {
                                const dayDate = new Date(timeString);
                                // Workaround for timezone issue with date parsing
                                const dayDateLocal = new Date(dayDate.getTime() + dayDate.getTimezoneOffset() * 60000);
                                const dayHigh = Math.round(weatherData.daily.temperature_2m_max[index]);
                                const dayLow = Math.round(weatherData.daily.temperature_2m_min[index]);
                                const dIconName = getWeatherIconFromCode(weatherData.daily.weather_code[index], 1);
                                const DIcon = IconMap[dIconName] || JoyCloud;

                                return (
                                    <div key={timeString} className="flex flex-col items-center justify-between gap-1 bg-white/40 min-w-[80px] p-3 rounded-2xl snap-start shrink-0 h-[120px]">
                                        <span className="font-semibold text-sm">{index === 0 ? "Today" : format(dayDateLocal, "MMM d")}</span>
                                        <DIcon size={28} className="text-gray-700 my-1 flex-shrink-0" />
                                        {(weatherData.daily.precipitation_probability_max?.[index] ?? 0) > 0 && (
                                            <span className="text-[10px] font-bold text-blue-500 -mt-1 mb-1">{weatherData.daily.precipitation_probability_max[index]}%</span>
                                        )}
                                        <div className="flex items-center gap-2 text-xs font-bold w-full justify-between">
                                            <span className="text-gray-600 font-medium">{dayLow}&deg;</span>
                                            <span>{dayHigh}&deg;</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
