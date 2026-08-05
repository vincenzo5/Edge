"use client";

import type { MarginStatus, MaxAffordableShares } from "@/lib/risk/marginContext";
import {
  marginStatusBarColor,
  marginStatusTextClass,
} from "@/lib/risk/marginContext";
import type { OrderImpactEconomics } from "@/lib/trading/computeOrderImpact";
import { formatOrderImpactMoney } from "@/lib/trading/computeOrderImpact";

type Props = {
  economics: OrderImpactEconomics;
  /** Selected order quantity — drives the capacity bar. */
  quantity: number | null;
  availableAfter: number | null;
  impactStatus: MarginStatus | null;
  marginError?: string | null;
  accountConnected: boolean;
  maxAffordable?: MaxAffordableShares | null;
  maxSizeLoading?: boolean;
  /** When set, "Needs stop" becomes an actionable Add stop control. */
  onAddStop?: () => void;
};

function afterStatusChip(args: {
  status: MarginStatus | null;
  accountConnected: boolean;
  marginError: string | null | undefined;
}): { text: string; className: string } {
  if (!args.accountConnected) {
    return { text: "—", className: "text-[var(--edge-text-muted)]" };
  }
  if (args.marginError && args.status == null) {
    return { text: "—", className: "text-[var(--edge-text-muted)]" };
  }
  if (args.status === "over") {
    return { text: "OVER", className: marginStatusTextClass("over") };
  }
  if (args.status === "tight") {
    return { text: "!", className: marginStatusTextClass("tight") };
  }
  if (args.status === "ok") {
    return { text: "✓", className: marginStatusTextClass("ok") };
  }
  return { text: "—", className: "text-[var(--edge-text-muted)]" };
}

function formatMaxSizeLine(args: {
  maxAffordable: MaxAffordableShares | null | undefined;
  accountConnected: boolean;
  maxSizeLoading: boolean;
}): string {
  if (!args.accountConnected) return "—";
  if (args.maxSizeLoading) return "Updating…";
  if (args.maxAffordable == null) return "—";
  const { shares, notional } = args.maxAffordable;
  if (shares <= 0) return "0 sh";
  const notionalLabel =
    notional != null && Number.isFinite(notional)
      ? ` · ${formatOrderImpactMoney(notional)}`
      : "";
  return `${shares.toLocaleString()} sh${notionalLabel}`;
}

function capacityState(args: {
  quantity: number | null;
  maxAffordable: MaxAffordableShares | null | undefined;
  accountConnected: boolean;
  maxSizeLoading: boolean;
}): { visible: boolean; fillPct: number; label: string } {
  const qty =
    args.quantity != null && Number.isFinite(args.quantity) && args.quantity > 0
      ? Math.round(args.quantity)
      : null;
  const maxShares =
    args.maxAffordable != null &&
    Number.isFinite(args.maxAffordable.shares) &&
    args.maxAffordable.shares > 0
      ? Math.round(args.maxAffordable.shares)
      : null;

  if (
    !args.accountConnected ||
    args.maxSizeLoading ||
    qty == null ||
    maxShares == null
  ) {
    return { visible: false, fillPct: 0, label: "" };
  }

  return {
    visible: true,
    fillPct: Math.min(100, (qty / maxShares) * 100),
    label: `${qty.toLocaleString()} / ${maxShares.toLocaleString()}`,
  };
}

export function TradeOrderImpact({
  economics,
  quantity,
  availableAfter,
  impactStatus,
  marginError = null,
  accountConnected,
  maxAffordable = null,
  maxSizeLoading = false,
  onAddStop,
}: Props) {
  const afterChip = afterStatusChip({
    status: impactStatus,
    accountConnected,
    marginError,
  });

  const afterValue =
    impactStatus === "over"
      ? "—"
      : availableAfter == null || !Number.isFinite(availableAfter)
        ? "—"
        : formatOrderImpactMoney(availableAfter);

  const maxSizeLine = formatMaxSizeLine({
    maxAffordable,
    accountConnected,
    maxSizeLoading,
  });

  const capacity = capacityState({
    quantity,
    maxAffordable,
    accountConnected,
    maxSizeLoading,
  });

  const barColor =
    impactStatus != null ? marginStatusBarColor(impactStatus) : "var(--edge-accent)";

  const notionalValue =
    economics.notional != null
      ? `~${formatOrderImpactMoney(economics.notional)}`
      : "—";

  return (
    <section data-testid="trade-order-impact" className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="font-mono text-sm tabular-nums text-[var(--edge-text-strong)]"
            data-testid="trade-order-impact-notional"
          >
            {notionalValue}
          </div>
          <div className="text-[10px] text-[var(--edge-text-muted)]">notional</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] text-[var(--edge-text-muted)]">Max size</div>
          <div
            className="font-mono text-[10px] tabular-nums text-[var(--edge-text-primary)]"
            data-testid="trade-order-impact-max-size"
          >
            {maxSizeLine}
          </div>
        </div>
      </div>

      {capacity.visible ? (
        <div className="mt-2" data-testid="trade-order-impact-capacity">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-[var(--edge-border-subtle)]"
            role="progressbar"
            aria-valuenow={capacity.fillPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full transition-[width] duration-150"
              style={{
                width: `${capacity.fillPct}%`,
                backgroundColor: barColor,
              }}
            />
          </div>
          <div className="mt-0.5 text-right font-mono text-[10px] tabular-nums text-[var(--edge-text-secondary)]">
            {capacity.label}
          </div>
        </div>
      ) : null}

      <div className="mt-2 flex items-baseline justify-between gap-3 text-[10px]">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="text-[var(--edge-text-muted)]">After</span>
          <span
            className="font-mono tabular-nums text-[var(--edge-text-primary)]"
            data-testid="trade-order-impact-available-after"
          >
            {afterValue}
          </span>
          <span
            data-testid="trade-order-impact-affordability"
            className={`font-medium ${afterChip.className}`}
          >
            {afterChip.text}
          </span>
        </div>

        {economics.riskMissingReason === "needs_stop" ? (
          <div className="shrink-0 text-right">
            {onAddStop ? (
              <button
                type="button"
                className="edge-focus-ring font-mono text-[var(--edge-warning)] hover:underline"
                data-testid="trade-order-impact-add-stop"
                onClick={onAddStop}
              >
                Add stop ›
              </button>
            ) : (
              <span
                className="font-mono text-[var(--edge-text-muted)]"
                data-testid="trade-order-impact-risk"
              >
                Needs stop
              </span>
            )}
          </div>
        ) : (
          <div className="flex shrink-0 items-baseline gap-1.5">
            <span className="text-[var(--edge-text-muted)]">Risk</span>
            <span
              className="font-mono tabular-nums text-[var(--edge-text-strong)]"
              data-testid="trade-order-impact-risk"
            >
              {formatOrderImpactMoney(economics.riskDollars)}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
