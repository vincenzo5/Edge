import type { DataProvenance, DataReadiness } from "@/lib/marketData/trust/dataTrust";
import {
  evaluateReadiness,
  getDatasetPolicy,
  provenanceFromMeta,
} from "@/lib/marketData/trust/dataTrust";
import type { RiskSettings } from "@/lib/risk/riskSettings";
import { resolveDollarRisk } from "@/lib/risk/riskSettings";
import type { AccountSummary } from "@/lib/marketData/contracts/brokerage";

export type TradingReadinessInput = {
  brokerageConnected: boolean;
  accountSummary: AccountSummary | null;
  accountUpdatedAt?: number;
  /** Max age for brokerage snapshot used in trade checks. */
  accountMaxAgeMs?: number;
  riskSettings: RiskSettings;
  now?: number;
};

export type TradingReadinessResult = {
  ok: boolean;
  reasons: string[];
  accountReadiness?: DataReadiness;
};

const DEFAULT_ACCOUNT_MAX_AGE_MS = 30_000;

function accountMaxAgeMs(): number {
  return getDatasetPolicy("account_summary").maxAgeMs ?? DEFAULT_ACCOUNT_MAX_AGE_MS;
}

function accountProvenance(
  connected: boolean,
  updatedAt: number | undefined,
  now: number,
): DataProvenance {
  return provenanceFromMeta({
    source: connected ? "tws" : "unknown",
    asOf: updatedAt,
    receivedAt: updatedAt ?? now,
    stale:
      connected &&
      updatedAt != null &&
      now - updatedAt > DEFAULT_ACCOUNT_MAX_AGE_MS,
    warnings: connected ? [] : ["Brokerage disconnected"],
  });
}

/** Pure gate for future order paths — does not place orders or mutate state. */
export function evaluateTradingReadiness(
  input: TradingReadinessInput,
): TradingReadinessResult {
  const now = input.now ?? Date.now();
  const reasons: string[] = [];
  const accountMaxAge = input.accountMaxAgeMs ?? accountMaxAgeMs();

  if (!input.brokerageConnected) {
    reasons.push("Brokerage is not connected");
  }

  const accountProv = accountProvenance(
    input.brokerageConnected,
    input.accountUpdatedAt,
    now,
  );
  if (
    input.brokerageConnected &&
    input.accountUpdatedAt != null &&
    now - input.accountUpdatedAt > accountMaxAge
  ) {
    reasons.push(`Account snapshot is older than ${accountMaxAge}ms`);
  }

  const accountReadiness = evaluateReadiness(
    "account_summary",
    "trading_decision",
    accountProv,
    now,
  );
  if (accountReadiness.status === "blocked") {
    reasons.push(...accountReadiness.reasons);
  }

  if (!input.accountSummary) {
    reasons.push("Account summary unavailable");
  }

  const dollarRisk = resolveDollarRisk(input.riskSettings, input.accountSummary);
  if (dollarRisk == null || dollarRisk <= 0) {
    reasons.push("Risk sizing could not be resolved");
  }

  const unique = [...new Set(reasons)];
  return {
    ok: unique.length === 0,
    reasons: unique,
    accountReadiness,
  };
}
