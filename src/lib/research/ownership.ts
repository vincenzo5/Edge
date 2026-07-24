/**
 * Ownership split for the Research UX track.
 * Three stores: Desk layout, Research Session, Copilot threads.
 */

export const DESK_OWNS = [
  "app-workspace tile layout and split geometry",
  "per-tile chart bindings and workspace tabs",
  "Desk tile surface selection (Chart/Screener/Journal/Scripts/Alerts/Copilot)",
  "app-workspace cloud sync and local shell documents",
] as const;

export const RESEARCH_SESSION_OWNS = [
  "session id, title, question, and metadata",
  "board cards (evidence nodes)",
  "directed links between cards",
  "session reel beats (ordered review checkpoints)",
  "threadIds[] references to Copilot threads",
] as const;

export const COPILOT_OWNS = [
  "Copilot thread messages and attachments",
  "chat stream events and confirm-required envelopes",
  "tool execution via registry (not direct React mutation)",
] as const;

/** Explicit non-ownership — never persisted as session or desk state. */
export const RESEARCH_NON_OWNS = [
  "live candles, quotes, and market data streams",
  "Board spatial layout is not Desk tile geometry",
  "Copilot message bodies (session holds threadIds only)",
  "market_research_notes Postgres rows (separate resource; may link later)",
] as const;

export type DeskOwnership = (typeof DESK_OWNS)[number];
export type ResearchSessionOwnership = (typeof RESEARCH_SESSION_OWNS)[number];
export type CopilotOwnership = (typeof COPILOT_OWNS)[number];
export type ResearchNonOwnership = (typeof RESEARCH_NON_OWNS)[number];
