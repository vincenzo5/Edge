import type { MarketEvent } from "../contracts/events";

/** Higher rank = preferred when deduping the same logical event. */
const SOURCE_RANK: Record<string, number> = {
  sec: 100,
  fmp: 80,
  economic_calendar: 90,
  fred: 40,
  yahoo: 30,
};

export function eventIdentityKey(event: MarketEvent): string {
  const dateKey = event.scheduledAt.slice(0, 10);
  const symbolKey = event.symbol?.toUpperCase() ?? "";
  const countryKey = event.country ?? "";
  return `${event.canonicalId}|${dateKey}|${countryKey}|${symbolKey}`;
}

export function sourceRank(source: string): number {
  return SOURCE_RANK[source] ?? 0;
}

function mergeEvents(primary: MarketEvent, secondary: MarketEvent): MarketEvent {
  return {
    ...primary,
    actual: primary.actual ?? secondary.actual,
    forecast: primary.forecast ?? secondary.forecast,
    previous: primary.previous ?? secondary.previous,
    revisedPrevious: primary.revisedPrevious ?? secondary.revisedPrevious,
    surprise: primary.surprise ?? secondary.surprise,
    actualAt: primary.actualAt ?? secondary.actualAt,
    affectedAssets:
      primary.affectedAssets?.length
        ? primary.affectedAssets
        : secondary.affectedAssets,
    details: { ...secondary.details, ...primary.details },
    coverageLevel:
      primary.coverageLevel === "full" || secondary.coverageLevel === "full"
        ? "full"
        : "partial",
  };
}

/** Dedupe events by identity key, preferring higher-ranked sources. */
export function dedupeMarketEvents(events: MarketEvent[]): MarketEvent[] {
  const byKey = new Map<string, MarketEvent>();

  for (const event of events) {
    const key = eventIdentityKey(event);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, event);
      continue;
    }

    const existingRank = sourceRank(existing.source);
    const incomingRank = sourceRank(event.source);

    if (incomingRank > existingRank) {
      byKey.set(key, mergeEvents(event, existing));
    } else if (incomingRank === existingRank) {
      byKey.set(key, mergeEvents(existing, event));
    } else {
      byKey.set(key, mergeEvents(existing, event));
    }
  }

  return [...byKey.values()].sort(
    (a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt),
  );
}
