import type { AccountSummary } from "@/lib/marketData/contracts/brokerage";

export type ParsedAccountMetrics = {
  accountId: string | null;
  netLiquidation: number | null;
  cash: number | null;
  buyingPower: number | null;
  grossPositionValue: number | null;
};

function readTagValue(
  summary: AccountSummary | null,
  tag: string,
): number | null {
  if (!summary?.tags) return null;
  const entry = summary.tags[tag];
  if (!entry?.value) return null;
  const parsed = Number(entry.value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseAccountSummaryMetrics(
  summary: AccountSummary | null,
): ParsedAccountMetrics {
  return {
    accountId: summary?.accountId?.trim() ?? null,
    netLiquidation: readTagValue(summary, "NetLiquidation"),
    cash: readTagValue(summary, "TotalCashValue"),
    buyingPower: readTagValue(summary, "BuyingPower"),
    grossPositionValue: readTagValue(summary, "GrossPositionValue"),
  };
}

export const ACCOUNT_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
export const POSITION_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

export function shouldCaptureSnapshot(
  lastCapturedAt: Date | null,
  nowMs: number,
  intervalMs: number,
): boolean {
  if (!lastCapturedAt) return true;
  return nowMs - lastCapturedAt.getTime() >= intervalMs;
}
