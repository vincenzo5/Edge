/** Chart display timezone — IANA id, UTC, or exchange sentinel. */

export type ChartTimeZone = 'UTC' | 'exchange' | string;

export const DEFAULT_CHART_TIMEZONE: ChartTimeZone = 'UTC';

export type ChartTimeZoneOption = {
  id: ChartTimeZone;
  /** Menu label, e.g. "(UTC-4) New York" */
  label: string;
  /** Section header in picker; omitted for inline items */
  section?: 'special';
};

/** Curated TradingView-style timezone list (not exhaustive IANA catalog). */
export const CHART_TIMEZONE_OPTIONS: readonly { id: ChartTimeZone; city: string }[] = [
  { id: 'Pacific/Honolulu', city: 'Honolulu' },
  { id: 'America/Anchorage', city: 'Anchorage' },
  { id: 'America/Los_Angeles', city: 'Los Angeles' },
  { id: 'America/Vancouver', city: 'Vancouver' },
  { id: 'America/Phoenix', city: 'Phoenix' },
  { id: 'America/Denver', city: 'Denver' },
  { id: 'America/Chicago', city: 'Chicago' },
  { id: 'America/Mexico_City', city: 'Mexico City' },
  { id: 'America/Toronto', city: 'Toronto' },
  { id: 'America/New_York', city: 'New York' },
  { id: 'America/Sao_Paulo', city: 'São Paulo' },
  { id: 'America/Buenos_Aires', city: 'Buenos Aires' },
  { id: 'Atlantic/Reykjavik', city: 'Reykjavik' },
  { id: 'Europe/Lisbon', city: 'Lisbon' },
  { id: 'Europe/London', city: 'London' },
  { id: 'Europe/Paris', city: 'Paris' },
  { id: 'Europe/Berlin', city: 'Berlin' },
  { id: 'Europe/Athens', city: 'Athens' },
  { id: 'Europe/Moscow', city: 'Moscow' },
  { id: 'Asia/Dubai', city: 'Dubai' },
  { id: 'Asia/Kolkata', city: 'Kolkata' },
  { id: 'Asia/Singapore', city: 'Singapore' },
  { id: 'Asia/Hong_Kong', city: 'Hong Kong' },
  { id: 'Asia/Tokyo', city: 'Tokyo' },
  { id: 'Asia/Seoul', city: 'Seoul' },
  { id: 'Australia/Sydney', city: 'Sydney' },
  { id: 'Pacific/Auckland', city: 'Auckland' },
] as const;

const KNOWN_IDS = new Set<ChartTimeZone>([
  'UTC',
  'exchange',
  ...CHART_TIMEZONE_OPTIONS.map((o) => o.id),
]);

/** Map Yahoo/exchange codes to IANA zones for the "Exchange" sentinel. */
const EXCHANGE_TIMEZONE_MAP: Record<string, string> = {
  NMS: 'America/New_York',
  NYQ: 'America/New_York',
  NASDAQ: 'America/New_York',
  NYSE: 'America/New_York',
  NCM: 'America/New_York',
  NGM: 'America/New_York',
  ASE: 'America/New_York',
  AMEX: 'America/New_York',
  ARCA: 'America/New_York',
  BATS: 'America/New_York',
  PNK: 'America/New_York',
  OTC: 'America/New_York',
  LSE: 'Europe/London',
  LON: 'Europe/London',
  L: 'Europe/London',
  XETRA: 'Europe/Berlin',
  GER: 'Europe/Berlin',
  FRA: 'Europe/Berlin',
  PAR: 'Europe/Paris',
  EPA: 'Europe/Paris',
  TSE: 'Asia/Tokyo',
  TYO: 'Asia/Tokyo',
  JP: 'Asia/Tokyo',
  HKG: 'Asia/Hong_Kong',
  HK: 'Asia/Hong_Kong',
  SHH: 'Asia/Shanghai',
  SHZ: 'Asia/Shanghai',
  SSE: 'Asia/Shanghai',
  SZSE: 'Asia/Shanghai',
  ASX: 'Australia/Sydney',
  AX: 'Australia/Sydney',
  TSX: 'America/Toronto',
  TOR: 'America/Toronto',
  V: 'America/Toronto',
};

export function normalizeChartTimeZone(value: unknown): ChartTimeZone {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_CHART_TIMEZONE;
  const trimmed = value.trim();
  if (trimmed === 'UTC' || trimmed === 'exchange') return trimmed;
  if (KNOWN_IDS.has(trimmed)) return trimmed;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return trimmed;
  } catch {
    return DEFAULT_CHART_TIMEZONE;
  }
}

export function exchangeToTimeZone(exchange?: string | null): string {
  if (!exchange) return 'America/New_York';
  const key = exchange.trim().toUpperCase();
  return EXCHANGE_TIMEZONE_MAP[key] ?? 'America/New_York';
}

/** Resolve a chart setting to an IANA timezone id. */
export function resolveChartTimeZone(
  setting: ChartTimeZone,
  exchange?: string | null,
): string {
  if (setting === 'UTC') return 'UTC';
  if (setting === 'exchange') return exchangeToTimeZone(exchange);
  return setting;
}

function utcOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const match = offsetPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const mins = Number(match[3] ?? 0);
  return sign * (hours * 60 + mins);
}

/** Format offset label like "(UTC-4) New York". */
export function formatTimeZoneMenuLabel(
  timeZone: ChartTimeZone,
  city: string,
  at: Date = new Date(),
): string {
  if (timeZone === 'UTC') return 'UTC';
  if (timeZone === 'exchange') return 'Exchange';
  const iana = timeZone;
  const offsetMin = utcOffsetMinutes(at, iana);
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const offset =
    m === 0
      ? `(UTC${sign}${h})`
      : `(UTC${sign}${h}:${String(m).padStart(2, '0')})`;
  return `${offset} ${city}`;
}

export function buildTimeZoneMenuOptions(at: Date = new Date()): ChartTimeZoneOption[] {
  const special: ChartTimeZoneOption[] = [
    { id: 'UTC', label: 'UTC', section: 'special' },
    { id: 'exchange', label: 'Exchange', section: 'special' },
  ];
  const zones = CHART_TIMEZONE_OPTIONS.map(({ id, city }) => ({
    id,
    label: formatTimeZoneMenuLabel(id, city, at),
  }));
  return [...special, ...zones];
}

const clockTimeFmtCache = new Map<string, Intl.DateTimeFormat>();

function clockTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = clockTimeFmtCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    clockTimeFmtCache.set(timeZone, fmt);
  }
  return fmt;
}

export function formatClockAbbreviation(
  setting: ChartTimeZone,
  exchange: string | null | undefined,
  at: Date = new Date(),
): string {
  if (setting === 'UTC') return 'UTC';
  const iana = resolveChartTimeZone(setting, exchange);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: iana,
    timeZoneName: 'short',
  }).formatToParts(at);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? iana;
}

/** Live clock label: "18:17:57 UTC". */
export function formatClockLabel(
  setting: ChartTimeZone,
  exchange: string | null | undefined,
  at: Date = new Date(),
): string {
  const iana = resolveChartTimeZone(setting, exchange);
  const time = clockTimeFormatter(iana).format(at);
  const abbr = formatClockAbbreviation(setting, exchange, at);
  return `${time} ${abbr}`;
}
