/** Legacy corporate event type — kept for backward-compatible API consumers. */
export type CorporateEventType =
  | "earnings"
  | "dividend"
  | "split"
  | "filing"
  | "economic"
  | "other";

/** @deprecated Prefer MarketEvent; retained for legacy routes and tests. */
export type CorporateEvent = {
  id: string;
  type: CorporateEventType;
  symbol?: string;
  title: string;
  scheduledAt?: string;
  reportedAt?: string;
  source: string;
  details?: Record<string, unknown>;
};

export type EventFamily =
  | "corporate"
  | "filing"
  | "macro"
  | "news"
  | "market_structure";

export type EventImportance = "low" | "medium" | "high";

export type MarketEventStatus = "scheduled" | "released" | "revised" | "cancelled";

/** How complete the event card is from the upstream provider. */
export type EventCoverageLevel = "full" | "partial";

/** Normalized market event — provider-neutral contract for chart pins and AI tools. */
export type MarketEvent = {
  id: string;
  canonicalId: string;
  family: EventFamily;
  category?: string;
  title: string;
  scheduledAt: string;
  actualAt?: string;
  status: MarketEventStatus;
  importance: EventImportance;
  country?: string;
  symbol?: string;
  affectedAssets?: string[];
  actual?: number | string | null;
  forecast?: number | string | null;
  previous?: number | string | null;
  revisedPrevious?: number | string | null;
  surprise?: number | null;
  source: string;
  sourceEventId?: string;
  coverageLevel?: EventCoverageLevel;
  details?: Record<string, unknown>;
};

export type MarketEventsQuery = {
  symbol?: string;
  from?: string;
  to?: string;
  families?: EventFamily[];
  canonicalIds?: string[];
  importance?: EventImportance[];
  includeMacro?: boolean;
};
