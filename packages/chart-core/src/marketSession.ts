/** US equity regular vs extended-hours session classification (America/New_York). */

export type MarketSessionMode = 'regular' | 'extended';

export type MarketSessionKind = 'preMarket' | 'regular' | 'postMarket' | 'closed';

const NY_TZ = 'America/New_York';

function nyClockParts(atMs: number): {
  hour: number;
  minute: number;
  weekday: number;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: NY_TZ,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  }).formatToParts(new Date(atMs));

  let hour = 0;
  let minute = 0;
  let weekday = 0;
  for (const part of parts) {
    if (part.type === 'hour') hour = Number(part.value);
    if (part.type === 'minute') minute = Number(part.value);
    if (part.type === 'weekday') {
      const map: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      weekday = map[part.value] ?? 0;
    }
  }
  return { hour, minute, weekday };
}

function minutesSinceMidnight(hour: number, minute: number): number {
  return hour * 60 + minute;
}

/** Classify timestamp into US equity session (NYSE/NASDAQ hours). */
export function classifyUsEquitySession(atMs: number = Date.now()): MarketSessionKind {
  const { hour, minute, weekday } = nyClockParts(atMs);
  if (weekday === 0 || weekday === 6) return 'closed';

  const mins = minutesSinceMidnight(hour, minute);
  const preOpen = 4 * 60;
  const regularOpen = 9 * 60 + 30;
  const regularClose = 16 * 60;
  const postClose = 20 * 60;

  if (mins >= preOpen && mins < regularOpen) return 'preMarket';
  if (mins >= regularOpen && mins < regularClose) return 'regular';
  if (mins >= regularClose && mins < postClose) return 'postMarket';
  return 'closed';
}

/** Map provider marketState strings when present (Yahoo/IBKR-style). */
export function parseProviderMarketState(marketState: string | null | undefined): MarketSessionKind | null {
  if (!marketState) return null;
  const normalized = marketState.trim().toUpperCase();
  if (normalized.includes('PRE')) return 'preMarket';
  if (normalized.includes('POST') || normalized.includes('AFTER')) return 'postMarket';
  if (normalized.includes('REGULAR') || normalized === 'OPEN') return 'regular';
  if (normalized.includes('CLOSED')) return 'closed';
  return null;
}

export function resolveMarketSession(args: {
  atMs?: number;
  marketState?: string | null;
}): MarketSessionKind {
  const fromProvider = parseProviderMarketState(args.marketState);
  if (fromProvider) return fromProvider;
  return classifyUsEquitySession(args.atMs ?? Date.now());
}

/** Short label prefix for live price badges during extended hours. */
export function sessionPriceLabelPrefix(session: MarketSessionKind): string | null {
  switch (session) {
    case 'preMarket':
      return 'Pre';
    case 'postMarket':
      return 'Post';
    default:
      return null;
  }
}

/** Human-readable session status for chart chrome. */
export function sessionStatusLabel(session: MarketSessionKind, mode: MarketSessionMode): string | null {
  switch (session) {
    case 'preMarket':
      return mode === 'extended' ? 'Pre-market' : 'Pre-market (quote)';
    case 'postMarket':
      return mode === 'extended' ? 'Post-market' : 'Post-market (quote)';
    case 'regular':
      return 'Regular hours';
    case 'closed':
      return 'Market closed';
  }
}

export function isExtendedSessionBar(atMs: number): boolean {
  const session = classifyUsEquitySession(atMs);
  return session === 'preMarket' || session === 'postMarket';
}
