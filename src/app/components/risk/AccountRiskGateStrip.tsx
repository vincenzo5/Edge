"use client";

import type { AccountGateSlotStatus, AccountGateStatus } from "@/lib/risk/accountRiskGates";
import {
  accountGateTone,
  formatDayLossGateLine,
  formatOpenHeatGateLine,
} from "@/lib/risk/accountRiskGates";

type Props = {
  status: AccountGateStatus;
  compact?: boolean;
};

function lineClass(slot: AccountGateSlotStatus): string {
  const tone = accountGateTone(slot);
  if (tone === "danger") return "text-[var(--edge-negative)]";
  if (tone === "warning") return "text-[var(--edge-warning)]";
  return "text-[var(--edge-text-muted)]";
}

export function AccountRiskGateStrip({ status, compact = false }: Props) {
  const dayLine = formatDayLossGateLine(status.dayLoss);
  const heatLine = formatOpenHeatGateLine(status.openHeat);
  if (!dayLine && !heatLine) return null;

  return (
    <div
      data-testid="account-risk-gate-strip"
      className={`space-y-0.5 ${compact ? "text-[10px]" : "text-[11px]"}`}
    >
      {dayLine ? (
        <p
          data-testid="account-risk-gate-day-loss"
          className={lineClass(status.dayLoss)}
        >
          {dayLine}
        </p>
      ) : null}
      {heatLine ? (
        <p
          data-testid="account-risk-gate-open-heat"
          className={lineClass(status.openHeat)}
        >
          {heatLine}
        </p>
      ) : null}
    </div>
  );
}
