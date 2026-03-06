import { getWeatherIconFromCode } from "@/lib/weather";
import { format } from "date-fns";
import {
    Sun,
    Moon,
    CloudSun,
    CloudMoon,
    CloudRain,
    CloudSnow,
    CloudFog,
    CloudLightning,
    Cloud,
    Thermometer,
    Wind,
    Droplets,
    Sunset,
    Sunrise,
    SunDim
} from "lucide-react";

const IconMap: Record<string, any> = {
    "sun": Sun,
    "moon": Moon,
    "cloud-sun": CloudSun,
    "cloud-moon": CloudMoon,
    "cloud-rain": CloudRain,
    "cloud-snow": CloudSnow,
    "cloud-fog": CloudFog,
    "cloud-lightning": CloudLightning,
    "cloud": Cloud,
};

export default function WeatherCard({
    weatherData,
    isDetailed,
    onToggleDetail,
    aiAdvice
}: {
    weatherData: any,
    isDetailed: boolean,
    onToggleDetail: () => void,
    aiAdvice: string
}) {
    if (!weatherData || !weatherData.current) return null;

    const current = weatherData.current;
    const currentTemp = Math.round(current.temperature_2m);
    const feelsLike = Math.round(current.apparent_temperature);
    const iconName = getWeatherIconFromCode(current.weather_code, current.is_day);
    const IconComponent = IconMap[iconName] || Cloud;

    // High/Low
    const dailyHigh = Math.round(weatherData.daily.temperature_2m_max[0]);
    const dailyLow = Math.round(weatherData.daily.temperature_2m_min[0]);

    return (
        <div className="organic-card flex flex-col gap-6 w-full max-w-lg mx-auto overflow-hidden transition-all duration-500">
            {/* Top Header - Always visible */}
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <span className="text-5xl font-bold flex items-center gap-2">
                        {currentTemp}&deg;
                    </span>
                    <span className="text-var(--color-text-secondary) font-medium text-lg capitalize">
                        {weatherData.timezone ? weatherData.timezone.split('/')[1].replace('_', ' ') : "Current Location"}
                    </span>
                    <span className="text-sm font-semibold opacity-70">
                        H: {dailyHigh}&deg; L: {dailyLow}&deg;
                    </span>
                </div>
                <div className="text-var(--color-sun-orange) p-2 bg-white rounded-full shadow-sm">
                    <IconComponent size={64} strokeWidth={1.5} />
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
                                <span className="font-semibold">{current.wind_speed_10m} km/h</span>
                            </div>
                        </div>
                        <div className="bg-white/50 rounded-2xl p-3 flex items-center gap-3">
                            <Droplets className="text-blue-500" size={20} />
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
                    </div>

                    {/* Hourly Forecast Scroll */}
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-gray-500 uppercase ml-2">Hourly Forecast</span>
                        <div className="flex overflow-x-auto gap-3 pb-4 pt-2 px-2 snap-x">
                            {weatherData.hourly.time.slice(0, 24).map((timeString: string, index: number) => {
                                // Only show current hour and next 24 (Open meteo returns past hours for the day too)
                                const hourDate = new Date(timeString);
                                if (hourDate < new Date() && index !== 0) return null; // Very basic filter

                                const hourTemp = Math.round(weatherData.hourly.temperature_2m[index]);
                                const hIconName = getWeatherIconFromCode(weatherData.hourly.weather_code[index]);
                                const HIcon = IconMap[hIconName] || Cloud;

                                return (
                                    <div key={timeString} className="flex flex-col items-center gap-2 bg-white/40 min-w-[70px] p-3 rounded-2xl snap-start shrink-0">
                                        <span className="font-semibold text-sm">{format(hourDate, "h a")}</span>
                                        <HIcon size={24} className="text-gray-700" />
                                        <span className="font-bold">{hourTemp}&deg;</span>
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
