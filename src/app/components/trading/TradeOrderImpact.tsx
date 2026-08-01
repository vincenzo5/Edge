"use client";

import type { MarginStatus } from "@/lib/risk/marginContext";
import { marginStatusTextClass } from "@/lib/risk/marginContext";
import type { OrderImpactEconomics } from "@/lib/trading/computeOrderImpact";
import {
  formatOrderImpactMoney,
  formatOrderImpactRatio,
} from "@/lib/trading/computeOrderImpact";

type Props = {
  economics: OrderImpactEconomics;
  initMarginChange: number | null;
  availableAfter: number | null;
  impactStatus: MarginStatus | null;
  /** True when margin came from notional Reg-T estimate, not broker what-if. */
  marginEstimated: boolean;
  marginLoading?: boolean;
  marginError?: string | null;
  accountConnected: boolean;
};

function ImpactRow({
  label,
  value,
  valueClassName,
  testId,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  testId?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[var(--edge-text-muted)]">{label}</dt>
      <dd
        data-testid={testId}
        className={`font-mono tabular-nums text-[var(--edge-text-primary)] ${valueClassName ?? ""}`.trim()}
      >
        {value}
      </dd>
    </div>
  );
}

function affordabilityLabel(args: {
  status: MarginStatus | null;
  availableAfter: number | null;
  accountConnected: boolean;
  marginError: string | null | undefined;
}): { text: string; className: string } {
  if (!args.accountConnected) {
    return {
      text: "Account data unavailable",
      className: "text-[var(--edge-text-muted)]",
    };
  }
  if (args.marginError && args.status == null) {
    return {
      text: "Preview unavailable",
      className: "text-[var(--edge-text-muted)]",
    };
  }
  if (args.status === "over") {
    return {
      text: "Insufficient margin",
      className: marginStatusTextClass("over"),
    };
  }
  if (args.status === "tight") {
    const after =
      args.availableAfter != null ? formatOrderImpactMoney(args.availableAfter) : null;
    return {
      text: after ? `Tight · ${after} after` : "Tight",
      className: marginStatusTextClass("tight"),
    };
  }
  if (args.status === "ok") {
    return {
      text: "✓ Enough",
      className: marginStatusTextClass("ok"),
    };
  }
  return {
    text: "—",
    className: "text-[var(--edge-text-muted)]",
  };
}

export function TradeOrderImpact({
  economics,
  initMarginChange,
  availableAfter,
  impactStatus,
  marginEstimated,
  marginLoading = false,
  marginError = null,
  accountConnected,
}: Props) {
  const provenance = marginEstimated ? "EST." : "BROKER";
  const affordability = affordabilityLabel({
    status: impactStatus,
    availableAfter,
    accountConnected,
    marginError,
  });

  const marginValue =
    initMarginChange == null || !Number.isFinite(initMarginChange)
      ? marginLoading
        ? "Updating…"
        : marginError
          ? "—"
          : "—"
      : formatOrderImpactMoney(initMarginChange);

  const afterValue =
    availableAfter == null || !Number.isFinite(availableAfter)
      ? "—"
      : formatOrderImpactMoney(availableAfter);

  return (
    <section
      data-testid="trade-order-impact"
      className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-2"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
          Order impact
        </div>
        <div
          className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]"
          data-testid="trade-order-impact-provenance"
        >
          {marginLoading ? "Updating…" : provenance}
        </div>
      </div>

      <dl className="space-y-1 text-[10px]">
        <ImpactRow
          label="Notional"
          value={
            economics.notional != null
              ? `~${formatOrderImpactMoney(economics.notional)}`
              : "—"
          }
          testId="trade-order-impact-notional"
        />
        <ImpactRow
          label="Init margin"
          value={marginValue}
          testId="trade-order-impact-margin"
        />
        <ImpactRow
          label="Available after"
          value={afterValue}
          testId="trade-order-impact-available-after"
        />
        <div className="flex justify-end">
          <span
            data-testid="trade-order-impact-affordability"
            className={`text-[10px] font-medium ${affordability.className}`}
          >
            {affordability.text}
          </span>
        </div>

        <div className="my-1.5 border-t border-[var(--edge-border-subtle)]" aria-hidden />

        {economics.riskMissingReason === "needs_stop" ? (
          <ImpactRow
            label="Risk to stop"
            value="Needs stop"
            valueClassName="text-[var(--edge-text-muted)]"
            testId="trade-order-impact-risk"
          />
        ) : (
          <ImpactRow
            label="Risk to stop"
            value={formatOrderImpactMoney(economics.riskDollars)}
            valueClassName="text-[var(--edge-text-strong)]"
            testId="trade-order-impact-risk"
          />
        )}

        {economics.rewardVisible ? (
          <ImpactRow
            label="Reward to target"
            value={formatOrderImpactMoney(economics.rewardDollars)}
            testId="trade-order-impact-reward"
          />
        ) : null}

        {economics.rrVisible ? (
          <ImpactRow
            label="Risk : reward"
            value={formatOrderImpactRatio(economics.riskRewardRatio)}
            valueClassName="text-[var(--edge-text-strong)]"
            testId="trade-order-impact-rr"
          />
        ) : null}
      </dl>
    </section>
  );
}
