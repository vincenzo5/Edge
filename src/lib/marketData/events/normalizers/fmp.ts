import type { CorporateEvent, MarketEvent } from "../../contracts/events";
import type { FmpEconomicCalendarEvent } from "../../contracts/fmp";
import { defaultImportanceForCanonicalId } from "../importance";
import {
  corporateTypeToCanonicalId,
  fmpEventToCanonicalId,
  getDefinitionForCanonicalId,
  secFormToCanonicalId,
} from "../providerMappings";

export function normalizeFmpCorporateEvent(event: CorporateEvent): MarketEvent {
  const canonicalId = corporateTypeToCanonicalId(event.type) ?? "earnings";
  const scheduledAt = event.scheduledAt ?? event.reportedAt ?? new Date().toISOString().slice(0, 10);
  return {
    id: event.id,
    canonicalId,
    family: "corporate",
    category: event.type,
    title: event.title,
    scheduledAt,
    actualAt: event.reportedAt,
    status: event.reportedAt ? "released" : "scheduled",
    importance: defaultImportanceForCanonicalId(canonicalId),
    symbol: event.symbol,
    affectedAssets: event.symbol ? [event.symbol] : undefined,
    source: event.source,
    sourceEventId: event.id,
    coverageLevel: "full",
    details: event.details,
  };
}

function scheduledAtFromFmpDate(date: string): string {
  const trimmed = date.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }
  const parsed = Date.parse(trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T") + "Z");
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : trimmed;
}

function hasEventCardValues(row: FmpEconomicCalendarEvent): boolean {
  return row.estimate != null || row.previous != null || row.actual != null;
}

export function normalizeFmpEconomicCalendarEvent(
  row: FmpEconomicCalendarEvent,
): MarketEvent | null {
  const canonicalId = fmpEventToCanonicalId(row.event);
  if (!canonicalId) return null;

  const def = getDefinitionForCanonicalId(canonicalId);
  const scheduledAt = scheduledAtFromFmpDate(row.date);
  const dateKey = scheduledAt.slice(0, 10);
  const hasActual = row.actual != null;

  return {
    id: `fmp-macro-${canonicalId}-${row.country}-${dateKey}`,
    canonicalId,
    family: "macro",
    category: row.event,
    title: def?.title ?? row.event,
    scheduledAt,
    actualAt: hasActual ? scheduledAt : undefined,
    status: hasActual ? "released" : "scheduled",
    importance: defaultImportanceForCanonicalId(canonicalId),
    country: row.country,
    affectedAssets: ["SPY", "QQQ"],
    actual: row.actual,
    forecast: row.estimate,
    previous: row.previous,
    surprise:
      row.actual != null && row.estimate != null ? row.actual - row.estimate : null,
    source: "fmp",
    sourceEventId: `${row.country}-${row.event}-${row.date}`,
    coverageLevel: hasEventCardValues(row) ? "full" : "partial",
    details: {
      eventName: row.event,
      currency: row.currency,
      impact: row.impact,
      change: row.change,
      changePercentage: row.changePercentage,
    },
  };
}

export function normalizeFmpEconomicCalendarEvents(
  rows: FmpEconomicCalendarEvent[],
): MarketEvent[] {
  return rows
    .map(normalizeFmpEconomicCalendarEvent)
    .filter((event): event is MarketEvent => event != null);
}

export function normalizeFmpSecFiling(args: {
  symbol: string;
  formType: string;
  filingDate: string;
  url?: string | null;
  cik?: string | null;
  acceptedDate?: string | null;
}): MarketEvent {
  const canonicalId = secFormToCanonicalId(args.formType);
  const importance = defaultImportanceForCanonicalId(canonicalId);
  return {
    id: `fmp-filing-${args.symbol}-${args.formType}-${args.filingDate}`,
    canonicalId,
    family: "filing",
    category: args.formType,
    title: `${args.symbol} ${args.formType}`,
    scheduledAt: args.filingDate,
    actualAt: args.acceptedDate ?? args.filingDate,
    status: "released",
    importance,
    country: "US",
    symbol: args.symbol,
    affectedAssets: [args.symbol],
    source: "fmp",
    sourceEventId: args.url ?? undefined,
    coverageLevel: "full",
    details: {
      formType: args.formType,
      url: args.url,
      cik: args.cik,
    },
  };
}
