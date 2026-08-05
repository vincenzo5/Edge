import type { JournalSetup, JournalTradeStatus } from "@/lib/journal/types";
import {
  computeAggregateRStats,
  computeJournalDashboardRStats,
  type JournalDashboardRStats,
  type PlannedRiskTradeInput,
} from "@/lib/journal/rMultiple";

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
  rating?: number | null;
  ignored?: boolean;
  plannedRiskMode?: PlannedRiskTradeInput["plannedRiskMode"];
  plannedRiskValue?: number | null;
  plannedRiskUsd?: number | null;
};

export type JournalFilterRating = "all" | "unrated" | 1 | 2 | 3 | 4 | 5;

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
  rating?: JournalFilterRating;
  includeIgnored?: boolean;
};

export const EMPTY_JOURNAL_FILTERS: JournalFilters = {
  status: "all",
  setup: "all",
  outcome: "all",
  rating: "all",
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
  winCount: number;
  lossCount: number;
};

export type CalendarMonthSummary = {
  netPnL: number;
  winDays: number;
  lossDays: number;
  tradeCount: number;
};

export type EquityCurvePoint = {
  date: string;
  tradePnL: number;
  cumulativePnL: number;
};

export type JournalDrawdownStats = {
  maxDdUsd: number;
  maxDdPct: number | null;
  currentDdUsd: number;
};

export type JournalDashboardMetrics = {
  startingEquity: number | null;
  equityChangePct: number | null;
  drawdown: JournalDrawdownStats;
  rStats: JournalDashboardRStats;
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

export type CompareSlice = Partial<JournalFilters> & {
  ratingMin?: number;
  ratingMax?: number;
};

export type CompareSliceStats = {
  label: string;
  stats: JournalStats;
  tradeCount: number;
  avgR: number | null;
  tradeCountWithR: number;
};

export type CompareReportResult = {
  sliceA: CompareSliceStats;
  sliceB: CompareSliceStats;
};

export type ComparePresetId =
  | "wins_vs_losses"
  | "last30_vs_prior30"
  | "high_vs_low_rating"
  | "custom";

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
  winCount: number;
  lossCount: number;
};

export type CalendarMonth = {
  year: number;
  month: number;
  cells: CalendarMonthCell[];
};

export const CALENDAR_WEEKDAY_COLUMNS = 5;

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

  const ratingFilter = filters.rating ?? "all";
  if (ratingFilter !== "all") {
    if (ratingFilter === "unrated") {
      if ((trade.rating ?? null) != null) return false;
    } else if ((trade.rating ?? null) !== ratingFilter) {
      return false;
    }
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

  if (trade.ignored === true && filters.includeIgnored !== true) {
    return false;
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
    const pnl = tradeNetPnL(trade);
    const row =
      byDate.get(date) ??
      ({
        date,
        netPnL: 0,
        tradeCount: 0,
        winCount: 0,
        lossCount: 0,
      } satisfies DailyPnLRow);
    row.netPnL += pnl;
    row.tradeCount += 1;
    if (pnl > 0) row.winCount += 1;
    else if (pnl < 0) row.lossCount += 1;
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

export function resolveJournalStartingEquity(
  accountEquity: number | null,
  netPnL: number,
): number | null {
  if (accountEquity == null) return null;
  const starting = accountEquity - netPnL;
  return Number.isFinite(starting) && starting > 0 ? starting : null;
}

export function computeJournalEquityChangePct(
  startingEquity: number | null,
  netPnL: number,
): number | null {
  if (startingEquity == null || startingEquity <= 0) return null;
  return netPnL / startingEquity;
}

export function scaleJournalMetricByStartingEquity(
  value: number | null,
  startingEquity: number | null,
): number | null {
  if (value == null || startingEquity == null || startingEquity <= 0) return null;
  return value / startingEquity;
}

export function computeJournalDrawdown(
  equityCurve: EquityCurvePoint[],
  startingEquity: number | null,
): JournalDrawdownStats {
  if (equityCurve.length === 0) {
    return { maxDdUsd: 0, maxDdPct: null, currentDdUsd: 0 };
  }

  let equity = startingEquity ?? 0;
  let peak = equity;
  let maxDdUsd = 0;
  let currentDdUsd = 0;

  for (const point of equityCurve) {
    equity = (startingEquity ?? 0) + point.cumulativePnL;
    peak = Math.max(peak, equity);
    const drawdown = Math.max(0, peak - equity);
    maxDdUsd = Math.max(maxDdUsd, drawdown);
    currentDdUsd = drawdown;
  }

  const maxDdPct =
    startingEquity != null && startingEquity > 0 ? maxDdUsd / startingEquity : null;

  return { maxDdUsd, maxDdPct, currentDdUsd };
}

export function computeJournalDashboardMetrics(
  trades: JournalReportTradeInput[],
  accountEquity: number | null,
): JournalDashboardMetrics {
  const stats = computeJournalStats(trades, "all");
  const startingEquity = resolveJournalStartingEquity(accountEquity, stats.netPnL);
  const equityCurve = computeEquityCurve(trades);
  const drawdown = computeJournalDrawdown(equityCurve, startingEquity);
  const rStats = computeJournalDashboardRStats(trades);

  return {
    startingEquity,
    equityChangePct: computeJournalEquityChangePct(startingEquity, stats.netPnL),
    drawdown,
    rStats,
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
  dimension: "setup" | "tag" | "rating",
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
  } else if (dimension === "rating") {
    for (const trade of closed) {
      const bucket =
        trade.rating != null && trade.rating >= 1 && trade.rating <= 5
          ? String(trade.rating)
          : "(unrated)";
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
    .sort((a, b) => {
      if (dimension === "rating") {
        const rank = (value: string) => {
          if (value === "(unrated)") return 99;
          const parsed = Number.parseInt(value, 10);
          return Number.isFinite(parsed) ? parsed : 98;
        };
        return rank(a.bucket) - rank(b.bucket);
      }
      return b.netPnL - a.netPnL;
    });
}

function formatIsoDateFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function buildComparePresetSlices(
  preset: ComparePresetId,
  now = Date.now(),
): { sliceA: CompareSlice; sliceB: CompareSlice; labelA: string; labelB: string } {
  const dayMs = 86_400_000;
  switch (preset) {
    case "wins_vs_losses":
      return {
        sliceA: { outcome: "win" },
        sliceB: { outcome: "loss" },
        labelA: "Wins",
        labelB: "Losses",
      };
    case "last30_vs_prior30":
      return {
        sliceA: {
          closedFrom: formatIsoDateFromMs(now - 30 * dayMs),
          closedTo: formatIsoDateFromMs(now),
        },
        sliceB: {
          closedFrom: formatIsoDateFromMs(now - 60 * dayMs),
          closedTo: formatIsoDateFromMs(now - 30 * dayMs),
        },
        labelA: "Last 30 days",
        labelB: "Prior 30 days",
      };
    case "high_vs_low_rating":
      return {
        sliceA: { ratingMin: 4 },
        sliceB: { ratingMax: 2 },
        labelA: "Rating 4–5",
        labelB: "Rating 1–2",
      };
    default:
      return {
        sliceA: { outcome: "win" },
        sliceB: { outcome: "loss" },
        labelA: "Slice A",
        labelB: "Slice B",
      };
  }
}

export function applyCompareSlice(
  baseTrades: JournalReportTradeInput[],
  slice: CompareSlice,
): JournalReportTradeInput[] {
  const { ratingMin, ratingMax, ...filters } = slice;
  let trades = filterJournalTrades(baseTrades, {
    ...EMPTY_JOURNAL_FILTERS,
    ...filters,
  }).filter((trade) => trade.status === "closed");

  if (ratingMin != null) {
    trades = trades.filter((trade) => (trade.rating ?? 0) >= ratingMin);
  }
  if (ratingMax != null) {
    trades = trades.filter((trade) => {
      const rating = trade.rating;
      return rating != null && rating <= ratingMax;
    });
  }

  return trades;
}

export function computeCompareReport(
  baseTrades: JournalReportTradeInput[],
  sliceA: CompareSlice,
  sliceB: CompareSlice,
  labels: { a: string; b: string },
): CompareReportResult {
  const tradesA = applyCompareSlice(baseTrades, sliceA);
  const tradesB = applyCompareSlice(baseTrades, sliceB);
  const statsA = computeJournalStats(tradesA, "all");
  const statsB = computeJournalStats(tradesB, "all");
  const aggregateA = computeAggregateRStats(tradesA);
  const aggregateB = computeAggregateRStats(tradesB);

  return {
    sliceA: {
      label: labels.a,
      stats: statsA,
      tradeCount: tradesA.length,
      avgR: aggregateA.avgR,
      tradeCountWithR: aggregateA.tradeCountWithR,
    },
    sliceB: {
      label: labels.b,
      stats: statsB,
      tradeCount: tradesB.length,
      avgR: aggregateB.avgR,
      tradeCountWithR: aggregateB.tradeCountWithR,
    },
  };
}

function formatIsoDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function startOfWeekMonday(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + offset);
  return copy;
}

function endOfWeekFriday(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const offset = day === 0 ? -2 : day === 6 ? -1 : 5 - day;
  copy.setDate(copy.getDate() + offset);
  return copy;
}

function calendarCellFromRow(
  date: string,
  year: number,
  month: number,
  row: DailyPnLRow | undefined,
): CalendarMonthCell {
  const inMonth = date.startsWith(formatIsoDate(year, month, 1).slice(0, 7));
  return {
    date,
    inMonth,
    netPnL: row?.netPnL ?? null,
    tradeCount: row?.tradeCount ?? 0,
    winCount: row?.winCount ?? 0,
    lossCount: row?.lossCount ?? 0,
  };
}

export function calendarHeatIntensity(netPnL: number | null, maxAbs: number): number {
  if (netPnL == null || netPnL === 0 || maxAbs <= 0) return 0;
  return Math.min(1, Math.abs(netPnL) / maxAbs);
}

export function calendarMaxAbsPnL(cells: CalendarMonthCell[]): number {
  let max = 0;
  for (const cell of cells) {
    if (!cell.inMonth || cell.netPnL == null) continue;
    max = Math.max(max, Math.abs(cell.netPnL));
  }
  return max;
}

export function computeCalendarMonthSummary(
  dailyRows: DailyPnLRow[],
  year: number,
  month: number,
): CalendarMonthSummary {
  const monthPrefix = formatIsoDate(year, month, 1).slice(0, 7);
  const inMonth = dailyRows.filter((row) => row.date.startsWith(monthPrefix));
  let netPnL = 0;
  let winDays = 0;
  let lossDays = 0;
  let tradeCount = 0;
  for (const row of inMonth) {
    netPnL += row.netPnL;
    tradeCount += row.tradeCount;
    if (row.netPnL > 0) winDays += 1;
    else if (row.netPnL < 0) lossDays += 1;
  }
  return { netPnL, winDays, lossDays, tradeCount };
}

export function computeCalendarWeekTotals(cells: CalendarMonthCell[]): number[] {
  const totals: number[] = [];
  for (let i = 0; i < cells.length; i += CALENDAR_WEEKDAY_COLUMNS) {
    const row = cells.slice(i, i + CALENDAR_WEEKDAY_COLUMNS);
    totals.push(
      row.reduce((sum, cell) => sum + (cell.inMonth ? (cell.netPnL ?? 0) : 0), 0),
    );
  }
  return totals;
}

export function buildCalendarMonth(
  year: number,
  month: number,
  dailyRows: DailyPnLRow[],
): CalendarMonth {
  const byDate = new Map(dailyRows.map((row) => [row.date, row]));
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const rangeStart = startOfWeekMonday(firstDay);
  const rangeEnd = endOfWeekFriday(lastDay);

  const cells: CalendarMonthCell[] = [];
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    if (isWeekday(cursor)) {
      const date = formatIsoDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      cells.push(calendarCellFromRow(date, year, month, byDate.get(date)));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { year, month, cells };
}
