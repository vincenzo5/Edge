import type {
  EventFamily,
  EventImportance,
  MarketEvent,
  MarketEventsQuery,
} from "../contracts/events";
import { importanceRank } from "./importance";

function parseDateBoundary(value: string | undefined, endOfDay: boolean): number | null {
  if (!value) return null;
  const parsed = Date.parse(value.length <= 10 ? `${value}${endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"}` : value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function filterMarketEvents(
  events: MarketEvent[],
  query: MarketEventsQuery,
): MarketEvent[] {
  const fromMs = parseDateBoundary(query.from, false);
  const toMs = parseDateBoundary(query.to, true);
  const familySet = query.families?.length ? new Set<EventFamily>(query.families) : null;
  const canonicalSet = query.canonicalIds?.length ? new Set(query.canonicalIds) : null;
  const importanceSet = query.importance?.length
    ? new Set<EventImportance>(query.importance)
    : null;

  return events.filter((event) => {
    const scheduledMs = Date.parse(event.scheduledAt);
    if (fromMs != null && Number.isFinite(scheduledMs) && scheduledMs < fromMs) {
      return false;
    }
    if (toMs != null && Number.isFinite(scheduledMs) && scheduledMs > toMs) {
      return false;
    }
    if (familySet && !familySet.has(event.family)) return false;
    if (canonicalSet && !canonicalSet.has(event.canonicalId)) return false;
    if (importanceSet && !importanceSet.has(event.importance)) return false;
    return true;
  });
}

export function defaultFamiliesForQuery(query: MarketEventsQuery): EventFamily[] {
  if (query.families?.length) return query.families;
  if (query.includeMacro) return ["corporate", "filing", "macro"];
  return ["corporate", "filing"];
}

export function sortEventsByImportanceThenDate(events: MarketEvent[]): MarketEvent[] {
  return [...events].sort((a, b) => {
    const importanceDiff = importanceRank(b.importance) - importanceRank(a.importance);
    if (importanceDiff !== 0) return importanceDiff;
    return Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt);
  });
}
