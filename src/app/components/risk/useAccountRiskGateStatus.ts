"use client";

import { useMemo } from "react";
import type { AccountPnL, AccountSummary } from "@/lib/marketData/contracts/brokerage";
import {
  buildAccountGateEvaluationInput,
  evaluateAccountRiskGates,
  type AccountGateStatus,
} from "@/lib/risk/accountRiskGates";
import type { RiskSettings } from "@/lib/risk/riskSettings";
import type { PlaybookInstance } from "@/lib/trading/playbook/types";

export function useAccountRiskGateStatus(args: {
  settings: RiskSettings;
  accountSummary: AccountSummary | null | undefined;
  pnl: AccountPnL | null | undefined;
  playbookInstances: PlaybookInstance[];
  openPositionCount: number;
  proposedRiskDollars?: number | null;
}): AccountGateStatus | null {
  return useMemo(() => {
    if (
      args.settings.periodLossCapPercent == null &&
      args.settings.openHeatCapPercent == null
    ) {
      return null;
    }
    const input = buildAccountGateEvaluationInput({
      settings: args.settings,
      accountSummary: args.accountSummary ?? null,
      pnl: args.pnl,
      playbookInstances: args.playbookInstances,
      openPositionCount: args.openPositionCount,
      proposedRiskDollars: args.proposedRiskDollars,
    });
    return evaluateAccountRiskGates(input);
  }, [
    args.settings,
    args.accountSummary,
    args.pnl,
    args.playbookInstances,
    args.openPositionCount,
    args.proposedRiskDollars,
  ]);
}
