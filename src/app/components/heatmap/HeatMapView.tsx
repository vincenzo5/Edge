"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  colorForValue,
  formatColorValue,
  resolveColorDomain,
  type HeatMapConfig,
  type HeatMapItem,
  type HeatMapPalette,
  type HeatMapRect,
  layoutHeatMap,
  leafRects,
} from "@/lib/heatmap";
import {
  DEFAULT_HEAT_MAP_CONFIG,
  DEFAULT_HEAT_MAP_LABEL_THRESHOLDS,
} from "@/lib/heatmap/defaults";
import { edgeTokens } from "@/lib/design-system/edge";
import { EdgeEmptyState } from "../design-system";

const DEFAULT_PALETTE: HeatMapPalette = {
  positive: edgeTokens.dark.positive,
  negative: edgeTokens.dark.negative,
  neutral: edgeTokens.dark.textSecondary,
};

type Props = {
  items: HeatMapItem[];
  config?: HeatMapConfig;
  palette?: HeatMapPalette;
  onLeafClick?: (item: HeatMapItem) => void;
  className?: string;
  layoutSize?: { width: number; height: number };
};

function legendStops(config: HeatMapConfig, domain: { min: number; mid: number; max: number }) {
  if (config.colorBy.scale.kind === "diverging") {
    return [
      { label: formatColorValue(domain.min, config.colorBy.metric), color: colorForValue(domain.min, config.colorBy, domain, DEFAULT_PALETTE) },
      { label: formatColorValue(domain.mid, config.colorBy.metric), color: colorForValue(domain.mid, config.colorBy, domain, DEFAULT_PALETTE) },
      { label: formatColorValue(domain.max, config.colorBy.metric), color: colorForValue(domain.max, config.colorBy, domain, DEFAULT_PALETTE) },
    ];
  }
  return [
    { label: formatColorValue(domain.min, config.colorBy.metric), color: colorForValue(domain.min, config.colorBy, domain, DEFAULT_PALETTE) },
    { label: formatColorValue(domain.max, config.colorBy.metric), color: colorForValue(domain.max, config.colorBy, domain, DEFAULT_PALETTE) },
  ];
}

function LeafLabel({
  rect,
  config,
}: {
  rect: HeatMapRect;
  config: HeatMapConfig;
}) {
  const showSymbol =
    rect.width >= DEFAULT_HEAT_MAP_LABEL_THRESHOLDS.showSymbolMinPx &&
    rect.height >= DEFAULT_HEAT_MAP_LABEL_THRESHOLDS.showSymbolMinPx;
  const showValue =
    rect.width >= DEFAULT_HEAT_MAP_LABEL_THRESHOLDS.showValueMinPx &&
    rect.height >= DEFAULT_HEAT_MAP_LABEL_THRESHOLDS.showValueMinPx;
  if (!showSymbol) return null;

  const valueLabel = formatColorValue(rect.colorValue, config.colorBy.metric);
  const tone =
    rect.colorValue == null
      ? "text-[var(--edge-text-secondary)]"
      : rect.colorValue > 0
        ? "text-[var(--edge-positive)]"
        : rect.colorValue < 0
          ? "text-[var(--edge-negative)]"
          : "text-[var(--edge-text-secondary)]";

  return (
    <div className="pointer-events-none flex h-full w-full flex-col items-start justify-end overflow-hidden p-1">
      <span className="truncate text-[11px] font-semibold text-[var(--edge-text-strong)]">
        {rect.label}
      </span>
      {showValue ? (
        <span className={`truncate text-[10px] tabular-nums ${tone}`}>{valueLabel}</span>
      ) : null}
    </div>
  );
}

export default function HeatMapView({
  items,
  config = DEFAULT_HEAT_MAP_CONFIG,
  palette = DEFAULT_PALETTE,
  onLeafClick,
  className = "",
  layoutSize,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      setSize({
        width: Math.max(0, element.clientWidth),
        height: Math.max(0, element.clientHeight),
      });
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const colorValues = useMemo(
    () => items.map((item) => item.colorValue),
    [items],
  );
  const domain = useMemo(
    () => resolveColorDomain(colorValues, config.colorBy.scale),
    [colorValues, config.colorBy.scale],
  );

  const rects = useMemo(
    () =>
      layoutHeatMap(
        items,
        config,
        layoutSize?.width ?? size.width,
        layoutSize?.height ?? size.height,
      ),
    [items, config, layoutSize?.width, layoutSize?.height, size.width, size.height],
  );

  const leaves = useMemo(() => leafRects(rects), [rects]);
  const hoveredRect = rects.find((rect) => rect.id === hoveredId) ?? null;
  const stops = useMemo(() => legendStops(config, domain), [config, domain]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, rect: HeatMapRect) => {
      if (rect.kind !== "leaf" || !rect.item || !onLeafClick) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onLeafClick(rect.item);
      }
    },
    [onLeafClick],
  );

  if (items.length === 0) {
    return (
      <div className={`flex min-h-0 flex-1 items-center justify-center ${className}`.trim()}>
        <EdgeEmptyState message="No items to display." />
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col ${className}`.trim()}
      data-testid="heatmap-view"
    >
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
        {rects.map((rect) => {
          if (rect.kind === "group") {
            return (
              <div
                key={rect.id}
                className="absolute overflow-hidden rounded-[var(--edge-radius-xs)] border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)]"
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                }}
                data-testid={`heatmap-group-${rect.label}`}
              >
                <div className="truncate px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
                  {rect.label}
                </div>
              </div>
            );
          }

          const fill = colorForValue(rect.colorValue, config.colorBy, domain, palette);
          const isHovered = hoveredId === rect.id;
          return (
            <button
              key={rect.id}
              type="button"
              data-testid={`heatmap-leaf-${rect.id}`}
              className={`edge-focus-ring absolute overflow-hidden rounded-[var(--edge-radius-xs)] border border-[var(--edge-border-subtle)] text-left transition-[box-shadow] ${
                isHovered ? "z-10 ring-1 ring-[var(--edge-accent-blue)]" : ""
              }`}
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                backgroundColor: fill,
              }}
              onMouseEnter={() => setHoveredId(rect.id)}
              onMouseLeave={() => setHoveredId((current) => (current === rect.id ? null : current))}
              onFocus={() => setHoveredId(rect.id)}
              onBlur={() => setHoveredId((current) => (current === rect.id ? null : current))}
              onClick={() => rect.item && onLeafClick?.(rect.item)}
              onKeyDown={(event) => handleKeyDown(event, rect)}
              title={`${rect.label} ${formatColorValue(rect.colorValue, config.colorBy.metric)}`}
            >
              <LeafLabel rect={rect} config={config} />
            </button>
          );
        })}

        {hoveredRect?.kind === "leaf" && hoveredRect.item ? (
          <div
            className="pointer-events-none absolute bottom-2 left-2 z-20 rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] bg-[var(--edge-surface-popover)] px-2 py-1 text-[10px] text-[var(--edge-text-primary)] shadow-[var(--edge-shadow-popover)]"
            data-testid="heatmap-tooltip"
          >
            <div className="font-semibold text-[var(--edge-text-strong)]">{hoveredRect.label}</div>
            <div>
              {config.colorBy.metric}: {formatColorValue(hoveredRect.colorValue, config.colorBy.metric)}
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="mt-2 flex items-center gap-2 px-1"
        data-testid="heatmap-legend"
        aria-label="Heat map color legend"
      >
        {stops.map((stop) => (
          <div key={stop.label} className="flex items-center gap-1 text-[10px] text-[var(--edge-text-muted)]">
            <span
              className="inline-block h-3 w-6 rounded-[var(--edge-radius-xs)] border border-[var(--edge-border-subtle)]"
              style={{ backgroundColor: stop.color }}
            />
            {stop.label}
          </div>
        ))}
        <span className="ml-auto text-[10px] text-[var(--edge-text-muted)]">
          {leaves.length} symbol{leaves.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
