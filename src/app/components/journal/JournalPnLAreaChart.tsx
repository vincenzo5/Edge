"use client";

import { useMemo, useState } from "react";

export type PnLAreaChartPoint = {
  id: string;
  value: number;
  tooltipTitle?: string;
  tooltipValue?: string;
};

type Props = {
  points: PnLAreaChartPoint[];
  testId?: string;
  compact?: boolean;
  ariaLabel?: string;
  xStartLabel?: string;
  xEndLabel?: string;
  gradientIdPrefix?: string;
};

const CHART_WIDTH = 400;
const CHART_HEIGHT = 200;
const COMPACT_HEIGHT = 160;
const PAD_LEFT = 48;
const PAD_RIGHT = 12;
const PAD_TOP = 10;
const PAD_BOTTOM = 22;
const PLOT_WIDTH = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;

function formatAxisMoney(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return value < 0 ? `-${formatted}` : formatted;
}

function niceStep(range: number, targetTicks = 7): number {
  if (range <= 0) return 50;
  const rough = range / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  let nice: number;
  if (normalized <= 1.5) nice = 1;
  else if (normalized <= 3) nice = 2;
  else if (normalized <= 7) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

function computeYTicks(min: number, max: number): number[] {
  const step = niceStep(max - min);
  const tickMin = Math.floor(min / step) * step;
  const tickMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = tickMin; value <= tickMax + step * 0.001; value += step) {
    ticks.push(Math.round(value * 1000) / 1000);
  }
  return ticks;
}

type RenderPoint = {
  x: number;
  y: number;
  point: PnLAreaChartPoint;
};

function buildAreaPath(chartPoints: RenderPoint[], zeroY: number): string {
  if (chartPoints.length === 0) return "";
  const first = chartPoints[0]!;
  const last = chartPoints[chartPoints.length - 1]!;
  const line = chartPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  return `${line} L ${last.x} ${zeroY} L ${first.x} ${zeroY} Z`;
}

export default function JournalPnLAreaChart({
  points,
  testId = "journal-pnl-area",
  compact = false,
  ariaLabel = "P&L chart",
  xStartLabel,
  xEndLabel,
  gradientIdPrefix = "pnl-area",
}: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartHeight = compact ? COMPACT_HEIGHT : CHART_HEIGHT;
  const plotHeight = chartHeight - PAD_TOP - PAD_BOTTOM;

  const valueToY = (value: number, min: number, max: number) => {
    const range = max - min || 1;
    return PAD_TOP + plotHeight - ((value - min) / range) * plotHeight;
  };

  const chart = useMemo(() => {
    if (points.length === 0) return null;

    const values = points.map((point) => point.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const min = Math.min(0, dataMin);
    const max = Math.max(0, dataMax);
    const yTicks = computeYTicks(min, max);
    const tickMin = yTicks[0] ?? min;
    const tickMax = yTicks[yTicks.length - 1] ?? max;
    const zeroY = valueToY(0, tickMin, tickMax);

    const chartPoints: RenderPoint[] = points.map((point, index) => ({
      x: PAD_LEFT + (index / Math.max(points.length - 1, 1)) * PLOT_WIDTH,
      y: valueToY(point.value, tickMin, tickMax),
      point,
    }));

    const areaPath = buildAreaPath(chartPoints, zeroY);
    const linePath = chartPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const isPositive = (values[values.length - 1] ?? 0) >= 0;

    return {
      yTicks,
      tickMin,
      tickMax,
      zeroY,
      chartPoints,
      areaPath,
      linePath,
      isPositive,
    };
  }, [points, plotHeight]);

  if (points.length === 0 || !chart) {
    return null;
  }

  const hovered = hoveredIndex != null ? chart.chartPoints[hoveredIndex] : null;
  const gradientId = chart.isPositive
    ? `${gradientIdPrefix}-positive`
    : `${gradientIdPrefix}-negative`;
  const strokeColor = "color-mix(in srgb, var(--edge-accent-blue) 70%, white)";

  return (
    <div className={`relative ${compact ? "min-h-28" : "min-h-32 flex-1"}`}>
      <svg
        data-testid={`${testId}-svg`}
        viewBox={`0 0 ${CHART_WIDTH} ${chartHeight}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id={`${gradientIdPrefix}-positive`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--edge-positive)" stopOpacity={0.55} />
            <stop offset="100%" stopColor="var(--edge-positive)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${gradientIdPrefix}-negative`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--edge-negative)" stopOpacity={0.55} />
            <stop offset="100%" stopColor="var(--edge-negative)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {chart.yTicks.map((tick) => {
          const y = valueToY(tick, chart.tickMin, chart.tickMax);
          return (
            <g key={tick} data-testid={`${testId}-y-tick`}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={CHART_WIDTH - PAD_RIGHT}
                y2={y}
                stroke="var(--edge-border-subtle)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={PAD_LEFT - 6}
                y={y + 3}
                textAnchor="end"
                fill="var(--edge-text-secondary)"
                fontSize={9}
                data-testid={`${testId}-y-label`}
              >
                {formatAxisMoney(tick)}
              </text>
            </g>
          );
        })}

        {chart.tickMin < 0 && chart.tickMax > 0 ? (
          <line
            x1={PAD_LEFT}
            y1={chart.zeroY}
            x2={CHART_WIDTH - PAD_RIGHT}
            y2={chart.zeroY}
            stroke="var(--edge-border)"
            strokeWidth={1}
          />
        ) : null}

        <path data-testid={`${testId}-area`} d={chart.areaPath} fill={`url(#${gradientId})`} />
        <path
          data-testid={`${testId}-line`}
          d={chart.linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.5}
        />

        {chart.chartPoints.map((cp, index) => (
          <circle
            key={cp.point.id}
            cx={cp.x}
            cy={cp.y}
            r={8}
            fill="transparent"
            data-testid={`${testId}-point-${cp.point.id}`}
            onMouseEnter={() => setHoveredIndex(index)}
          />
        ))}

        {xStartLabel ? (
          <text
            x={PAD_LEFT}
            y={chartHeight - 6}
            fill="var(--edge-text-secondary)"
            fontSize={9}
            data-testid={`${testId}-x-start`}
          >
            {xStartLabel}
          </text>
        ) : null}
        {xEndLabel ? (
          <text
            x={CHART_WIDTH - PAD_RIGHT}
            y={chartHeight - 6}
            textAnchor="end"
            fill="var(--edge-text-secondary)"
            fontSize={9}
            data-testid={`${testId}-x-end`}
          >
            {xEndLabel}
          </text>
        ) : null}
      </svg>

      {hovered ? (
        <div
          data-testid={`${testId}-hover-tooltip`}
          className="pointer-events-none absolute z-10 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1.5 text-xs shadow-md"
          style={{
            left: `${((hovered.x - PAD_LEFT) / PLOT_WIDTH) * 100}%`,
            top: `${(hovered.y / chartHeight) * 100}%`,
            transform: "translate(-50%, calc(-100% - 8px))",
          }}
        >
          <div className="font-semibold text-[var(--edge-text-strong)]">
            {hovered.point.tooltipTitle ?? hovered.point.id}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[var(--edge-text-secondary)]">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: strokeColor }}
            />
            <span>
              {hovered.point.tooltipValue ?? formatAxisMoney(hovered.point.value)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { formatAxisMoney as formatPnLAxisMoney };
