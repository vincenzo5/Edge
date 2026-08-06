/** Isolated demo journal user — switch via EDGE_DEV_USER_EMAIL before session bootstrap. */
export const DEMO_JOURNAL_USER_EMAIL = "demo@localhost";

/** Default IB account id for demo fills and picker filter. Override with EDGE_DEMO_JOURNAL_ACCOUNT_ID. */
export const DEMO_JOURNAL_ACCOUNT_ID = "DEMO0001";

/** Prefix for deterministic demo fill exec ids (idempotent upsert key). */
export const DEMO_FILL_EXEC_ID_PREFIX = "demo-fill-";

/** Env var name for demo account id in picker + seed alignment. */
export const DEMO_JOURNAL_ACCOUNT_ENV = "EDGE_DEMO_JOURNAL_ACCOUNT_ID";

export function resolveDemoJournalAccountId(): string {
  const fromEnv = process.env[DEMO_JOURNAL_ACCOUNT_ENV]?.trim();
  return fromEnv || DEMO_JOURNAL_ACCOUNT_ID;
}

export const DEMO_JOURNAL_SYMBOLS = [
  { symbol: "AAPL", conId: 265598, basePrice: 190 },
  { symbol: "MSFT", conId: 272093, basePrice: 420 },
  { symbol: "SPY", conId: 756733, basePrice: 540 },
  { symbol: "NVDA", conId: 4815747, basePrice: 130 },
  { symbol: "QQQ", conId: 320227571, basePrice: 480 },
  { symbol: "TSLA", conId: 76792991, basePrice: 240 },
  { symbol: "META", conId: 107113386, basePrice: 500 },
  { symbol: "AMD", conId: 4391, basePrice: 160 },
] as const;
