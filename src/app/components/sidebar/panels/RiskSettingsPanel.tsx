"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveChart } from "../../ActiveChartContext";
import { useQuote } from "@/lib/marketData/useQuotes";
import { useRiskSettings } from "../../RiskSettingsProvider";
import { useRiskPositionBinding } from "../../risk/RiskPositionBindingContext";
import { useRiskLiquidationOverlay } from "../../risk/RiskLiquidationOverlayContext";
import {
  computeEquityPositionSize,
  equityPositionSizeErrorMessage,
} from "@/lib/risk/equityPositionSize";
import { projectHoldToStop } from "@/lib/risk/marginContext";
import {
  DEFAULT_RISK_SETTINGS,
  type RiskSizingMode,
} from "@/lib/risk/riskSettings";
import { RiskMarginCard } from "../../risk/RiskMarginCard";
import { useRiskMarginContext } from "../../risk/useRiskMarginContext";
import { EdgeButton } from "../../design-system";
import { fieldClass } from "../../design-system/styles";
import { PanelPopOutButton } from "../PanelChromeActions";

function formatMoney(
  value: number | null | undefined,
  options?: { fractionDigits?: number },
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const fractionDigits = options?.fractionDigits ?? 0;
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatPrice(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parsePriceInput(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const RISK_PERCENT_STEP = 0.25;

function toggleSizingMode(current: RiskSizingMode): RiskSizingMode {
  return current === "absolute" ? "percent" : "absolute";
}

function clampRiskPercent(value: number): number {
  return Math.min(Math.max(value, RISK_PERCENT_STEP), 100);
}

function snapRiskPercent(value: number): number {
  const clamped = clampRiskPercent(value);
  return Math.round(clamped / RISK_PERCENT_STEP) * RISK_PERCENT_STEP;
}

function clampAbsoluteRisk(value: number): number {
  return Math.min(Math.max(value, 1), 10_000_000);
}

function parseDraftNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const riskBudgetInputShellClass =
  "flex min-w-0 items-stretch overflow-hidden rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] edge-type-body text-[var(--edge-text-primary)] edge-control-standard";

const riskBudgetInputClass =
  "min-w-0 flex-1 border-0 bg-transparent px-[var(--edge-space-2)] text-[var(--edge-text-primary)] outline-none placeholder:text-[var(--edge-text-muted)]";

const riskBudgetToggleClass =
  "edge-focus-ring flex w-8 shrink-0 items-center justify-center border-0 bg-transparent text-[11px] font-semibold text-[var(--edge-text-muted)] hover:text-[var(--edge-text-strong)]";

const levelFieldShellClass =
  "flex min-w-0 items-stretch overflow-hidden rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] edge-control-standard";

const levelFieldInputClass =
  "min-w-0 flex-1 border-0 bg-transparent px-[var(--edge-space-2)] text-[var(--edge-text-primary)] outline-none placeholder:text-[var(--edge-text-muted)]";

const inlineRefreshButtonClass =
  "edge-focus-ring flex w-7 shrink-0 items-center justify-center border-0 border-l border-[var(--edge-border)] bg-transparent text-[var(--edge-text-muted)] hover:text-[var(--edge-text-strong)] disabled:cursor-not-allowed disabled:opacity-40";

function RefreshIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={className ? undefined : size}
      height={className ? undefined : size}
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 2.5v3.5h3.5" />
      <path d="M13.5 13.5v-3.5h-3.5" />
      <path d="M12.1 5.9A5 5 0 0 0 3.4 4.4L2.5 6M13.5 10l-.9 1.6A5 5 0 0 1 3.9 11.1" />
    </svg>
  );
}

export function RiskSettingsPanel() {
  const {
    settings,
    dollarRisk,
    accountBasisValue,
    basisStale,
    updateSettings,
    resetSettings,
  } = useRiskSettings();
  const { bind, linked, levels, markManualOverride, relink } = useRiskPositionBinding();
  const activeChart = useActiveChart();
  const symbol = activeChart?.config.symbol?.trim().toUpperCase() ?? null;
  const quote = useQuote(symbol);
  const [entryInput, setEntryInput] = useState("");
  const [stopInput, setStopInput] = useState("");
  const [riskPercentInput, setRiskPercentInput] = useState(String(settings.riskPercent));
  const [absoluteRiskInput, setAbsoluteRiskInput] = useState(String(settings.absoluteRisk));
  const [riskPercentFocused, setRiskPercentFocused] = useState(false);
  const [absoluteRiskFocused, setAbsoluteRiskFocused] = useState(false);

  useEffect(() => {
    if (!riskPercentFocused) {
      setRiskPercentInput(String(settings.riskPercent));
    }
  }, [settings.riskPercent, riskPercentFocused]);

  useEffect(() => {
    if (!absoluteRiskFocused) {
      setAbsoluteRiskInput(String(settings.absoluteRisk));
    }
  }, [settings.absoluteRisk, absoluteRiskFocused]);

  useEffect(() => {
    if (!linked || !levels) return;
    setEntryInput(formatPrice(levels.entry));
    setStopInput(formatPrice(levels.stop));
  }, [linked, levels?.entry, levels?.stop, levels?.direction]);

  const lastPrice = useMemo(() => {
    const price = quote?.regularMarketPrice;
    return price != null && Number.isFinite(price) ? price : null;
  }, [quote]);

  const entry = parsePriceInput(entryInput);
  const stop = parsePriceInput(stopInput);

  const positionSize = useMemo(() => {
    if (entry == null || stop == null) return null;
    return computeEquityPositionSize({ entry, stop, dollarRisk });
  }, [entry, stop, dollarRisk]);

  const stopDistance = useMemo(() => {
    if (entry == null || stop == null) return null;
    const distance = Math.abs(entry - stop);
    if (!Number.isFinite(distance) || distance <= 0) return null;
    const pct = (distance / entry) * 100;
    return { distance, pct };
  }, [entry, stop]);

  const budgetHint = useMemo(() => {
    if (settings.sizingMode === "absolute") {
      return `Fixed risk ${formatMoney(settings.absoluteRisk)} per trade`;
    }
    if (accountBasisValue == null) {
      return "Connect an account or switch to $ absolute to size by percent.";
    }
    return `${settings.riskPercent}% of ${formatMoney(accountBasisValue)} Net liquidation ≈ ${formatMoney(dollarRisk)}`;
  }, [settings, accountBasisValue, dollarRisk]);

  const statusLine = useMemo(() => {
    const parts: string[] = [];
    if (symbol) parts.push(symbol);
    if (linked && levels) {
      parts.push(levels.direction === "long" ? "Long" : "Short");
      parts.push("linked to chart");
    }
    return parts.join(" · ");
  }, [symbol, linked, levels]);

  const marginContext = useRiskMarginContext({
    symbol,
    shares: positionSize?.ok ? positionSize.shares : null,
    direction: positionSize?.ok ? positionSize.direction : null,
    notional: positionSize?.ok ? positionSize.notional : null,
    entryPrice: positionSize?.ok ? positionSize.entryPrice : entry,
    enabled: positionSize?.ok === true,
  });

  const holdToStop = useMemo(() => {
    if (
      !positionSize?.ok ||
      marginContext.impact == null ||
      entry == null ||
      stop == null
    ) {
      return null;
    }
    return projectHoldToStop({
      entry,
      stop,
      shares: positionSize.shares,
      direction: positionSize.direction,
      impact: marginContext.impact,
    });
  }, [positionSize, entry, stop, marginContext.impact]);

  const { setOverlay } = useRiskLiquidationOverlay();

  useEffect(() => {
    if (holdToStop != null) {
      setOverlay({
        price: holdToStop.liquidationPrice,
        verdict: holdToStop.verdict,
      });
    } else {
      setOverlay(null);
    }
    return () => setOverlay(null);
  }, [holdToStop?.liquidationPrice, holdToStop?.verdict, setOverlay]);

  return (
    <div
      data-testid="risk-settings-panel"
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 text-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--edge-text-strong)]">Risk calculator</h2>
        <div className="flex items-center gap-1">
          <PanelPopOutButton label="Pop out" />
          <EdgeButton type="button" data-testid="risk-settings-reset" onClick={resetSettings}>
            Reset
          </EdgeButton>
        </div>
      </div>

      {statusLine ? (
        <p className="text-[10px] text-[var(--edge-text-muted)]" data-testid="risk-calculator-status">
          {statusLine}
        </p>
      ) : null}

      {linked && levels ? (
        <p
          className="sr-only"
          data-testid="risk-position-size-linked"
        >
          Linked to {levels.direction === "long" ? "Long" : "Short"} position on chart
        </p>
      ) : null}

      <RiskMarginCard
        shares={positionSize?.ok ? positionSize.shares : null}
        atRisk={positionSize?.ok ? positionSize.actualRiskDollars : null}
        cost={positionSize?.ok ? positionSize.notional : null}
        sizeError={
          positionSize && !positionSize.ok
            ? equityPositionSizeErrorMessage(positionSize.reason)
            : null
        }
        sizeHint={
          positionSize == null ? "Enter entry and stop to calculate share size." : null
        }
        accountConnected={marginContext.accountConnected}
        current={marginContext.current}
        impact={marginContext.impact}
        impactStatus={marginContext.impactStatus}
        currentStatus={marginContext.currentStatus}
        loading={marginContext.loading}
        error={marginContext.error}
        showImpact={positionSize?.ok === true}
        holdToStop={holdToStop}
        showLiquidationLine={settings.showLiquidationLine}
        onShowLiquidationLineChange={(showLiquidationLine) =>
          updateSettings({ showLiquidationLine })
        }
      />

      <section data-testid="risk-position-size-section" className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
            Levels
          </span>
          {bind ? (
            <button
              type="button"
              data-testid="risk-position-size-sync-chart"
              aria-label="Sync entry and stop from chart"
              title="Sync entry and stop from chart"
              onClick={relink}
              className={`${inlineRefreshButtonClass} rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)]`}
            >
              <RefreshIcon />
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[var(--edge-text-secondary)]">
            <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
              Entry
            </span>
            <div className={levelFieldShellClass}>
              <input
                type="number"
                min={0}
                step="0.01"
                value={entryInput}
                onChange={(event) => {
                  markManualOverride();
                  setEntryInput(event.target.value);
                }}
                className={`edge-focus-ring ${levelFieldInputClass}`}
                data-testid="risk-position-size-entry"
              />
              <button
                type="button"
                data-testid="risk-position-size-use-last"
                aria-label="Set entry to last price"
                title={
                  lastPrice == null ? "No quote for active chart symbol" : "Set entry to last price"
                }
                disabled={lastPrice == null}
                onClick={() => {
                  if (lastPrice != null) {
                    markManualOverride();
                    setEntryInput(formatPrice(lastPrice));
                  }
                }}
                className={inlineRefreshButtonClass}
              >
                <RefreshIcon />
              </button>
            </div>
          </label>
          <label className="block text-[var(--edge-text-secondary)]">
            <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
              Stop
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={stopInput}
              onChange={(event) => {
                markManualOverride();
                setStopInput(event.target.value);
              }}
              className={`edge-focus-ring w-full ${fieldClass()}`}
              data-testid="risk-position-size-stop"
            />
          </label>
        </div>
        {stopDistance ? (
          <p className="text-[10px] text-[var(--edge-text-muted)]" data-testid="risk-stop-distance">
            Stop dist {formatMoney(stopDistance.distance, { fractionDigits: 2 })} ·{" "}
            {stopDistance.pct.toFixed(1)}%
          </p>
        ) : null}
      </section>

      <section className="space-y-2 border-t border-[var(--edge-border)] pt-3">
        <label className="block text-[var(--edge-text-secondary)]">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
            {settings.sizingMode === "percent" ? "Risk percent" : "Risk amount"}
          </span>
          <div className={riskBudgetInputShellClass}>
            {settings.sizingMode === "percent" ? (
              <input
                type="number"
                min={RISK_PERCENT_STEP}
                max={100}
                step={RISK_PERCENT_STEP}
                value={riskPercentInput}
                onFocus={() => setRiskPercentFocused(true)}
                onChange={(event) => {
                  const raw = event.target.value;
                  setRiskPercentInput(raw);
                  const parsed = parseDraftNumber(raw);
                  if (parsed != null && parsed > 0) {
                    updateSettings({ riskPercent: clampRiskPercent(parsed) });
                  }
                }}
                onBlur={() => {
                  setRiskPercentFocused(false);
                  const parsed = parseDraftNumber(riskPercentInput);
                  const next =
                    parsed != null && parsed > 0
                      ? snapRiskPercent(parsed)
                      : DEFAULT_RISK_SETTINGS.riskPercent;
                  updateSettings({ riskPercent: next });
                  setRiskPercentInput(String(next));
                }}
                className={`edge-focus-ring ${riskBudgetInputClass}`}
                data-testid="risk-settings-percent"
              />
            ) : (
              <input
                type="number"
                min={1}
                value={absoluteRiskInput}
                onFocus={() => setAbsoluteRiskFocused(true)}
                onChange={(event) => {
                  const raw = event.target.value;
                  setAbsoluteRiskInput(raw);
                  const parsed = parseDraftNumber(raw);
                  if (parsed != null && parsed > 0) {
                    updateSettings({ absoluteRisk: clampAbsoluteRisk(parsed) });
                  }
                }}
                onBlur={() => {
                  setAbsoluteRiskFocused(false);
                  const parsed = parseDraftNumber(absoluteRiskInput);
                  const next =
                    parsed != null && parsed > 0
                      ? clampAbsoluteRisk(parsed)
                      : DEFAULT_RISK_SETTINGS.absoluteRisk;
                  updateSettings({ absoluteRisk: next });
                  setAbsoluteRiskInput(String(next));
                }}
                className={`edge-focus-ring ${riskBudgetInputClass}`}
                data-testid="risk-settings-absolute"
              />
            )}
            <div className="w-px self-stretch bg-[var(--edge-border)]" aria-hidden />
            <button
              type="button"
              data-testid="risk-settings-mode-toggle"
              aria-label={
                settings.sizingMode === "absolute"
                  ? "Switch to percent of account"
                  : "Switch to fixed dollar amount"
              }
              title={
                settings.sizingMode === "absolute"
                  ? "Switch to percent of account"
                  : "Switch to fixed dollar amount"
              }
              onClick={() =>
                updateSettings({ sizingMode: toggleSizingMode(settings.sizingMode) })
              }
              className={riskBudgetToggleClass}
            >
              {settings.sizingMode === "absolute" ? "$" : "%"}
            </button>
          </div>
        </label>

        <p
          data-testid="risk-settings-readout"
          className="text-[10px] text-[var(--edge-text-muted)]"
        >
          {budgetHint}
          {basisStale ? (
            <span
              data-testid="risk-settings-stale-badge"
              className="ml-1 rounded bg-[var(--edge-surface-toolbar)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]"
            >
              stale
            </span>
          ) : null}
        </p>
      </section>
    </div>
  );
}
