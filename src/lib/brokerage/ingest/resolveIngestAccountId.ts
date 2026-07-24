import type { BrokerageSnapshot } from "@/lib/brokerage/brokerageService";
import type { TradingEnvironment } from "@/lib/trading/types";

function majorityString(values: Array<string | null | undefined>): string | null {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = raw?.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

/** Resolve durable ingest account id; prefer broker execution/position truth over summary pins. */
export function resolveIngestAccountId(
  snapshot: BrokerageSnapshot,
  environment: TradingEnvironment,
): string | null {
  const fromExecutions = majorityString(snapshot.executions?.map((row) => row.account) ?? []);
  const fromPositions = majorityString(snapshot.positions?.map((row) => row.account) ?? []);
  const brokerTruth = fromExecutions ?? fromPositions;

  const fromSummary = snapshot.summary?.accountId?.trim() ?? null;
  const fromStatus = snapshot.status?.accountId?.trim() ?? null;
  const fromManaged = snapshot.status?.managedAccounts?.[0]?.trim() ?? null;
  const metadataId = fromSummary ?? fromStatus ?? fromManaged;

  if (brokerTruth) {
    if (metadataId && metadataId !== brokerTruth) {
      return brokerTruth;
    }
    return brokerTruth;
  }

  if (environment === "live" && metadataId) {
    return metadataId;
  }

  return metadataId;
}
