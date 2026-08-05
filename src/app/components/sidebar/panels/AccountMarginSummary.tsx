"use client";

import { useState } from "react";
import { EdgeMetricTile } from "../../design-system";
import Tooltip from "../../Tooltip";
import { parseSummaryTagNumber } from "@/lib/marketData/contracts/brokerage";
import type { AccountSummaryTag } from "@/lib/marketData/contracts/brokerage";
import {
  classifyUtilizationStatus,
  computeMarginBarSegments,
  formatUtilizationPercent,
  marginStatusBarColor,
  marginStatusPlainLabel,
  marginStatusTextClass,
  parseMarginSnapshot,
} from "@/lib/risk/marginContext";

const METRIC_HELP = {
  margin: "Initial margin requirement divided by net liquidation — how much of your account is tied up in margin.",
  buyingPower: "Cash available to spend on new positions without depositing more funds.",
  excessLiquidity: "Equity in excess of maintenance margin; a buffer before margin call.",
  availableFunds: "Funds available to withdraw or trade without exceeding margin requirements.",
  initMargin: "Initial margin requirement — what opening new positions would cost.",
  maintMargin: "Maintenance margin requirement to keep current positions open.",
  leverage: "Initial margin divided by net liquidation.",
} as const;

function formatMoney(value: number | null | undefined, currency = "USD"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function HelpIcon({ help }: { help: string }) {
  return (
    <Tooltip content={help} theme="dark" side="right" portaled>
      <span
        className="inline-flex h-3 w-3 cursor-help items-center justify-center rounded-full border border-[var(--edge-border)] text-[8px] leading-none"
        aria-label="Help"
      >
        ?
      </span>
    </Tooltip>
  );
}

type Props = {
  tags: Record<string, AccountSummaryTag>;
};

export function AccountMarginSummary({ tags }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const snapshot = parseMarginSnapshot(tags);
  const buyingPower = parseSummaryTagNumber(tags, "BuyingPower");
  const utilization = snapshot.utilization;
  const status = classifyUtilizationStatus(utilization);
  const segments = computeMarginBarSegments(utilization, null);
  const statusLabel = marginStatusPlainLabel(status);
  const leverage =
    snapshot.initMarginReq != null &&
    snapshot.netLiquidation != null &&
    snapshot.netLiquidation !== 0
      ? snapshot.initMarginReq / snapshot.netLiquidation
      : null;

  const utilCaption =
    utilization != null && statusLabel
      ? `${formatUtilizationPercent(utilization)} used · ${statusLabel}`
      : "Margin data unavailable";

  return (
    <div className="col-span-2 space-y-2" data-testid="account-margin-summary">
      <div className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] p-2">
        <div className="flex items-center gap-1 text-[10px] uppercase text-[var(--edge-text-secondary)]">
          <span>Margin use</span>
          <HelpIcon help={METRIC_HELP.margin} />
        </div>

        <div
          className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-[var(--edge-surface-toolbar)]"
          data-testid="account-margin-util-bar"
          aria-hidden
        >
          {segments.existingPercent > 0 ? (
            <div
              className="h-full transition-[width,background-color] duration-200"
              style={{
                width: `${segments.existingPercent}%`,
                backgroundColor: marginStatusBarColor(status),
              }}
              data-testid="account-margin-bar-fill"
            />
          ) : null}
        </div>

        <p
          className={`mt-1.5 text-[11px] ${marginStatusTextClass(status)}`}
          data-testid="account-margin-status"
        >
          {utilCaption}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <EdgeMetricTile
          label="Buying power"
          value={formatMoney(buyingPower)}
          help={METRIC_HELP.buyingPower}
          labelUppercase
        />
        <EdgeMetricTile
          label="Excess liquidity"
          value={formatMoney(snapshot.excessLiquidity)}
          help={METRIC_HELP.excessLiquidity}
          labelUppercase
        />
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-between rounded px-1 py-0.5 text-[10px] uppercase text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)]"
        aria-expanded={detailsOpen}
        data-testid="account-margin-details-toggle"
        onClick={() => setDetailsOpen((open) => !open)}
      >
        <span>Details</span>
        <span aria-hidden>{detailsOpen ? "▾" : "▸"}</span>
      </button>

      {detailsOpen ? (
        <div className="grid grid-cols-2 gap-2" data-testid="account-margin-details">
          <EdgeMetricTile
            label="Available funds"
            value={formatMoney(snapshot.availableFunds)}
            help={METRIC_HELP.availableFunds}
            labelUppercase
          />
          <EdgeMetricTile
            label="Init margin"
            value={formatMoney(snapshot.initMarginReq)}
            help={METRIC_HELP.initMargin}
            labelUppercase
          />
          <EdgeMetricTile
            label="Maint margin"
            value={formatMoney(snapshot.maintMarginReq)}
            help={METRIC_HELP.maintMargin}
            labelUppercase
          />
          <EdgeMetricTile
            label="Leverage"
            value={leverage != null ? leverage.toFixed(2) : "—"}
            help={METRIC_HELP.leverage}
            labelUppercase
          />
        </div>
      ) : null}
    </div>
  );
}
