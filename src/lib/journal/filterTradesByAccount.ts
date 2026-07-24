import type {
  JournalFillResponse,
  JournalTradeResponse,
} from "@/lib/persistence/schemas/journal";

export type FillAccountSource = JournalFillResponse[] | ReadonlyMap<string, string | null>;

function resolveFillAccountByExecId(source: FillAccountSource): ReadonlyMap<string, string | null> {
  if (source instanceof Map) {
    return source;
  }
  if (Array.isArray(source)) {
    return new Map(source.map((fill) => [fill.execId, fill.account?.trim() ?? null]));
  }
  return source;
}

export function filterTradesByAccount(
  trades: JournalTradeResponse[],
  fillAccounts: FillAccountSource,
  accountId: string | null | undefined,
): JournalTradeResponse[] {
  const normalized = accountId?.trim();
  if (!normalized) return trades;

  const fillAccountByExecId = resolveFillAccountByExecId(fillAccounts);

  return trades.filter((trade) => {
    const execIds = trade.fillExecIds ?? [];
    if (execIds.length === 0) return false;
    return execIds.some((execId) => fillAccountByExecId.get(execId) === normalized);
  });
}
