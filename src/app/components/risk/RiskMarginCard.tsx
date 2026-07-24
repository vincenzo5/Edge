"use client";

import type {
  HoldToStopProjection,
  MarginImpact,
  MarginSnapshot,
  MarginStatus,
} from "@/lib/risk/marginContext";
import {
  computeMarginBarSegments,
  formatHoldToStopPrice,
  formatMarginUtilRange,
  formatUtilizationPercent,
  marginStatusBarColor,
  marginStatusPlainLabel,
  marginStatusTextClass,
} from "@/lib/risk/marginContext";
import { EdgeSpinner, EdgeToggleSwitch } from "../design-system";

function formatLiquidationLine(projection: HoldToStopProjection): string {
  const liq = `Liq ${formatHoldToStopPrice(projection.liquidationPrice)}`;
  if (projection.verdict === "margin_call_first") {
    return `${liq} · Margin call first`;
  }
  return `${liq} · Stop reachable`;
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatSignedMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const formatted = formatMoney(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

function mergeStatus(current: MarginStatus | null, impact: MarginStatus | null): MarginStatus | null {
  if (current === "over" || impact === "over") return "over";
  if (current === "tight" || impact === "tight") return "tight";
  if (current != null || impact != null) return "ok";
  return null;
}

export type RiskTradeSizeProps = {
  shares: number | null;
  atRisk: number | null;
  cost: number | null;
  sizeError: string | null;
  sizeHint: string | null;
};

type RiskMarginCardProps = RiskTradeSizeProps & {
  accountConnected: boolean;
  current: MarginSnapshot | null;
  impact: MarginImpact | null;
  impactStatus: MarginStatus | null;
  currentStatus: MarginStatus | null;
  loading: boolean;
  error: string | null;
  showImpact: boolean;
  holdToStop: HoldToStopProjection | null;
  showLiquidationLine: boolean;
  onShowLiquidationLineChange: (value: boolean) => void;
};

export function RiskMarginCard({
  shares,
  atRisk,
  cost,
  sizeError,
  sizeHint,
  accountConnected,
  current,
  impact,
  impactStatus,
  currentStatus,
  loading,
  error,
  showImpact,
  holdToStop,
  showLiquidationLine,
  onShowLiquidationLineChange,
}: RiskMarginCardProps) {
  const hasSizedTrade = shares != null && atRisk != null && cost != null;
  const currentUtil = current?.utilization ?? null;
  const projectedUtil = showImpact ? (impact?.projectedUtilization ?? null) : null;
  const segments = computeMarginBarSegments(currentUtil, projectedUtil);
  const displayStatus = mergeStatus(currentStatus, showImpact ? impactStatus : null);
  const plainStatus = marginStatusPlainLabel(displayStatus);

  const buyingPowerLeft =
    showImpact && impact?.headroomAfter != null
      ? impact.headroomAfter
      : current?.availableFunds ?? null;

  const utilLabel = formatMarginUtilRange(currentUtil, projectedUtil, showImpact && impact != null);

  return (
    <div
      data-testid="risk-margin-card"
      className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-3 py-3"
    >
      <div data-testid="risk-position-size-result">
        {hasSizedTrade ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
                Trade size
              </span>
              <span
                className="text-2xl font-semibold tabular-nums text-[var(--edge-text-strong)]"
                data-testid="risk-position-size-shares"
              >
                {shares}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-[var(--edge-text-secondary)]">
              <div>
                <span className="text-[var(--edge-text-muted)]">At risk</span>
                <div className="tabular-nums text-[var(--edge-text-strong)]">
                  {formatMoney(atRisk)}
                </div>
              </div>
              <div>
                <span className="text-[var(--edge-text-muted)]">Cost</span>
                <div className="tabular-nums text-[var(--edge-text-strong)]">
                  {formatMoney(cost)}
                </div>
              </div>
            </div>
          </>
        ) : sizeError ? (
          <p
            className="text-[11px] text-[var(--edge-negative)]"
            role="alert"
            data-testid="risk-position-size-error"
          >
            {sizeError}
          </p>
        ) : (
          <p
            className="text-[11px] text-[var(--edge-text-muted)]"
            data-testid="risk-position-size-hint"
          >
            {sizeHint ?? "Enter entry and stop to calculate share size."}
          </p>
        )}
      </div>

      {accountConnected ? (
        <>
          <div className="mt-3 border-t border-[var(--edge-border)] pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
                Margin
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex w-3 shrink-0 justify-center ${showImpact ? "" : "hidden"}`}
                  aria-hidden={!showImpact || !loading}
                >
                  {showImpact && loading ? (
                    <span title="Recalculating margin" aria-label="Recalculating margin">
                      <EdgeSpinner size="xs" data-testid="risk-margin-loading" />
                    </span>
                  ) : null}
                </span>
                <span
                  className={`text-[11px] tabular-nums ${displayStatus ? marginStatusTextClass(displayStatus) : "text-[var(--edge-text-secondary)]"}`}
                  data-testid="risk-margin-util-label"
                >
                  {utilLabel}
                </span>
              </div>
            </div>

            <div
              className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-[var(--edge-surface-toolbar)]"
              data-testid="risk-margin-util-bar"
              aria-hidden
            >
              {segments.existingPercent > 0 ? (
                <div
                  className="h-full transition-[width,background-color] duration-200"
                  style={{
                    width: `${segments.existingPercent}%`,
                    backgroundColor: "color-mix(in srgb, var(--edge-positive) 45%, transparent)",
                  }}
                  data-testid="risk-margin-bar-existing"
                />
              ) : null}
              {segments.tradePercent > 0 ? (
                <div
                  className="h-full transition-[width,background-color] duration-200"
                  style={{
                    width: `${segments.tradePercent}%`,
                    backgroundColor: marginStatusBarColor(impactStatus ?? displayStatus ?? "ok"),
                  }}
                  data-testid="risk-margin-bar-trade"
                />
              ) : null}
            </div>

            {showImpact && impact ? (
              <p className="mt-1 text-[10px] text-[var(--edge-text-muted)]">
                existing · this trade
              </p>
            ) : null}

            {showImpact && error ? (
              <p
                className="mt-2 text-[11px] text-[var(--edge-negative)]"
                data-testid="risk-margin-error"
              >
                {error}
              </p>
            ) : null}

            {plainStatus ? (
              <p
                className={`mt-2 text-[11px] tabular-nums ${displayStatus ? marginStatusTextClass(displayStatus) : "text-[var(--edge-text-secondary)]"}`}
                data-testid="risk-margin-summary"
              >
                {formatMoney(buyingPowerLeft)} left · {plainStatus}
              </p>
            ) : null}

            {impact?.warningText ? (
              <p className="mt-1 text-[10px] text-[var(--edge-warning)]">{impact.warningText}</p>
            ) : null}

            {showImpact && holdToStop ? (
              <div className="mt-1" data-testid="risk-hold-to-stop">
                <p
                  className={`text-[11px] tabular-nums ${
                    holdToStop.verdict === "margin_call_first"
                      ? "text-[var(--edge-negative)]"
                      : "text-[var(--edge-positive)]"
                  }`}
                  data-testid="risk-hold-verdict"
                >
                  {formatLiquidationLine(holdToStop)}
                </p>
                <label className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--edge-text-secondary)]">
                  <span>Show on chart</span>
                  <EdgeToggleSwitch
                    checked={showLiquidationLine}
                    onChange={onShowLiquidationLineChange}
                    size="compact"
                    ariaLabel="Show liquidation line on chart"
                    testId="risk-hold-show-on-chart"
                  />
                </label>
              </div>
            ) : null}
          </div>

          <details className="mt-2 group" data-testid="risk-margin-details">
            <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)] hover:text-[var(--edge-text-secondary)]">
              Details
            </summary>
            <div className="mt-2 space-y-3 text-[11px] text-[var(--edge-text-secondary)]">
              <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                <div>
                  <span className="text-[var(--edge-text-muted)]">In use now</span>
                  <div
                    className="tabular-nums text-[var(--edge-text-strong)]"
                    data-testid="risk-margin-current-init"
                  >
                    {formatMoney(current?.initMarginReq)}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--edge-text-muted)]">Excess liquidity</span>
                  <div
                    className="tabular-nums text-[var(--edge-text-strong)]"
                    data-testid="risk-margin-current-excess"
                  >
                    {formatMoney(current?.excessLiquidity)}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--edge-text-muted)]">Available funds</span>
                  <div
                    className="tabular-nums text-[var(--edge-text-strong)]"
                    data-testid="risk-margin-current-available"
                  >
                    {formatMoney(current?.availableFunds)}
                  </div>
                </div>
              </div>

              {showImpact && impact ? (
                <>
                  {impact.estimated ? (
                    <p
                      className="text-[10px] text-[var(--edge-text-muted)]"
                      data-testid="risk-margin-estimated-badge"
                    >
                      Est. from IBKR Reg T rules — IB preview omitted margin deltas
                    </p>
                  ) : null}

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <div>
                      <span className="text-[var(--edge-text-muted)]">This trade needs</span>
                      <div
                        className={`tabular-nums ${impactStatus ? marginStatusTextClass(impactStatus) : "text-[var(--edge-text-strong)]"}`}
                        data-testid="risk-margin-impact-init-delta"
                      >
                        {formatSignedMoney(impact.initMarginChange)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--edge-text-muted)]">To keep open</span>
                      <div
                        className={`tabular-nums ${impactStatus ? marginStatusTextClass(impactStatus) : "text-[var(--edge-text-strong)]"}`}
                        data-testid="risk-margin-impact-maint-delta"
                      >
                        {formatSignedMoney(impact.maintMarginChange)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--edge-text-muted)]">After this trade</span>
                      <div
                        className={`tabular-nums ${impactStatus ? marginStatusTextClass(impactStatus) : "text-[var(--edge-text-strong)]"}`}
                        data-testid="risk-margin-impact-projected-util"
                      >
                        {formatUtilizationPercent(impact.projectedUtilization)} used
                      </div>
                    </div>
                    <div>
                      <span className="text-[var(--edge-text-muted)]">Buying power left</span>
                      <div
                        className={`tabular-nums ${
                          impact.headroomAfter != null && impact.headroomAfter < 0
                            ? "text-[var(--edge-negative)]"
                            : impactStatus
                              ? marginStatusTextClass(impactStatus)
                              : "text-[var(--edge-text-strong)]"
                        }`}
                        data-testid="risk-margin-impact-headroom"
                      >
                        {formatMoney(impact.headroomAfter)}
                      </div>
                    </div>
                  </div>

                  {impactStatus ? (
                    <p
                      className={`text-[10px] uppercase tracking-wide ${marginStatusTextClass(impactStatus)}`}
                      data-testid="risk-margin-status"
                    >
                      {marginStatusPlainLabel(impactStatus)}
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          </details>
        </>
      ) : (
        <p
          className="mt-3 border-t border-[var(--edge-border)] pt-3 text-[11px] text-[var(--edge-text-muted)]"
          data-testid="risk-margin-disconnected"
        >
          Connect account to see margin.
        </p>
      )}
    </div>
  );
}
