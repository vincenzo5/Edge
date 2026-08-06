"use client";

import { useMemo } from "react";
import { annotationTextClass } from "../design-system/styles";
import {
  formatUsd,
  monthlyCostsByKind,
  resolveConfiguredStatus,
  sumConfiguredFixed,
  type MonthlyCostConfiguredStatus,
  type MonthlyCostRow,
  MONTHLY_COSTS_CATALOG,
} from "@/lib/app/monthlyCostsCatalog";
import type { ServerHealthPayload } from "@/lib/marketData/health";

type Props = {
  enabled: boolean;
  health: ServerHealthPayload | null;
};

function configuredLabel(status: MonthlyCostConfiguredStatus): string {
  switch (status) {
    case "configured":
      return "Configured";
    case "not-configured":
      return "Not configured";
    case "manual":
      return "Manual";
    case "included":
      return "Included";
    case "inactive":
      return "Inactive";
    default:
      return "Unknown";
  }
}

function configuredToneClass(status: MonthlyCostConfiguredStatus): string {
  switch (status) {
    case "configured":
    case "included":
      return "text-[var(--edge-positive)]";
    case "manual":
    case "inactive":
      return "text-[var(--edge-text-muted)]";
    default:
      return "text-[var(--edge-text-secondary)]";
  }
}

function amountLabel(row: MonthlyCostRow): string {
  if (row.kind === "usage") return "per-token usage";
  if (row.monthlyUsd == null) return "$— / mo";
  return `${formatUsd(row.monthlyUsd)} / mo`;
}

function CostRow({ row, health }: { row: MonthlyCostRow; health: ServerHealthPayload | null }) {
  const status = resolveConfiguredStatus(row, health);
  return (
    <li
      className="rounded-[var(--edge-radius-md)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-3 py-2"
      data-testid={`app-settings-cost-row-${row.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-[var(--edge-text-strong)]">{row.service}</span>
            <span className="text-xs text-[var(--edge-text-muted)]">{row.planLabel}</span>
          </div>
          <p className="mt-1 text-xs text-[var(--edge-text-secondary)]">{row.usedFor}</p>
          <p className={`mt-1 text-[11px] ${configuredToneClass(status)}`}>{configuredLabel(status)}</p>
        </div>
        <span className="shrink-0 text-sm font-medium tabular-nums text-[var(--edge-text-strong)]">
          {amountLabel(row)}
        </span>
      </div>
    </li>
  );
}

export default function MonthlyCostsSettingsSection({ enabled, health }: Props) {
  const fixedRows = useMemo(() => monthlyCostsByKind("fixed"), []);
  const freeRows = useMemo(() => monthlyCostsByKind("free"), []);
  const usageRows = useMemo(() => monthlyCostsByKind("usage"), []);
  const configuredTotal = useMemo(
    () => sumConfiguredFixed(MONTHLY_COSTS_CATALOG, health),
    [health],
  );

  if (!enabled) return null;

  return (
    <section
      className="space-y-4"
      aria-labelledby="app-settings-monthly-costs-heading"
      data-testid="app-settings-monthly-costs"
    >
      <div className="space-y-1">
        <h3
          id="app-settings-monthly-costs-heading"
          className="text-sm font-semibold text-[var(--edge-text-strong)]"
        >
          Monthly costs
        </h3>
        <p className="text-xs text-[var(--edge-text-secondary)]">
          Read-only estimate of third-party spend for this install. Amounts come from the app
          catalog, not vendor invoices. API keys are never shown here.
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
          Fixed subscriptions
        </h4>
        <ul className="space-y-2">
          {fixedRows.map((row) => (
            <CostRow key={row.id} row={row} health={health} />
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
          Included at $0
        </h4>
        <p className={`${annotationTextClass()} text-[var(--edge-text-secondary)]`}>
          {freeRows.map((row) => row.service).join(" · ")}
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
          Usage-based (not in total)
        </h4>
        <ul className="space-y-2">
          {usageRows.map((row) => (
            <CostRow key={row.id} row={row} health={health} />
          ))}
        </ul>
      </div>

      <div
        className="rounded-[var(--edge-radius-md)] border border-[var(--edge-border)] bg-[var(--edge-surface-active)] px-3 py-2"
        data-testid="app-settings-monthly-costs-total"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-[var(--edge-text-strong)]">
            Fixed subscriptions (configured)
          </span>
          <span className="text-sm font-semibold tabular-nums text-[var(--edge-text-strong)]">
            {formatUsd(configuredTotal)} / mo
          </span>
        </div>
      </div>
    </section>
  );
}
