import type { JournalFill, JournalTrade } from "@/lib/journal/types";
import { buildTradeIdRemap } from "@/lib/journal/preserveTradeAttachments";
import { rebuildTradesFromFills } from "@/lib/journal/tradeGrouping";
import { tradeExecIdsKey } from "@/lib/journal/tradeExecIdsKey";

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
      | "initialStop"
      | "rating"
      | "ignored"
      | "mfeUsd"
      | "mfaUsd"
      | "excursionInterval"
      | "excursionComputedAt"
      | "managePlaybook"
    >
  >;
};

type PreservedReview = Pick<
  JournalTrade,
  | "tags"
  | "setup"
  | "reviewNote"
  | "plannedRiskMode"
  | "plannedRiskValue"
  | "plannedRiskUsd"
  | "initialStop"
  | "rating"
  | "ignored"
  | "mfeUsd"
  | "mfaUsd"
  | "excursionInterval"
  | "excursionComputedAt"
  | "managePlaybook"
>;

export function rebuildTrades(
  fills: JournalFill[],
  previousTrades: JournalTrade[] = [],
): RebuildTradesResult {
  const preservedMetadata = new Map<string, PreservedReview>();
  const previousById = new Map<string, JournalTrade>();

  for (const trade of previousTrades) {
    previousById.set(trade.id, trade);
    const key = tradeExecIdsKey(trade.fillExecIds);
    if (!key) continue;
    preservedMetadata.set(key, {
      tags: trade.tags,
      setup: trade.setup,
      reviewNote: trade.reviewNote,
      plannedRiskMode: trade.plannedRiskMode,
      plannedRiskValue: trade.plannedRiskValue,
      plannedRiskUsd: trade.plannedRiskUsd,
      initialStop: trade.initialStop,
      rating: trade.rating,
      ignored: trade.ignored,
      mfeUsd: trade.mfeUsd,
      mfaUsd: trade.mfaUsd,
      excursionInterval: trade.excursionInterval,
      excursionComputedAt: trade.excursionComputedAt,
      managePlaybook: trade.managePlaybook,
    });
  }

  const grouped = rebuildTradesFromFills(fills);
  const tradeIdRemap = buildTradeIdRemap(previousTrades, grouped);
  // Invert: new provisional id → previous id (when remapped).
  const previousIdByGroupedId = new Map<string, string>();
  for (const [previousId, nextId] of tradeIdRemap) {
    previousIdByGroupedId.set(nextId, previousId);
  }

  const trades = grouped.map((trade) => {
    const key = tradeExecIdsKey(trade.fillExecIds);
    const previousId = previousIdByGroupedId.get(trade.id);
    const preservedFromKey = key ? preservedMetadata.get(key) : undefined;
    const preservedFromPrevious = previousId ? previousById.get(previousId) : undefined;
    const preserved = preservedFromKey ??
      (preservedFromPrevious
        ? {
            tags: preservedFromPrevious.tags,
            setup: preservedFromPrevious.setup,
            reviewNote: preservedFromPrevious.reviewNote,
            plannedRiskMode: preservedFromPrevious.plannedRiskMode,
            plannedRiskValue: preservedFromPrevious.plannedRiskValue,
            plannedRiskUsd: preservedFromPrevious.plannedRiskUsd,
            initialStop: preservedFromPrevious.initialStop,
            rating: preservedFromPrevious.rating,
            ignored: preservedFromPrevious.ignored,
            mfeUsd: preservedFromPrevious.mfeUsd,
            mfaUsd: preservedFromPrevious.mfaUsd,
            excursionInterval: preservedFromPrevious.excursionInterval,
            excursionComputedAt: preservedFromPrevious.excursionComputedAt,
            managePlaybook: preservedFromPrevious.managePlaybook,
          }
        : undefined);

    if (!preserved && !previousId) return trade;
    return {
      ...trade,
      id: previousId ?? trade.id,
      tags: preserved?.tags ?? trade.tags,
      setup: preserved?.setup ?? trade.setup,
      reviewNote: preserved?.reviewNote ?? trade.reviewNote,
      plannedRiskMode: preserved?.plannedRiskMode ?? trade.plannedRiskMode,
      plannedRiskValue: preserved?.plannedRiskValue ?? trade.plannedRiskValue,
      plannedRiskUsd: preserved?.plannedRiskUsd ?? trade.plannedRiskUsd,
      initialStop: preserved?.initialStop ?? trade.initialStop,
      rating: preserved?.rating ?? trade.rating,
      ignored: preserved?.ignored ?? trade.ignored,
      mfeUsd: preserved?.mfeUsd ?? trade.mfeUsd,
      mfaUsd: preserved?.mfaUsd ?? trade.mfaUsd,
      excursionInterval: preserved?.excursionInterval ?? trade.excursionInterval,
      excursionComputedAt: preserved?.excursionComputedAt ?? trade.excursionComputedAt,
      managePlaybook: preserved?.managePlaybook ?? trade.managePlaybook,
    };
  });

  return { trades, preservedMetadata };
}
