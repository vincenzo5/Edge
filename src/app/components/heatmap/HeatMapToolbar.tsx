"use client";

import type { HeatMapConfig, HeatMapGroupBy, HeatMapColorMetric, HeatMapSizeMetric } from "@/lib/heatmap/types";
import { DEFAULT_HEAT_MAP_CONFIG } from "@/lib/heatmap/defaults";
import { EdgeSegmentedTabs, EdgeSelect } from "../design-system";

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

export default function HeatMapToolbar({ config, onChange, className = "" }: Props) {
  const patch = (partial: Partial<HeatMapConfig>) => onChange({ ...config, ...partial });

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`.trim()}
      data-testid="heatmap-toolbar"
    >
      <EdgeSelect
        testId="heatmap-size-by"
        variant="chip"
        label="Size"
        density="compact"
        value={config.sizeBy.metric}
        onChange={(metric) =>
          patch({
            sizeBy: {
              ...config.sizeBy,
              metric: metric as HeatMapSizeMetric,
            },
          })
        }
        options={HEAT_MAP_SIZE_OPTIONS.map((option) => ({
          value: option.id,
          label: option.label,
        }))}
        minWidth={140}
      />

      {config.sizeBy.metric !== "equal" ? (
        <div data-testid="heatmap-size-scale">
          <EdgeSegmentedTabs
            segments={HEAT_MAP_SIZE_SCALE_OPTIONS.map((option) => ({
              id: option.id,
              label: option.label,
            }))}
            value={config.sizeBy.scale}
            onChange={(scale) =>
              patch({
                sizeBy: {
                  ...config.sizeBy,
                  scale: scale as "linear" | "log",
                },
              })
            }
          />
        </div>
      ) : null}

      <EdgeSelect
        testId="heatmap-color-by"
        variant="chip"
        label="Color"
        density="compact"
        value={config.colorBy.metric}
        onChange={(metric) => {
          const nextMetric = metric as HeatMapColorMetric;
          patch({
            colorBy: {
              ...config.colorBy,
              metric: nextMetric,
              scale:
                nextMetric === "changePercent"
                  ? DEFAULT_HEAT_MAP_CONFIG.colorBy.scale
                  : {
                      kind: "sequential",
                      domain: "data",
                    },
            },
          });
        }}
        options={HEAT_MAP_COLOR_OPTIONS.map((option) => ({
          value: option.id,
          label: option.label,
        }))}
        minWidth={150}
      />

      <EdgeSelect
        testId="heatmap-group-by"
        variant="chip"
        label="Group"
        density="compact"
        value={config.groupBy}
        onChange={(groupBy) => patch({ groupBy: groupBy as HeatMapGroupBy })}
        options={HEAT_MAP_GROUP_OPTIONS.map((option) => ({
          value: option.id,
          label: option.label,
        }))}
        minWidth={120}
      />
    </div>
  );
}
