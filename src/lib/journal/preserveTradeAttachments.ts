import { tradeExecIdsKey } from "@/lib/journal/tradeExecIdsKey";

export type TradeIdKeySource = {
  id: string;
  fillExecIds: string[];
};

function findSupersetTradeId(
  previousFillExecIds: string[],
  nextTrades: TradeIdKeySource[],
  usedNextIds: Set<string>,
): string | null {
  if (previousFillExecIds.length === 0) return null;

  let best: { id: string; extras: number } | null = null;
  for (const next of nextTrades) {
    if (usedNextIds.has(next.id)) continue;
    if (next.fillExecIds.length < previousFillExecIds.length) continue;
    const containsAll = previousFillExecIds.every((execId) => next.fillExecIds.includes(execId));
    if (!containsAll) continue;
    const extras = next.fillExecIds.length - previousFillExecIds.length;
    if (!best || extras < best.extras) {
      best = { id: next.id, extras };
    }
  }
  return best?.id ?? null;
}

/**
 * Map previous trade ids → rebuilt trade ids via fillExecIds keys.
 * Falls back to smallest superset match so open trades that gain fills keep attachments.
 */
export function buildTradeIdRemap(
  previousTrades: TradeIdKeySource[],
  nextTrades: TradeIdKeySource[],
): Map<string, string> {
  const keyToNextId = new Map<string, string>();
  for (const trade of nextTrades) {
    const key = tradeExecIdsKey(trade.fillExecIds);
    if (!key) continue;
    keyToNextId.set(key, trade.id);
  }

  const remap = new Map<string, string>();
  const usedNextIds = new Set<string>();

  for (const trade of previousTrades) {
    const key = tradeExecIdsKey(trade.fillExecIds);
    const exactId = key ? keyToNextId.get(key) : undefined;
    if (exactId) {
      remap.set(trade.id, exactId);
      usedNextIds.add(exactId);
    }
  }

  for (const trade of previousTrades) {
    if (remap.has(trade.id)) continue;
    const nextId = findSupersetTradeId(trade.fillExecIds, nextTrades, usedNextIds);
    if (!nextId) continue;
    remap.set(trade.id, nextId);
    usedNextIds.add(nextId);
  }

  return remap;
}

export function remapAttachmentTradeId(
  previousTradeId: string,
  tradeIdRemap: Map<string, string>,
): string | null {
  return tradeIdRemap.get(previousTradeId) ?? null;
}
