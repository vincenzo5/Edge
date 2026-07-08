import type { ChartAnnotationChannelMarker } from "@edge/chart-core";

import type { JournalFill, JournalTrade } from "@/lib/journal/types";

function inferFillRole(
  fill: JournalFill,
  trade: JournalTrade,
  orderedFills: JournalFill[],
): "open" | "close" {
  const first = orderedFills[0];
  if (first && fill.execId === first.execId) return "open";
  return "close";
}

export function buildJournalExecutionMarkers(
  trade: JournalTrade,
  fills: JournalFill[],
): ChartAnnotationChannelMarker[] {
  const execIdSet = new Set(trade.fillExecIds);
  const linked = fills
    .filter((fill) => execIdSet.has(fill.execId))
    .slice()
    .sort((a, b) => Date.parse(a.fillTime) - Date.parse(b.fillTime));

  const roleByExecId = new Map(
    (trade.fillLinks ?? []).map((link) => [link.execId, link.role]),
  );

  return linked.map((fill) => {
    const role = roleByExecId.get(fill.execId) ?? inferFillRole(fill, trade, linked);
    const isEntry = role === "open";
    const legLabel = fill.contract.localSymbol ?? fill.contract.symbol ?? trade.symbol;
    return {
      id: `journal-${trade.id}-${fill.execId}`,
      timestamp: Date.parse(fill.fillTime),
      price: fill.price,
      label: isEntry ? `Entry ${legLabel}` : `Exit ${legLabel}`,
      kind: "signal",
      color: isEntry ? "#22c55e" : "#ef4444",
    };
  });
}
