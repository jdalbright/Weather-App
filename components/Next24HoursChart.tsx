"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

export type HourlyForecastPoint = {
    time: Date;
    temp: number;
    apparentTemp: number;
    iconCode: number;
    isDay: number;
    pop: number;
    windSpeed: number;
    humidity: number;
};

type Next24HoursChartProps = {
    points: HourlyForecastPoint[];
};

type MetricKey = "temp" | "apparentTemp" | "pop" | "humidity";

type MetricDefinition = {
    id: MetricKey;
    label: string;
    color: string;
    peakLabel: string;
    lowLabel: string;
};

type ChartPoint = HourlyForecastPoint & {
    shortTimeLabel: string;
    timeLabel: string;
};

type TooltipContentProps = {
    active?: boolean;
    payload?: Array<{
        payload: ChartPoint;
    }>;
};

const METRICS: MetricDefinition[] = [
    { id: "temp", label: "Temperature", color: "#f97316", peakLabel: "Warmest", lowLabel: "Coolest" },
    { id: "apparentTemp", label: "Feels Like", color: "#8b5cf6", peakLabel: "Feels warmest", lowLabel: "Feels coolest" },
    { id: "pop", label: "Rain Chance", color: "#0ea5e9", peakLabel: "Peak chance", lowLabel: "Lowest chance" },
    { id: "humidity", label: "Humidity", color: "#3b82f6", peakLabel: "Most humid", lowLabel: "Driest" },
];

const DEFAULT_METRIC: MetricKey = "temp";

function getMetricDefinition(metric: MetricKey): MetricDefinition {
    return METRICS.find((entry) => entry.id === metric) ?? METRICS[0];
}

function formatMetricValue(metric: MetricKey, value: number): string {
    if (metric === "temp" || metric === "apparentTemp") {
        return `${Math.round(value)}°`;
    }

    return `${Math.round(value)}%`;
}

function formatAxisTick(metric: MetricKey, value: number): string {
    if (metric === "temp" || metric === "apparentTemp") {
        return `${Math.round(value)}°`;
    }

    return `${Math.round(value)}%`;
}

function getMetricDomain(metric: MetricKey, values: number[]): [number, number] {
    if (values.length === 0) return [0, 100];

    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const spread = Math.max(rawMax - rawMin, metric === "temp" || metric === "apparentTemp" ? 6 : 12);
    const padding = spread * 0.22;

    if (metric === "pop" || metric === "humidity") {
        return [
            Math.max(0, Math.floor(rawMin - padding)),
            Math.min(100, Math.ceil(rawMax + padding)),
        ];
    }

    return [Math.floor(rawMin - padding), Math.ceil(rawMax + padding)];
}

function getChartTone(color: string): { line: string; top: string; bottom: string } {
    return {
        line: color,
        top: `color-mix(in srgb, ${color} 28%, transparent)`,
        bottom: `color-mix(in srgb, ${color} 4%, transparent)`,
    };
}

function getChartSummary(points: ChartPoint[], metric: MetricKey): {
    current: ChartPoint;
    peak: ChartPoint;
    low: ChartPoint;
    last: ChartPoint;
} | null {
    const current = points[0];
    const last = points[points.length - 1];

    if (!current || !last) return null;

    const peak = points.reduce((best, point) => (
        point[metric] > best[metric] ? point : best
    ), current);

    const low = points.reduce((best, point) => (
        point[metric] < best[metric] ? point : best
    ), current);

    return { current, peak, low, last };
}

function ChartTooltip({
    active,
    payload,
    metric,
}: TooltipContentProps & {
    metric: MetricKey;
}) {
    if (!active || !payload?.length) return null;

    const data = payload[0]?.payload;

    if (!data) return null;

    const metricDefinition = getMetricDefinition(metric);

    return (
        <div className="surface-card-strong min-w-[156px] rounded-[20px] border border-soft-var px-3 py-2.5 shadow-soft-var">
            <p className="theme-heading text-sm font-bold">{data.timeLabel}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
                <span className="theme-muted text-[11px] font-bold uppercase tracking-[0.16em]">
                    {metricDefinition.label}
                </span>
                <span className="text-sm font-bold" style={{ color: metricDefinition.color }}>
                    {formatMetricValue(metric, data[metric])}
                </span>
            </div>
        </div>
    );
}

export function Next24HoursChart({ points }: Next24HoursChartProps) {
    const [activeMetric, setActiveMetric] = useState<MetricKey>(DEFAULT_METRIC);

    const chartData = useMemo<ChartPoint[]>(() => {
        return points.slice(0, 24).map((point) => ({
            ...point,
            shortTimeLabel: format(point.time, "ha"),
            timeLabel: format(point.time, "h a"),
        }));
    }, [points]);

    const metricDefinition = getMetricDefinition(activeMetric);
    const metricValues = chartData.map((point) => point[activeMetric]);
    const chartDomain = getMetricDomain(activeMetric, metricValues);
    const chartTone = getChartTone(metricDefinition.color);
    const summary = getChartSummary(chartData, activeMetric);

    if (chartData.length === 0 || !summary) {
        return (
            <div className="surface-tile rounded-[24px] border border-dashed border-soft-var px-4 py-6 text-center">
                <p className="theme-heading text-sm font-bold">Next 24-hour trend unavailable.</p>
                <p className="theme-muted mt-1 text-xs">Hourly forecast data did not load for this location.</p>
            </div>
        );
    }

    const summaryItems = [
        {
            label: "Now",
            value: formatMetricValue(activeMetric, summary.current[activeMetric]),
            meta: summary.current.timeLabel,
        },
        {
            label: metricDefinition.peakLabel,
            value: formatMetricValue(activeMetric, summary.peak[activeMetric]),
            meta: summary.peak.timeLabel,
        },
        {
            label: metricDefinition.lowLabel,
            value: formatMetricValue(activeMetric, summary.low[activeMetric]),
            meta: summary.low.timeLabel,
        },
        {
            label: "Late",
            value: formatMetricValue(activeMetric, summary.last[activeMetric]),
            meta: summary.last.timeLabel,
        },
    ];

    return (
        <div className="flex w-full flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {METRICS.map((metric) => {
                    const isActive = metric.id === activeMetric;

                    return (
                        <button
                            key={metric.id}
                            type="button"
                            onClick={() => setActiveMetric(metric.id)}
                            className={`min-w-0 rounded-full border px-3 py-2 text-center text-sm font-bold transition-all ${isActive
                                ? "text-white shadow-soft-var"
                                : "surface-chip text-secondary-var hover-border-strong-var hover-bg-surface-elevated-var"
                                }`}
                            style={isActive ? { backgroundColor: metric.color, borderColor: "transparent" } : undefined}
                            aria-pressed={isActive}
                        >
                            <span className="block truncate">{metric.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {summaryItems.map((item, index) => (
                    <div
                        key={`${activeMetric}-${item.label}`}
                        className="next24-summary-card surface-chip rounded-[20px] px-3 py-2.5"
                        style={{ animationDelay: `${index * 45}ms` }}
                    >
                        <p className="theme-muted text-[10px] font-bold uppercase tracking-[0.14em]">{item.label}</p>
                        <p className="theme-heading mt-1 text-base font-bold">{item.value}</p>
                        <p className="theme-muted mt-0.5 text-[11px]">{item.meta}</p>
                    </div>
                ))}
            </div>

            <div
                className="overflow-hidden rounded-[24px] border border-soft-var px-3 py-3 sm:px-4 sm:py-4"
                style={{
                    background: `linear-gradient(180deg, ${chartTone.top}, ${chartTone.bottom}), var(--surface-card-strong)`,
                }}
            >
                <div key={`header-${activeMetric}`} className="next24-chart-fade mb-2 flex items-center justify-between gap-3 px-1">
                    <div>
                        <p className="theme-heading text-sm font-bold">{metricDefinition.label}</p>
                        <p className="theme-muted text-xs">Next 24 hours</p>
                    </div>
                    <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
                        style={{
                            color: chartTone.line,
                            background: `color-mix(in srgb, ${chartTone.line} 12%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${chartTone.line} 22%, var(--border-soft))`,
                        }}
                    >
                        Live trend
                    </span>
                </div>

                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            key={`chart-${activeMetric}`}
                            data={chartData}
                            margin={{ top: 12, right: 8, left: -2, bottom: 4 }}
                        >
                            <defs>
                                <linearGradient id={`next24-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={chartTone.line} stopOpacity={0.34} />
                                    <stop offset="95%" stopColor={chartTone.line} stopOpacity={0.03} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                vertical={false}
                                stroke="var(--border-soft)"
                                strokeDasharray="4 6"
                                opacity={0.45}
                            />
                            <XAxis
                                dataKey="shortTimeLabel"
                                axisLine={false}
                                tickLine={false}
                                tickMargin={10}
                                minTickGap={18}
                                tick={{ fill: "var(--text-muted)", fontSize: 11, fontWeight: 700 }}
                            />
                            <YAxis
                                width={34}
                                domain={chartDomain}
                                axisLine={false}
                                tickLine={false}
                                tickMargin={4}
                                tickCount={5}
                                tick={{ fill: "var(--text-muted)", fontSize: 11, fontWeight: 700 }}
                                tickFormatter={(value: number) => formatAxisTick(activeMetric, value)}
                            />
                            <Tooltip
                                cursor={{ stroke: "var(--border-soft)", strokeWidth: 1, strokeDasharray: "4 6" }}
                                content={<ChartTooltip metric={activeMetric} />}
                            />
                            <Area
                                type="monotone"
                                dataKey={activeMetric}
                                stroke={chartTone.line}
                                strokeWidth={3}
                                fill={`url(#next24-${activeMetric})`}
                                fillOpacity={1}
                                dot={false}
                                activeDot={{
                                    r: 5,
                                    strokeWidth: 2,
                                    stroke: "var(--surface-card-strong)",
                                    fill: chartTone.line,
                                }}
                                isAnimationActive={true}
                                animationBegin={70}
                                animationDuration={460}
                                animationEasing="ease-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
