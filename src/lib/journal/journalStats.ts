import type { JournalSetup, JournalTradeStatus } from "@/lib/journal/types";

export type JournalStatsWindow = "today" | "7d" | "30d" | "all";

export type JournalStatsTradeInput = {
  status: JournalTradeStatus;
  openedAt: string;
  closedAt?: string | null;
  netPnL?: number | null;
  grossPnL?: number | null;
};

export type JournalReportTradeInput = JournalStatsTradeInput & {
  symbol?: string;
  tags?: string[];
  setup?: JournalSetup | null;
};

export type JournalFilterOutcome = "all" | "win" | "loss";

export type JournalFilters = {
  status?: "all" | "open" | "closed";
  symbol?: string;
  setup?: JournalSetup | "all";
  tag?: string;
  outcome?: JournalFilterOutcome;
  closedFrom?: string;
  closedTo?: string;
  closedDate?: string;
};

export const EMPTY_JOURNAL_FILTERS: JournalFilters = {
  status: "all",
  setup: "all",
  outcome: "all",
};

export type JournalStats = {
  tradeCount: number;
  closedCount: number;
  winCount: number;
  lossCount: number;
  winRate: number | null;
  netPnL: number;
  grossPnL: number;
  avgWin: number | null;
  avgLoss: number | null;
  totalProfit: number;
  totalLoss: number;
  profitFactor: number | null;
  expectancy: number | null;
};

export type DailyPnLRow = {
  date: string;
  netPnL: number;
  tradeCount: number;
};

export type EquityCurvePoint = {
  date: string;
  tradePnL: number;
  cumulativePnL: number;
};

export type IntradayPnLPoint = {
  closedAt: string;
  tradePnL: number;
  cumulativePnL: number;
};

export type DaySummaryTradeInput = JournalReportTradeInput & {
  totalCommission?: number | null;
  netQuantity?: number | null;
};

export type DaySummaryStats = JournalStats & {
  totalCommissions: number;
  volume: number;
};

export type BreakdownRow = {
  bucket: string;
  tradeCount: number;
  winRate: number | null;
  netPnL: number;
  profitFactor: number | null;
};

export type TimeBucketDimension = "hour" | "weekday";

const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function tradeTimestampForBucket(trade: JournalReportTradeInput): string | null {
  if (trade.status === "closed" && trade.closedAt) return trade.closedAt;
  if (trade.openedAt) return trade.openedAt;
  return null;
}

function formatHourBucket(iso: string, timeZone: string): string {
  const date = new Date(iso);
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).format(date),
  );
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatWeekdayBucket(iso: string, timeZone: string): string {
  const date = new Date(iso);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  return weekday.slice(0, 3);
}

export function computeTimeBreakdownReport(
  trades: JournalReportTradeInput[],
  dimension: TimeBucketDimension,
  timeZone = "America/New_York",
): BreakdownRow[] {
  const closed = trades.filter((trade) => trade.status === "closed");
  const buckets = new Map<string, JournalReportTradeInput[]>();

  for (const trade of closed) {
    const timestamp = tradeTimestampForBucket(trade);
    if (!timestamp) continue;
    const bucket =
      dimension === "hour"
        ? formatHourBucket(timestamp, timeZone)
        : formatWeekdayBucket(timestamp, timeZone);
    const list = buckets.get(bucket) ?? [];
    list.push(trade);
    buckets.set(bucket, list);
  }

  const rows = [...buckets.entries()].map(([bucket, bucketTrades]) => ({
    bucket,
    ...statsForBucket(bucketTrades),
  }));

  if (dimension === "hour") {
    return rows.sort((a, b) => a.bucket.localeCompare(b.bucket));
  }

  return rows.sort(
    (a, b) => WEEKDAY_ORDER.indexOf(a.bucket) - WEEKDAY_ORDER.indexOf(b.bucket),
  );
}

export type CalendarMonthCell = {
  date: string;
  inMonth: boolean;
  netPnL: number | null;
  tradeCount: number;
};

export type CalendarMonth = {
  year: number;
  month: number;
  cells: CalendarMonthCell[];
};

function windowStart(window: JournalStatsWindow, now = Date.now()): number {
  const dayMs = 86_400_000;
  switch (window) {
    case "today":
      return new Date(new Date(now).toDateString()).getTime();
    case "7d":
      return now - 7 * dayMs;
    case "30d":
      return now - 30 * dayMs;
    default:
      return 0;
  }
}

function tradeNetPnL(trade: JournalStatsTradeInput): number {
  return trade.netPnL ?? trade.grossPnL ?? 0;
}

function closedDatePart(trade: JournalReportTradeInput): string | null {
  if (trade.status !== "closed" || !trade.closedAt) return null;
  return trade.closedAt.slice(0, 10);
}

export function filterTradesByWindow(
  trades: JournalStatsTradeInput[],
  window: JournalStatsWindow,
  now = Date.now(),
): JournalStatsTradeInput[] {
  const start = windowStart(window, now);
  return trades.filter((trade) => {
    if (trade.status !== "closed") return false;
    const closedAt = trade.closedAt ? Date.parse(trade.closedAt) : Date.parse(trade.openedAt);
    return closedAt >= start;
  });
}

export function filterJournalTrades(
  trades: JournalReportTradeInput[],
  filters: JournalFilters = EMPTY_JOURNAL_FILTERS,
): JournalReportTradeInput[] {
  return trades.filter((trade) => matchesJournalFilters(trade, filters));
}

export function matchesJournalFilters(
  trade: JournalReportTradeInput,
  filters: JournalFilters = EMPTY_JOURNAL_FILTERS,
): boolean {
  const status = filters.status ?? "all";
  if (status !== "all" && trade.status !== status) return false;

  if (filters.symbol?.trim()) {
    const symbol = filters.symbol.trim().toUpperCase();
    if ((trade.symbol ?? "").toUpperCase() !== symbol) return false;
  }

  const setup = filters.setup ?? "all";
  if (setup !== "all" && (trade.setup ?? null) !== setup) return false;

  if (filters.tag?.trim()) {
    if (!(trade.tags ?? []).includes(filters.tag.trim())) return false;
  }

  const outcome = filters.outcome ?? "all";
  if (outcome !== "all") {
    if (trade.status !== "closed") return false;
    const pnl = tradeNetPnL(trade);
    if (outcome === "win" && pnl <= 0) return false;
    if (outcome === "loss" && pnl >= 0) return false;
  }

  const closedDate = closedDatePart(trade);
  if (filters.closedDate) {
    if (closedDate !== filters.closedDate) return false;
  } else {
    if (filters.closedFrom && (!closedDate || closedDate < filters.closedFrom)) return false;
    if (filters.closedTo && (!closedDate || closedDate > filters.closedTo)) return false;
  }

  return true;
}

export function hasCustomClosedDateRange(filters: JournalFilters): boolean {
  return Boolean(filters.closedFrom?.trim() || filters.closedTo?.trim());
}

export function scopeClosedTradesForReporting(
  trades: JournalReportTradeInput[],
  filters: JournalFilters,
  window: JournalStatsWindow,
  now = Date.now(),
): JournalReportTradeInput[] {
  const filtered = filterJournalTrades(trades, filters);
  if (hasCustomClosedDateRange(filters)) {
    return filtered.filter((trade) => trade.status === "closed");
  }
  return filterTradesByWindow(filtered, window, now) as JournalReportTradeInput[];
}

export function scopeTradesForReporting(
  trades: JournalReportTradeInput[],
  filters: JournalFilters,
  window: JournalStatsWindow,
  now = Date.now(),
): JournalReportTradeInput[] {
  return scopeClosedTradesForReporting(trades, filters, window, now);
}

export function filterOpenJournalTrades(
  trades: JournalReportTradeInput[],
  filters: JournalFilters = EMPTY_JOURNAL_FILTERS,
): JournalReportTradeInput[] {
  return filterJournalTrades(trades, filters).filter((trade) => trade.status === "open");
}

export function scopeTradesForTradesView(
  trades: JournalReportTradeInput[],
  filters: JournalFilters,
  window: JournalStatsWindow,
  now = Date.now(),
): JournalReportTradeInput[] {
  const status = filters.status ?? "all";
  if (status === "open") {
    return filterOpenJournalTrades(trades, filters);
  }
  if (status === "closed") {
    return scopeClosedTradesForReporting(trades, filters, window, now);
  }
  const open = filterOpenJournalTrades(trades, filters);
  const closed = scopeClosedTradesForReporting(trades, filters, window, now);
  return [...open, ...closed];
}

export function computeJournalStats(
  trades: JournalStatsTradeInput[],
  window: JournalStatsWindow = "all",
  now = Date.now(),
): JournalStats {
  const scoped = filterTradesByWindow(trades, window, now);
  const pnls = scoped.map(tradeNetPnL);
  const wins = pnls.filter((value) => value > 0);
  const losses = pnls.filter((value) => value < 0);
  const netPnL = pnls.reduce((sum, value) => sum + value, 0);
  const grossPnL = scoped.reduce((sum, trade) => sum + (trade.grossPnL ?? tradeNetPnL(trade)), 0);
  const winRate = scoped.length > 0 ? wins.length / scoped.length : null;
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : null;
  const avgLoss =
    losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : null;
  const totalProfit = wins.reduce((a, b) => a + b, 0);
  const totalLoss = losses.reduce((a, b) => a + b, 0);
  const profitFactor =
    losses.length > 0
      ? Math.abs(totalProfit / totalLoss)
      : wins.length > 0
        ? Infinity
        : null;
  const expectancy =
    winRate != null && avgWin != null && avgLoss != null
      ? winRate * avgWin + (1 - winRate) * avgLoss
      : null;

  return {
    tradeCount: trades.length,
    closedCount: scoped.length,
    winCount: wins.length,
    lossCount: losses.length,
    winRate,
    netPnL,
    grossPnL,
    avgWin,
    avgLoss,
    totalProfit,
    totalLoss,
    profitFactor: profitFactor === Infinity ? null : profitFactor,
    expectancy,
  };
}

export function computeDailyPnL(trades: JournalStatsTradeInput[]): DailyPnLRow[] {
  const byDate = new Map<string, DailyPnLRow>();
  for (const trade of trades) {
    if (trade.status !== "closed" || !trade.closedAt) continue;
    const date = trade.closedAt.slice(0, 10);
    const row = byDate.get(date) ?? { date, netPnL: 0, tradeCount: 0 };
    row.netPnL += tradeNetPnL(trade);
    row.tradeCount += 1;
    byDate.set(date, row);
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export function filterTradesClosedOnDate(
  trades: JournalReportTradeInput[],
  isoDate: string,
): JournalReportTradeInput[] {
  return trades.filter(
    (trade) =>
      trade.status === "closed" &&
      trade.closedAt != null &&
      trade.closedAt.slice(0, 10) === isoDate,
  );
}

export function computeIntradayPnLCurve(trades: JournalReportTradeInput[]): IntradayPnLPoint[] {
  const closed = trades
    .filter((trade) => trade.status === "closed" && trade.closedAt)
    .sort((a, b) => Date.parse(a.closedAt!) - Date.parse(b.closedAt!));

  if (closed.length === 0) return [];

  const points: IntradayPnLPoint[] = [
    {
      closedAt: closed[0]!.closedAt!,
      tradePnL: 0,
      cumulativePnL: 0,
    },
  ];

  let cumulative = 0;
  for (const trade of closed) {
    const tradePnL = tradeNetPnL(trade);
    cumulative += tradePnL;
    points.push({
      closedAt: trade.closedAt!,
      tradePnL,
      cumulativePnL: cumulative,
    });
  }

  return points;
}

export function computeDaySummaryStats(trades: DaySummaryTradeInput[]): DaySummaryStats {
  const stats = computeJournalStats(trades, "all");
  const totalCommissions = trades.reduce((sum, trade) => sum + (trade.totalCommission ?? 0), 0);
  const volume = trades.reduce((sum, trade) => sum + Math.abs(trade.netQuantity ?? 0), 0);
  return {
    ...stats,
    totalCommissions,
    volume,
  };
}

export function computeEquityCurve(trades: JournalStatsTradeInput[]): EquityCurvePoint[] {
  const byDate = new Map<string, number>();
  for (const trade of trades) {
    if (trade.status !== "closed" || !trade.closedAt) continue;
    const date = trade.closedAt.slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + tradeNetPnL(trade));
  }

  const dates = [...byDate.keys()].sort((a, b) => a.localeCompare(b));
  let cumulative = 0;
  return dates.map((date) => {
    const tradePnL = byDate.get(date) ?? 0;
    cumulative += tradePnL;
    return { date, tradePnL, cumulativePnL: cumulative };
  });
}

function statsForBucket(trades: JournalReportTradeInput[]): Omit<BreakdownRow, "bucket"> {
  const stats = computeJournalStats(trades, "all");
  return {
    tradeCount: stats.closedCount,
    winRate: stats.winRate,
    netPnL: stats.netPnL,
    profitFactor: stats.profitFactor,
  };
}

export function computeBreakdownReport(
  trades: JournalReportTradeInput[],
  dimension: "setup" | "tag",
): BreakdownRow[] {
  const closed = trades.filter((trade) => trade.status === "closed");
  const buckets = new Map<string, JournalReportTradeInput[]>();

  if (dimension === "setup") {
    for (const trade of closed) {
      const bucket = trade.setup ?? "(no setup)";
      const list = buckets.get(bucket) ?? [];
      list.push(trade);
      buckets.set(bucket, list);
    }
  } else {
    for (const trade of closed) {
      const tags = trade.tags ?? [];
      if (tags.length === 0) {
        const list = buckets.get("(untagged)") ?? [];
        list.push(trade);
        buckets.set("(untagged)", list);
        continue;
      }
      for (const tag of tags) {
        const list = buckets.get(tag) ?? [];
        list.push(trade);
        buckets.set(tag, list);
      }
    }
  }

  return [...buckets.entries()]
    .map(([bucket, bucketTrades]) => ({
      bucket,
      ...statsForBucket(bucketTrades),
    }))
    .sort((a, b) => b.netPnL - a.netPnL);
}

function formatIsoDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function buildCalendarMonth(
  year: number,
  month: number,
  dailyRows: DailyPnLRow[],
): CalendarMonth {
  const byDate = new Map(dailyRows.map((row) => [row.date, row]));
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const cells: CalendarMonthCell[] = [];

  for (let i = 0; i < startOffset; i += 1) {
    const date = new Date(year, month, 1 - (startOffset - i));
    cells.push({
      date: formatIsoDate(date.getFullYear(), date.getMonth(), date.getDate()),
      inMonth: false,
      netPnL: null,
      tradeCount: 0,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = formatIsoDate(year, month, day);
    const row = byDate.get(date);
    cells.push({
      date,
      inMonth: true,
      netPnL: row?.netPnL ?? null,
      tradeCount: row?.tradeCount ?? 0,
    });
  }

  while (cells.length % 7 !== 0) {
    const lastCell = cells[cells.length - 1];
    const lastDate = new Date(`${lastCell.date}T12:00:00`);
    const next = new Date(lastDate);
    next.setDate(next.getDate() + 1);
    cells.push({
      date: formatIsoDate(next.getFullYear(), next.getMonth(), next.getDate()),
      inMonth: false,
      netPnL: null,
      tradeCount: 0,
    });
  }

  return { year, month, cells };
}
