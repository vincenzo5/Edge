"use client";

import type { RiskPlanSlotSummary } from "@/lib/risk/summarizeRiskPlanSlots";
import { riskPlanGapLabel } from "@/lib/risk/summarizeRiskPlanSlots";

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatPrice(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  summary: RiskPlanSlotSummary;
};

export function RiskPlanSlotStrip({ summary }: Props) {
  return (
    <section
      data-testid="risk-plan-slot-strip"
      className="space-y-2 rounded border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-2 py-2"
    >
      <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-muted)]">
        Plan slots
      </div>

      {summary.bindLabel ? (
        <p
          data-testid="risk-plan-bind-label"
          className="text-[10px] text-[var(--edge-text-secondary)]"
        >
          Bound: {summary.bindLabel}
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
        <div>
          <dt className="text-[var(--edge-text-muted)]">Budget</dt>
          <dd
            data-testid="risk-plan-slot-budget"
            className="text-[var(--edge-text-primary)]"
          >
            {summary.budget.resolved
              ? formatMoney(summary.budget.dollarRisk)
              : "Not resolved"}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--edge-text-muted)]">Sizing</dt>
          <dd
            data-testid="risk-plan-slot-sizing"
            className="text-[var(--edge-text-primary)]"
          >
            {summary.sizing.shares != null
              ? `${summary.sizing.shares} sh · ${formatMoney(summary.sizing.plannedRiskDollars)}`
              : summary.sizing.error ?? "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[var(--edge-text-muted)]">Geometry</dt>
          <dd
            data-testid="risk-plan-slot-geometry"
            className="text-[var(--edge-text-primary)]"
          >
            {summary.geometry.direction
              ? `${summary.geometry.direction === "long" ? "Long" : "Short"} · E ${formatPrice(summary.geometry.entry)} · S ${formatPrice(summary.geometry.stop)}`
              : "—"}
            {summary.geometry.linked ? (
              <span className="ml-1 text-[var(--edge-text-muted)]">(live)</span>
            ) : summary.geometry.entry != null ? (
              <span className="ml-1 text-[var(--edge-text-muted)]">(manual)</span>
            ) : null}
          </dd>
        </div>
      </dl>

      {summary.gaps.length > 0 ? (
        <ul
          data-testid="risk-plan-slot-gaps"
          className="space-y-0.5 text-[10px] text-[var(--edge-text-muted)]"
        >
          {summary.gaps.map((gap) => (
            <li key={gap}>{riskPlanGapLabel(gap)}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
