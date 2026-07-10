import type {
  JournalFillResponse,
  JournalTradeResponse,
} from "@/lib/persistence/schemas/journal";

export function filterTradesByAccount(
  trades: JournalTradeResponse[],
  fills: JournalFillResponse[],
  accountId: string | null | undefined,
): JournalTradeResponse[] {
  const normalized = accountId?.trim();
  if (!normalized) return trades;

  const fillAccountByExecId = new Map(
    fills.map((fill) => [fill.execId, fill.account?.trim() ?? null]),
  );

  return trades.filter((trade) => {
    const execIds = trade.fillExecIds ?? [];
    if (execIds.length === 0) return false;
    return execIds.some((execId) => fillAccountByExecId.get(execId) === normalized);
  });
}
