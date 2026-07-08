import { deriveTradeOutcomeStatus } from "@/lib/journal/journalTradeDisplay";
import {
  countActiveJournalFilters,
  defaultTradesScopeState,
  isCustomDateRange,
  type JournalFilterHelpersMode,
} from "@/lib/journal/journalFilterHelpers";
import type { JournalFilters, JournalStatsWindow } from "@/lib/journal/journalStats";
import { computeRMultiple } from "@/lib/journal/rMultiple";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";

export type JournalTradesTableColumnId =
  | "openDate"
  | "symbol"
  | "status"
  | "closeDate"
  | "entry"
  | "exit"
  | "r"
  | "setup"
  | "tags"
  | "chart"
  | "netPnL"
  | "direction"
  | "secType"
  | "activity";

export type JournalTradesTableSortKey = Extract<
  JournalTradesTableColumnId,
  "openDate" | "closeDate" | "symbol" | "status" | "entry" | "exit" | "r" | "netPnL" | "activity"
>;

export type JournalTradesTableSortDirection = "asc" | "desc";

export type JournalTradesTableSort = {
  key: JournalTradesTableSortKey;
  direction: JournalTradesTableSortDirection;
};

export type JournalTradesTableDensity = "compact" | "comfortable";

export type JournalTradesTableColumnDef = {
  id: JournalTradesTableColumnId;
  label: string;
  defaultVisible: boolean;
  sortable: boolean;
  sortKey?: JournalTradesTableSortKey;
  /** When false the column is omitted from the picker (e.g. Chart). */
  toggleable: boolean;
};

export const JOURNAL_TRADES_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_JOURNAL_TRADES_PAGE_SIZE = 50;

export const DEFAULT_JOURNAL_TRADES_TABLE_SORT: JournalTradesTableSort = {
  key: "activity",
  direction: "desc",
};

export const JOURNAL_TRADES_TABLE_COLUMNS: JournalTradesTableColumnDef[] = [
  { id: "openDate", label: "Open date", defaultVisible: true, sortable: true, sortKey: "openDate", toggleable: true },
  { id: "symbol", label: "Symbol", defaultVisible: true, sortable: true, sortKey: "symbol", toggleable: true },
  { id: "status", label: "Status", defaultVisible: true, sortable: true, sortKey: "status", toggleable: true },
  { id: "closeDate", label: "Close date", defaultVisible: true, sortable: true, sortKey: "closeDate", toggleable: true },
  { id: "entry", label: "Entry", defaultVisible: true, sortable: true, sortKey: "entry", toggleable: true },
  { id: "exit", label: "Exit", defaultVisible: true, sortable: true, sortKey: "exit", toggleable: true },
  { id: "r", label: "R", defaultVisible: true, sortable: true, sortKey: "r", toggleable: true },
  { id: "setup", label: "Setup", defaultVisible: true, sortable: false, toggleable: true },
  { id: "tags", label: "Tags", defaultVisible: true, sortable: false, toggleable: true },
  { id: "netPnL", label: "Net P&L", defaultVisible: false, sortable: true, sortKey: "netPnL", toggleable: true },
  { id: "direction", label: "Direction", defaultVisible: false, sortable: false, toggleable: true },
  { id: "secType", label: "Sec type", defaultVisible: false, sortable: false, toggleable: true },
  { id: "activity", label: "Activity", defaultVisible: false, sortable: true, sortKey: "activity", toggleable: true },
  { id: "chart", label: "Chart", defaultVisible: true, sortable: false, toggleable: false },
];

const STORAGE_KEY = "edge.journal.tradesTable.v1";

export type JournalTradesTablePrefs = {
  visibleColumns: JournalTradesTableColumnId[];
  density: JournalTradesTableDensity;
  pageSize: number;
};

export type JournalTradesPaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  from: number;
  to: number;
};

export type JournalTradesPaginationResult<T> = {
  items: T[];
  meta: JournalTradesPaginationMeta;
};

const OUTCOME_SORT_ORDER = { open: 0, win: 1, breakeven: 2, loss: 3 } as const;

export function defaultJournalTradesTablePrefs(): JournalTradesTablePrefs {
  return {
    visibleColumns: JOURNAL_TRADES_TABLE_COLUMNS.filter((col) => col.defaultVisible).map((col) => col.id),
    density: "compact",
    pageSize: DEFAULT_JOURNAL_TRADES_PAGE_SIZE,
  };
}

export function buildVisibleColumnsSet(columnIds: JournalTradesTableColumnId[]): Set<JournalTradesTableColumnId> {
  const set = new Set(columnIds);
  set.add("chart");
  return set;
}

export function readJournalTradesTablePrefs(): JournalTradesTablePrefs {
  const defaults = defaultJournalTradesTablePrefs();
  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<JournalTradesTablePrefs>;
    const validIds = new Set(JOURNAL_TRADES_TABLE_COLUMNS.map((col) => col.id));
    const visibleColumns = Array.isArray(parsed.visibleColumns)
      ? parsed.visibleColumns.filter((id): id is JournalTradesTableColumnId => validIds.has(id as JournalTradesTableColumnId))
      : defaults.visibleColumns;
    const density = parsed.density === "comfortable" ? "comfortable" : "compact";
    const pageSize = JOURNAL_TRADES_PAGE_SIZE_OPTIONS.includes(
      parsed.pageSize as (typeof JOURNAL_TRADES_PAGE_SIZE_OPTIONS)[number],
    )
      ? (parsed.pageSize as number)
      : defaults.pageSize;
    return {
      visibleColumns: visibleColumns.length > 0 ? visibleColumns : defaults.visibleColumns,
      density,
      pageSize,
    };
  } catch {
    return defaults;
  }
}

export function writeJournalTradesTablePrefs(prefs: JournalTradesTablePrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / private mode
  }
}

export function toggleJournalTradesTableSort(
  current: JournalTradesTableSort,
  columnId: JournalTradesTableColumnId,
): JournalTradesTableSort | null {
  const column = JOURNAL_TRADES_TABLE_COLUMNS.find((col) => col.id === columnId);
  if (!column?.sortable || !column.sortKey) return null;
  if (current.key === column.sortKey) {
    return {
      key: column.sortKey,
      direction: current.direction === "asc" ? "desc" : "asc",
    };
  }
  return { key: column.sortKey, direction: "desc" };
}

function tradeActivityMs(trade: JournalTradeResponse): number {
  const opened = Date.parse(trade.openedAt);
  const closed = trade.closedAt ? Date.parse(trade.closedAt) : opened;
  return Math.max(opened, closed);
}

function compareNullableNumber(
  a: number | null,
  b: number | null,
  direction: JournalTradesTableSortDirection,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === "asc" ? a - b : b - a;
}

function compareNullableString(
  a: string | null,
  b: string | null,
  direction: JournalTradesTableSortDirection,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const result = a.localeCompare(b);
  return direction === "asc" ? result : -result;
}

function compareTrades(
  a: JournalTradeResponse,
  b: JournalTradeResponse,
  sort: JournalTradesTableSort,
): number {
  const { key, direction } = sort;
  let result = 0;

  switch (key) {
    case "openDate":
      result = compareNullableNumber(Date.parse(a.openedAt), Date.parse(b.openedAt), direction);
      break;
    case "closeDate":
      result = compareNullableString(a.closedAt ?? null, b.closedAt ?? null, direction);
      break;
    case "symbol":
      result = compareNullableString(a.symbol, b.symbol, direction);
      break;
    case "status": {
      const aOrder = OUTCOME_SORT_ORDER[deriveTradeOutcomeStatus(a)];
      const bOrder = OUTCOME_SORT_ORDER[deriveTradeOutcomeStatus(b)];
      result = direction === "asc" ? aOrder - bOrder : bOrder - aOrder;
      break;
    }
    case "entry":
      result = compareNullableNumber(a.avgEntry ?? null, b.avgEntry ?? null, direction);
      break;
    case "exit":
      result = compareNullableNumber(a.avgExit ?? null, b.avgExit ?? null, direction);
      break;
    case "r":
      result = compareNullableNumber(computeRMultiple(a), computeRMultiple(b), direction);
      break;
    case "netPnL":
      result = compareNullableNumber(a.netPnL ?? null, b.netPnL ?? null, direction);
      break;
    case "activity":
      result = compareNullableNumber(tradeActivityMs(a), tradeActivityMs(b), direction);
      break;
  }

  if (result !== 0) return result;
  const openedTie = Date.parse(b.openedAt) - Date.parse(a.openedAt);
  if (openedTie !== 0) return openedTie;
  return a.id.localeCompare(b.id);
}

export function sortJournalTrades(
  trades: JournalTradeResponse[],
  sort: JournalTradesTableSort = DEFAULT_JOURNAL_TRADES_TABLE_SORT,
): JournalTradeResponse[] {
  return [...trades].sort((a, b) => compareTrades(a, b, sort));
}

export function paginateJournalTrades<T>(
  trades: T[],
  options: { page: number; pageSize: number },
): JournalTradesPaginationResult<T> {
  const total = trades.length;
  const pageSize = Math.max(1, options.pageSize);
  const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);
  const page = pageCount === 0 ? 1 : Math.min(Math.max(1, options.page), pageCount);
  const start = (page - 1) * pageSize;
  const items = trades.slice(start, start + pageSize);
  const from = total === 0 ? 0 : start + 1;
  const to = total === 0 ? 0 : start + items.length;

  return {
    items,
    meta: { total, page, pageSize, pageCount, from, to },
  };
}

export function formatJournalTradesResultLabel(meta: JournalTradesPaginationMeta): string {
  if (meta.total === 0) return "No trades";
  if (meta.total <= meta.pageSize) {
    return `${meta.total} trade${meta.total === 1 ? "" : "s"}`;
  }
  return `Showing ${meta.from}–${meta.to} of ${meta.total} trades`;
}

export function hasActiveJournalScope(
  filters: JournalFilters,
  window: JournalStatsWindow,
  mode: JournalFilterHelpersMode,
): boolean {
  const defaults = defaultTradesScopeState();
  if (mode === "trades" && window !== defaults.window) return true;
  if (isCustomDateRange(filters)) return true;
  if (filters.symbol?.trim()) return true;
  if (countActiveJournalFilters(filters, { mode }) > 0) return true;
  return false;
}

export function toggleJournalTradesTableColumn(
  visibleColumns: JournalTradesTableColumnId[],
  columnId: JournalTradesTableColumnId,
): JournalTradesTableColumnId[] {
  const column = JOURNAL_TRADES_TABLE_COLUMNS.find((col) => col.id === columnId);
  if (!column?.toggleable) return visibleColumns;
  const set = new Set(visibleColumns);
  if (set.has(columnId)) {
    if (set.size <= 2) return visibleColumns;
    set.delete(columnId);
  } else {
    set.add(columnId);
  }
  set.add("chart");
  return JOURNAL_TRADES_TABLE_COLUMNS.filter((col) => set.has(col.id)).map((col) => col.id);
}

export function sortAriaValue(
  sort: JournalTradesTableSort,
  columnId: JournalTradesTableColumnId,
): "ascending" | "descending" | "none" {
  const column = JOURNAL_TRADES_TABLE_COLUMNS.find((col) => col.id === columnId);
  if (!column?.sortKey || sort.key !== column.sortKey) return "none";
  return sort.direction === "asc" ? "ascending" : "descending";
}

export function sortIndicator(
  sort: JournalTradesTableSort,
  columnId: JournalTradesTableColumnId,
): string {
  const aria = sortAriaValue(sort, columnId);
  if (aria === "ascending") return "↑";
  if (aria === "descending") return "↓";
  return "↕";
}
