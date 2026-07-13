"use client";

import type { HeatMapConfig, HeatMapGroupBy, HeatMapColorMetric, HeatMapSizeMetric } from "@/lib/heatmap/types";
import { DEFAULT_HEAT_MAP_CONFIG } from "@/lib/heatmap/defaults";

export const HEAT_MAP_SIZE_OPTIONS: Array<{ id: HeatMapSizeMetric; label: string }> = [
  { id: "marketCap", label: "Market cap" },
  { id: "volume", label: "Volume" },
  { id: "equal", label: "Equal" },
];

export const HEAT_MAP_COLOR_OPTIONS: Array<{ id: HeatMapColorMetric; label: string }> = [
  { id: "changePercent", label: "Change 1D, %" },
  { id: "volume", label: "Volume" },
  { id: "beta", label: "Beta" },
];

export const HEAT_MAP_GROUP_OPTIONS: Array<{ id: HeatMapGroupBy; label: string }> = [
  { id: "none", label: "None" },
  { id: "sector", label: "Sector" },
  { id: "industry", label: "Industry" },
];

export const HEAT_MAP_SIZE_SCALE_OPTIONS: Array<{ id: "linear" | "log"; label: string }> = [
  { id: "linear", label: "Linear" },
  { id: "log", label: "Log" },
];

type Props = {
  config: HeatMapConfig;
  onChange: (config: HeatMapConfig) => void;
  className?: string;
};

function selectClassName(): string {
  return "h-7 rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-2 text-[11px] text-[var(--edge-text-primary)]";
}

export default function HeatMapToolbar({ config, onChange, className = "" }: Props) {
  const patch = (partial: Partial<HeatMapConfig>) => onChange({ ...config, ...partial });

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`.trim()}
      data-testid="heatmap-toolbar"
    >
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
        Size
        <select
          data-testid="heatmap-size-by"
          className={selectClassName()}
          value={config.sizeBy.metric}
          onChange={(event) =>
            patch({
              sizeBy: {
                ...config.sizeBy,
                metric: event.target.value as HeatMapSizeMetric,
              },
            })
          }
        >
          {HEAT_MAP_SIZE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {config.sizeBy.metric !== "equal" ? (
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
          Scale
          <select
            data-testid="heatmap-size-scale"
            className={selectClassName()}
            value={config.sizeBy.scale}
            onChange={(event) =>
              patch({
                sizeBy: {
                  ...config.sizeBy,
                  scale: event.target.value as "linear" | "log",
                },
              })
            }
          >
            {HEAT_MAP_SIZE_SCALE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
        Color
        <select
          data-testid="heatmap-color-by"
          className={selectClassName()}
          value={config.colorBy.metric}
          onChange={(event) => {
            const metric = event.target.value as HeatMapColorMetric;
            patch({
              colorBy: {
                ...config.colorBy,
                metric,
                scale:
                  metric === "changePercent"
                    ? DEFAULT_HEAT_MAP_CONFIG.colorBy.scale
                    : {
                        kind: "sequential",
                        domain: "data",
                      },
              },
            });
          }}
        >
          {HEAT_MAP_COLOR_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
        Group
        <select
          data-testid="heatmap-group-by"
          className={selectClassName()}
          value={config.groupBy}
          onChange={(event) =>
            patch({ groupBy: event.target.value as HeatMapGroupBy })
          }
        >
          {HEAT_MAP_GROUP_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
