import type { ChartEventKind } from "@edge/chart-core";
import type { CorporateEvent, CorporateEventType, MarketEvent } from "../contracts/events";

export function marketEventToChartKind(event: MarketEvent): ChartEventKind {
  switch (event.canonicalId) {
    case "earnings":
      return "earnings";
    case "dividend":
      return "dividend";
    case "split":
      return "split";
    case "sec_8k":
    case "sec_10q":
    case "sec_10k":
    case "sec_filing":
      return "filing";
    default:
      return event.family === "macro" ? "macro" : "filing";
  }
}

export function marketEventToLegacyType(event: MarketEvent): CorporateEventType {
  const kind = marketEventToChartKind(event);
  if (kind === "macro") return "economic";
  if (kind === "news" || kind === "options_expiration") return "other";
  return kind;
}

export function marketEventToCorporateEvent(event: MarketEvent): CorporateEvent {
  return {
    id: event.id,
    type: marketEventToLegacyType(event),
    symbol: event.symbol,
    title: event.title,
    scheduledAt: event.scheduledAt,
    reportedAt: event.actualAt,
    source: event.source,
    details: {
      ...event.details,
      canonicalId: event.canonicalId,
      family: event.family,
      importance: event.importance,
      coverageLevel: event.coverageLevel,
    },
  };
}

export function parseEventTimestamp(scheduledAt: string): number {
  const parsed = Date.parse(scheduledAt);
  return Number.isFinite(parsed) ? parsed : Date.now();
}
