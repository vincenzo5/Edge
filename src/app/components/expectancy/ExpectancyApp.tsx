"use client";

import { useCallback, useMemo } from "react";

import {
  DEFAULT_EXPECTANCY_PARAMS,
  DEFAULT_MONTE_CARLO_RUNS,
  EXPECTANCY_PRESETS,
  formatExpectancyMoney,
  formatExpectancyMultiple,
  formatExpectancyPercent,
  projectDeterministic,
  projectMonteCarlo,
  type ExpectancyParams,
  type ExpectancyPresetId,
} from "@/lib/trading/expectancyProjector";
import type { ExpectancyMode, ExpectancySurfaceParams } from "@/lib/appWorkspace/types";
import {
  EdgeLabeledInput,
  EdgeMetricTile,
  EdgeUnderlineTabs,
} from "@/app/components/design-system";
import JournalPnLAreaChart, {
  type PnLAreaChartPoint,
} from "@/app/components/journal/JournalPnLAreaChart";
import { useTileDensityOptional } from "@/app/components/app-workspace/TileDensityContext";

type Props = {
  mode: ExpectancyMode;
  params: ExpectancySurfaceParams;
  onModeChange: (mode: ExpectancyMode) => void;
  onParamsChange: (patch: Partial<ExpectancySurfaceParams>) => void;
};

type SliderFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  testId: string;
};

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  testId,
}: SliderFieldProps) {
  return (
    <div className="space-y-1" data-testid={testId}>
      <div className="flex items-center justify-between gap-2 text-xs text-[var(--edge-text-secondary)]">
        <span>{label}</span>
        <span className="tabular-nums text-[var(--edge-text-primary)]">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--edge-accent-blue)]"
        aria-label={label}
      />
    </div>
  );
}

function toExpectancyParams(surface: ExpectancySurfaceParams): ExpectancyParams {
  return {
    startingEquity: surface.startingEquity,
    years: surface.years,
    winRate: surface.winRate,
    avgWinR: surface.avgWinR,
    avgLossR: surface.avgLossR,
    riskFraction: surface.riskFraction,
    tradesPerWeek: surface.tradesPerWeek,
  };
}

export default function ExpectancyApp({ mode, params, onModeChange, onParamsChange }: Props) {
  const density = useTileDensityOptional()?.mode ?? "wide";
  const compact = density === "compact";

  const expectancyParams = useMemo(() => toExpectancyParams(params), [params]);

  const deterministic = useMemo(
    () => projectDeterministic(expectancyParams),
    [expectancyParams],
  );

  const monteCarlo = useMemo(() => {
    if (mode !== "monteCarlo") return null;
    return projectMonteCarlo(expectancyParams, {
      runs: params.monteCarloRuns ?? DEFAULT_MONTE_CARLO_RUNS,
      seed: params.monteCarloSeed ?? 42,
    });
  }, [expectancyParams, mode, params.monteCarloRuns, params.monteCarloSeed]);

  const chartPoints = useMemo((): PnLAreaChartPoint[] => {
    if (mode === "monteCarlo" && monteCarlo && !("ok" in monteCarlo)) {
      return monteCarlo.bandCurve.map((point, index) => ({
        id: `mc-${point.tradeIndex}`,
        value: point.median,
        tooltipTitle: `Trade ${point.tradeIndex}`,
        tooltipValue: formatExpectancyMoney(point.median),
      }));
    }
    if (deterministic && !("ok" in deterministic)) {
      return deterministic.curvePoints.map((point) => ({
        id: point.label,
        value: point.equity,
        tooltipTitle: point.label,
        tooltipValue: formatExpectancyMoney(point.equity),
      }));
    }
    return [];
  }, [deterministic, mode, monteCarlo]);

  const applyPreset = useCallback(
    (presetId: ExpectancyPresetId) => {
      const preset = EXPECTANCY_PRESETS.find((item) => item.id === presetId);
      if (!preset) return;
      onParamsChange({
        presetId,
        startingEquity: preset.startingEquity,
        years: preset.years,
        winRate: preset.winRate,
        avgWinR: preset.avgWinR,
        avgLossR: preset.avgLossR,
        riskFraction: preset.riskFraction,
        tradesPerWeek: preset.tradesPerWeek,
      });
    },
    [onParamsChange],
  );

  const patchNumber = useCallback(
    (field: keyof ExpectancySurfaceParams, value: number) => {
      onParamsChange({ [field]: value, presetId: "custom" });
    },
    [onParamsChange],
  );

  const errorMessage =
    deterministic && "ok" in deterministic && deterministic.ok === false
      ? deterministic.error
      : monteCarlo && "ok" in monteCarlo && monteCarlo.ok === false
        ? monteCarlo.error
        : null;

  const endingEquity =
    mode === "monteCarlo" && monteCarlo && !("ok" in monteCarlo)
      ? monteCarlo.medianEnding
      : deterministic && !("ok" in deterministic)
        ? deterministic.endingEquity
        : null;

  const summaryLine = `Risk ${formatExpectancyPercent(params.riskFraction)} · WR ${formatExpectancyPercent(params.winRate, 0)} · ${params.avgWinR}R / ${params.avgLossR}R · ${params.tradesPerWeek}/wk · ${params.years}y`;

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--edge-surface-panel)]"
      data-testid="expectancy-app"
    >
      <div className="shrink-0 border-b border-[var(--edge-border-subtle)] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--edge-text-primary)]">Expectancy</h2>
            <p className="text-[11px] text-[var(--edge-text-muted)]">
              Project equity from win rate, R-multiples, and risk sizing
            </p>
          </div>
          <EdgeUnderlineTabs
            segments={[
              { id: "deterministic", label: "Deterministic", testId: "expectancy-mode-deterministic" },
              { id: "monteCarlo", label: "Monte Carlo", testId: "expectancy-mode-monte-carlo" },
            ]}
            value={mode}
            onChange={(next) => onModeChange(next as ExpectancyMode)}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXPECTANCY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              data-testid={`expectancy-preset-${preset.id}`}
              className={`rounded border px-2 py-1 text-[11px] transition-colors ${
                params.presetId === preset.id
                  ? "border-[var(--edge-accent-blue)] bg-[var(--edge-surface-hover)] text-[var(--edge-text-primary)]"
                  : "border-[var(--edge-border-subtle)] text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)]"
              }`}
              onClick={() => applyPreset(preset.id)}
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`min-h-0 flex-1 overflow-auto ${
          compact ? "flex flex-col gap-3 p-3" : "grid lg:grid-cols-[minmax(260px,320px)_1fr] lg:gap-0"
        }`}
      >
        <section
          className={`space-y-3 ${compact ? "" : "border-r border-[var(--edge-border-subtle)] p-3"}`}
          data-testid="expectancy-params"
        >
          <EdgeLabeledInput
            label="Starting equity"
            type="number"
            min={1}
            step={1000}
            value={params.startingEquity}
            density="compact"
            testId="expectancy-starting-equity"
            onChange={(event) => patchNumber("startingEquity", Number(event.target.value))}
          />

          <SliderField
            label="Horizon (years)"
            value={params.years}
            min={1}
            max={20}
            step={0.5}
            format={(value) => `${value}y`}
            testId="expectancy-years"
            onChange={(value) => patchNumber("years", value)}
          />

          <SliderField
            label="Win rate"
            value={params.winRate}
            min={0.05}
            max={0.95}
            step={0.01}
            format={(value) => formatExpectancyPercent(value, 0)}
            testId="expectancy-win-rate"
            onChange={(value) => patchNumber("winRate", value)}
          />

          <div className="grid grid-cols-2 gap-2">
            <EdgeLabeledInput
              label="Avg win (R)"
              type="number"
              min={0.1}
              step={0.1}
              value={params.avgWinR}
              density="compact"
              testId="expectancy-avg-win-r"
              onChange={(event) => patchNumber("avgWinR", Number(event.target.value))}
            />
            <EdgeLabeledInput
              label="Avg loss (R)"
              type="number"
              min={0.1}
              step={0.1}
              value={params.avgLossR}
              density="compact"
              testId="expectancy-avg-loss-r"
              onChange={(event) => patchNumber("avgLossR", Number(event.target.value))}
            />
          </div>

          <SliderField
            label="Risk per trade"
            value={params.riskFraction}
            min={0.005}
            max={0.25}
            step={0.005}
            format={(value) => formatExpectancyPercent(value)}
            testId="expectancy-risk"
            onChange={(value) => patchNumber("riskFraction", value)}
          />

          <SliderField
            label="Trades per week"
            value={params.tradesPerWeek}
            min={0.25}
            max={10}
            step={0.25}
            format={(value) => value.toFixed(2)}
            testId="expectancy-trades-per-week"
            onChange={(value) => patchNumber("tradesPerWeek", value)}
          />

          {mode === "monteCarlo" ? (
            <EdgeLabeledInput
              label="Monte Carlo runs"
              type="number"
              min={100}
              max={5000}
              step={100}
              value={params.monteCarloRuns ?? DEFAULT_MONTE_CARLO_RUNS}
              density="compact"
              testId="expectancy-mc-runs"
              onChange={(event) =>
                onParamsChange({
                  monteCarloRuns: Number(event.target.value),
                  presetId: "custom",
                })
              }
            />
          ) : null}
        </section>

        <section className={`space-y-3 ${compact ? "" : "p-3"}`} data-testid="expectancy-projection">
          {errorMessage ? (
            <p className="text-sm text-[var(--edge-negative)]" data-testid="expectancy-error">
              {errorMessage}
            </p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <EdgeMetricTile
              label="Ending equity"
              value={endingEquity != null ? formatExpectancyMoney(endingEquity) : "—"}
              labelUppercase
              data-testid="expectancy-ending-equity"
            />
            {deterministic && !("ok" in deterministic) ? (
              <>
                <EdgeMetricTile
                  label="Multiple"
                  value={formatExpectancyMultiple(deterministic.multiple)}
                  labelUppercase
                  data-testid="expectancy-multiple"
                />
                <EdgeMetricTile
                  label="CAGR"
                  value={formatExpectancyPercent(deterministic.cagr)}
                  labelUppercase
                  data-testid="expectancy-cagr"
                />
                <EdgeMetricTile
                  label="EV / trade"
                  value={`${deterministic.evR.toFixed(2)}R`}
                  labelUppercase
                  data-testid="expectancy-ev"
                />
              </>
            ) : null}
            {mode === "monteCarlo" && monteCarlo && !("ok" in monteCarlo) ? (
              <>
                <EdgeMetricTile
                  label="P10 ending"
                  value={formatExpectancyMoney(monteCarlo.p10Ending)}
                  labelUppercase
                  data-testid="expectancy-p10"
                />
                <EdgeMetricTile
                  label="P90 ending"
                  value={formatExpectancyMoney(monteCarlo.p90Ending)}
                  labelUppercase
                  data-testid="expectancy-p90"
                />
                <EdgeMetricTile
                  label="Ruin rate"
                  value={formatExpectancyPercent(monteCarlo.ruinRate)}
                  labelUppercase
                  data-testid="expectancy-ruin-rate"
                />
                <EdgeMetricTile
                  label="Median max DD"
                  value={formatExpectancyPercent(monteCarlo.medianMaxDrawdown)}
                  labelUppercase
                  data-testid="expectancy-median-dd"
                />
              </>
            ) : null}
          </div>

          {deterministic && !("ok" in deterministic) ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <EdgeMetricTile
                label="Trades total"
                value={String(deterministic.tradeCount)}
                labelUppercase
              />
              <EdgeMetricTile
                label="5-loss streak DD"
                value={formatExpectancyPercent(deterministic.drawdownStreak5)}
                labelUppercase
              />
              <EdgeMetricTile
                label="8-loss streak DD"
                value={formatExpectancyPercent(deterministic.drawdownStreak8)}
                labelUppercase
              />
            </div>
          ) : null}

          <div className="rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-toolbar)] p-2">
            <JournalPnLAreaChart
              points={chartPoints}
              compact={compact}
              testId="expectancy-equity-curve"
              ariaLabel="Projected equity curve"
              xStartLabel="Start"
              xEndLabel={mode === "monteCarlo" ? "Median path" : "End"}
              gradientIdPrefix="expectancy"
            />
          </div>
        </section>
      </div>

      <div
        className="shrink-0 border-t border-[var(--edge-border-subtle)] px-3 py-1.5 text-[11px] text-[var(--edge-text-muted)]"
        data-testid="expectancy-summary"
      >
        {summaryLine}
      </div>
    </div>
  );
}

function defaultSurfaceParams(): ExpectancySurfaceParams {
  return {
    presetId: "aggressive_10pct",
    ...DEFAULT_EXPECTANCY_PARAMS,
    monteCarloRuns: DEFAULT_MONTE_CARLO_RUNS,
    monteCarloSeed: 42,
  };
}

export { defaultSurfaceParams };
