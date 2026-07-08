import type { JournalFill, JournalTrade } from "@/lib/journal/types";
import { rebuildTradesFromFills } from "@/lib/journal/tradeGrouping";

export type RebuildTradesResult = {
  trades: JournalTrade[];
  preservedMetadata: Map<
    string,
    Pick<
      JournalTrade,
      | "tags"
      | "setup"
      | "reviewNote"
      | "plannedRiskMode"
      | "plannedRiskValue"
      | "plannedRiskUsd"
    >
  >;
};

export function rebuildTrades(
  fills: JournalFill[],
  previousTrades: JournalTrade[] = [],
): RebuildTradesResult {
  const preservedMetadata = new Map<
    string,
    Pick<
      JournalTrade,
      | "tags"
      | "setup"
      | "reviewNote"
      | "plannedRiskMode"
      | "plannedRiskValue"
      | "plannedRiskUsd"
    >
  >();
  const preservedIds = new Map<string, string>();

  for (const trade of previousTrades) {
    const key = trade.fillExecIds.slice().sort().join("|");
    if (!key) continue;
    preservedIds.set(key, trade.id);
    preservedMetadata.set(key, {
      tags: trade.tags,
      setup: trade.setup,
      reviewNote: trade.reviewNote,
      plannedRiskMode: trade.plannedRiskMode,
      plannedRiskValue: trade.plannedRiskValue,
      plannedRiskUsd: trade.plannedRiskUsd,
    });
  }

  const grouped = rebuildTradesFromFills(fills);
  const trades = grouped.map((trade) => {
    const key = trade.fillExecIds.slice().sort().join("|");
    const preserved = preservedMetadata.get(key);
    const preservedId = preservedIds.get(key);
    if (!preserved && !preservedId) return trade;
    return {
      ...trade,
      id: preservedId ?? trade.id,
      tags: preserved?.tags ?? trade.tags,
      setup: preserved?.setup ?? trade.setup,
      reviewNote: preserved?.reviewNote ?? trade.reviewNote,
      plannedRiskMode: preserved?.plannedRiskMode ?? trade.plannedRiskMode,
      plannedRiskValue: preserved?.plannedRiskValue ?? trade.plannedRiskValue,
      plannedRiskUsd: preserved?.plannedRiskUsd ?? trade.plannedRiskUsd,
    };
  });

  return { trades, preservedMetadata };
}
