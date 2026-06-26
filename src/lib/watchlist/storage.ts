import type { Watchlist, WatchlistItem, WatchlistState, WatchlistViewPrefs } from "./types";
import { DEFAULT_WATCHLIST_VIEW_PREFS } from "./types";

const STORAGE_KEY = "tv-ai:watchlists:v1";
export const MAX_WATCHLIST_ITEMS = 100;
export const MAX_WATCHLISTS = 20;

function createWatchlistId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `wl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const DEFAULT_WATCHLIST_STATE: WatchlistState = {
  version: 1,
  activeWatchlistId: "default-watchlist",
  selectedSymbol: null,
  watchlists: [
    {
      id: "default-watchlist",
      name: "Watchlist",
      items: [],
      createdAt: 0,
      updatedAt: 0,
    },
  ],
};

function isWatchlistItem(value: unknown): value is WatchlistItem {
  if (!value || typeof value !== "object") return false;
  const item = value as WatchlistItem;
  return typeof item.symbol === "string" && item.symbol.trim() !== "";
}

function isWatchlist(value: unknown): value is Watchlist {
  if (!value || typeof value !== "object") return false;
  const list = value as Watchlist;
  return (
    typeof list.id === "string" &&
    typeof list.name === "string" &&
    Array.isArray(list.items) &&
    typeof list.createdAt === "number" &&
    typeof list.updatedAt === "number"
  );
}

function normalizeTags(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const tags = raw
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);
  return tags.length > 0 ? Array.from(new Set(tags)) : undefined;
}

function normalizeNote(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, 280) : undefined;
}

function normalizeViewPrefs(raw: unknown): WatchlistViewPrefs {
  if (!raw || typeof raw !== "object") return DEFAULT_WATCHLIST_VIEW_PREFS;
  const prefs = raw as WatchlistViewPrefs;
  const visibleColumns =
    Array.isArray(prefs.visibleColumns) && prefs.visibleColumns.length > 0
      ? prefs.visibleColumns.filter((column): column is WatchlistViewPrefs["visibleColumns"][number] =>
          ["symbol", "last", "changePct", "volume", "marketCap"].includes(column),
        )
      : DEFAULT_WATCHLIST_VIEW_PREFS.visibleColumns;
  const groupMode =
    prefs.groupMode === "tags" || prefs.groupMode === "sector" || prefs.groupMode === "none"
      ? prefs.groupMode
      : DEFAULT_WATCHLIST_VIEW_PREFS.groupMode;
  const sortColumn =
    prefs.sort?.column &&
    ["symbol", "last", "changePct", "volume", "marketCap"].includes(prefs.sort.column)
      ? prefs.sort.column
      : DEFAULT_WATCHLIST_VIEW_PREFS.sort.column;
  const sortDirection =
    prefs.sort?.direction === "desc" ? "desc" : "asc";
  const filterTags = Array.isArray(prefs.filterTags)
    ? prefs.filterTags.filter((tag): tag is string => typeof tag === "string" && tag.trim() !== "")
    : [];
  return {
    visibleColumns,
    sort: { column: sortColumn, direction: sortDirection },
    groupMode,
    filterTags,
  };
}

function normalizeItem(raw: WatchlistItem): WatchlistItem | null {
  const symbol = raw.symbol.trim().toUpperCase();
  if (!symbol) return null;
  return {
    symbol,
    name: typeof raw.name === "string" ? raw.name : undefined,
    exchange: typeof raw.exchange === "string" ? raw.exchange : undefined,
    addedAt: typeof raw.addedAt === "number" ? raw.addedAt : Date.now(),
    color: typeof raw.color === "string" ? raw.color : undefined,
    pinned: raw.pinned === true ? true : undefined,
    tags: normalizeTags(raw.tags),
    note: normalizeNote(raw.note),
  };
}

function dedupeItems(items: WatchlistItem[]): WatchlistItem[] {
  const seen = new Set<string>();
  const out: WatchlistItem[] = [];
  for (const raw of items) {
    if (!isWatchlistItem(raw)) continue;
    const item = normalizeItem(raw);
    if (!item || seen.has(item.symbol)) continue;
    seen.add(item.symbol);
    out.push(item);
    if (out.length >= MAX_WATCHLIST_ITEMS) break;
  }
  return out;
}

function normalizeWatchlist(raw: Watchlist): Watchlist {
  const now = Date.now();
  return {
    id: raw.id,
    name: raw.name.trim() || "Watchlist",
    items: dedupeItems(raw.items),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? now,
    viewPrefs: normalizeViewPrefs(raw.viewPrefs),
  };
}

export function loadWatchlistState(): WatchlistState {
  if (typeof window === "undefined") return DEFAULT_WATCHLIST_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WATCHLIST_STATE;
    const parsed = JSON.parse(raw) as Partial<WatchlistState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.watchlists)) {
      return DEFAULT_WATCHLIST_STATE;
    }

    const watchlists = parsed.watchlists
      .filter(isWatchlist)
      .map(normalizeWatchlist)
      .slice(0, MAX_WATCHLISTS);

    if (watchlists.length === 0) return DEFAULT_WATCHLIST_STATE;

    const activeWatchlistId =
      typeof parsed.activeWatchlistId === "string" &&
      watchlists.some((w) => w.id === parsed.activeWatchlistId)
        ? parsed.activeWatchlistId
        : watchlists[0].id;

    const activeList = watchlists.find((w) => w.id === activeWatchlistId)!;
    const selectedRaw =
      typeof parsed.selectedSymbol === "string"
        ? parsed.selectedSymbol.trim().toUpperCase()
        : null;
    const selectedSymbol =
      selectedRaw && activeList.items.some((i) => i.symbol === selectedRaw)
        ? selectedRaw
        : null;

    return {
      version: 1,
      activeWatchlistId,
      selectedSymbol,
      watchlists,
    };
  } catch {
    return DEFAULT_WATCHLIST_STATE;
  }
}

export function saveWatchlistState(state: WatchlistState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be full or disabled.
  }
}

export function getActiveWatchlist(state: WatchlistState): Watchlist {
  return (
    state.watchlists.find((w) => w.id === state.activeWatchlistId) ??
    state.watchlists[0]
  );
}

export function addWatchlistItem(
  state: WatchlistState,
  item: Omit<WatchlistItem, "addedAt"> & { addedAt?: number },
): WatchlistState {
  const active = getActiveWatchlist(state);
  const normalized = normalizeItem({
    ...item,
    addedAt: item.addedAt ?? Date.now(),
  });
  if (!normalized) return state;
  if (active.items.some((i) => i.symbol === normalized.symbol)) return state;
  if (active.items.length >= MAX_WATCHLIST_ITEMS) return state;

  const now = Date.now();
  const watchlists = state.watchlists.map((w) =>
    w.id === active.id
      ? {
          ...w,
          items: [...w.items, normalized],
          updatedAt: now,
        }
      : w,
  );

  return {
    ...state,
    watchlists,
    selectedSymbol: normalized.symbol,
  };
}

export function removeWatchlistItem(state: WatchlistState, symbol: string): WatchlistState {
  const sym = symbol.trim().toUpperCase();
  const active = getActiveWatchlist(state);
  const now = Date.now();
  const watchlists = state.watchlists.map((w) =>
    w.id === active.id
      ? {
          ...w,
          items: w.items.filter((i) => i.symbol !== sym),
          updatedAt: now,
        }
      : w,
  );

  return {
    ...state,
    watchlists,
    selectedSymbol:
      state.selectedSymbol === sym ? null : state.selectedSymbol,
  };
}

export function selectWatchlistSymbol(
  state: WatchlistState,
  symbol: string | null,
): WatchlistState {
  const active = getActiveWatchlist(state);
  if (!symbol) {
    return { ...state, selectedSymbol: null };
  }
  const sym = symbol.trim().toUpperCase();
  if (!active.items.some((i) => i.symbol === sym)) {
    return { ...state, selectedSymbol: null };
  }
  return { ...state, selectedSymbol: sym };
}

function firstSymbolInList(list: Watchlist): string | null {
  return list.items[0]?.symbol ?? null;
}

function uniqueWatchlistName(existingNames: string[], desired: string): string {
  const base = desired.trim() || "Watchlist";
  if (!existingNames.includes(base)) return base;
  let n = 2;
  while (existingNames.includes(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

export function createWatchlist(
  state: WatchlistState,
  name?: string,
): WatchlistState {
  if (state.watchlists.length >= MAX_WATCHLISTS) return state;
  const now = Date.now();
  const existingNames = state.watchlists.map((w) => w.name);
  const listName = uniqueWatchlistName(existingNames, name ?? "Watchlist");
  const newList: Watchlist = {
    id: createWatchlistId(),
    name: listName,
    items: [],
    createdAt: now,
    updatedAt: now,
  };
  return {
    ...state,
    watchlists: [...state.watchlists, newList],
    activeWatchlistId: newList.id,
    selectedSymbol: null,
  };
}

export function switchWatchlist(
  state: WatchlistState,
  watchlistId: string,
): WatchlistState {
  if (!state.watchlists.some((w) => w.id === watchlistId)) return state;
  if (state.activeWatchlistId === watchlistId) return state;
  const target = state.watchlists.find((w) => w.id === watchlistId)!;
  return {
    ...state,
    activeWatchlistId: watchlistId,
    selectedSymbol: firstSymbolInList(target),
  };
}

export function renameWatchlist(
  state: WatchlistState,
  watchlistId: string,
  name: string,
): WatchlistState {
  if (!state.watchlists.some((w) => w.id === watchlistId)) return state;
  const trimmed = name.trim() || "Watchlist";
  const otherNames = state.watchlists
    .filter((w) => w.id !== watchlistId)
    .map((w) => w.name);
  const finalName = otherNames.includes(trimmed)
    ? uniqueWatchlistName(otherNames, trimmed)
    : trimmed;
  const now = Date.now();
  return {
    ...state,
    watchlists: state.watchlists.map((w) =>
      w.id === watchlistId ? { ...w, name: finalName, updatedAt: now } : w,
    ),
  };
}

export function duplicateWatchlist(
  state: WatchlistState,
  watchlistId: string,
): WatchlistState {
  if (state.watchlists.length >= MAX_WATCHLISTS) return state;
  const source = state.watchlists.find((w) => w.id === watchlistId);
  if (!source) return state;
  const now = Date.now();
  const existingNames = state.watchlists.map((w) => w.name);
  const copyName = uniqueWatchlistName(existingNames, `${source.name} Copy`);
  const newList: Watchlist = {
    id: createWatchlistId(),
    name: copyName,
    items: source.items.map((item) => ({ ...item })),
    createdAt: now,
    updatedAt: now,
    viewPrefs: source.viewPrefs ? { ...source.viewPrefs } : undefined,
  };
  return {
    ...state,
    watchlists: [...state.watchlists, newList],
    activeWatchlistId: newList.id,
    selectedSymbol: firstSymbolInList(newList),
  };
}

export function clearWatchlist(
  state: WatchlistState,
  watchlistId: string,
): WatchlistState {
  if (!state.watchlists.some((w) => w.id === watchlistId)) return state;
  const now = Date.now();
  const isActive = state.activeWatchlistId === watchlistId;
  return {
    ...state,
    watchlists: state.watchlists.map((w) =>
      w.id === watchlistId ? { ...w, items: [], updatedAt: now } : w,
    ),
    selectedSymbol: isActive ? null : state.selectedSymbol,
  };
}

export function deleteWatchlist(
  state: WatchlistState,
  watchlistId: string,
): WatchlistState {
  if (state.watchlists.length <= 1) return state;
  if (!state.watchlists.some((w) => w.id === watchlistId)) return state;
  const remaining = state.watchlists.filter((w) => w.id !== watchlistId);
  const isActive = state.activeWatchlistId === watchlistId;
  const newActive = isActive
    ? remaining[0]
    : (remaining.find((w) => w.id === state.activeWatchlistId) ?? remaining[0]);
  return {
    ...state,
    watchlists: remaining,
    activeWatchlistId: newActive.id,
    selectedSymbol: isActive
      ? firstSymbolInList(newActive)
      : state.selectedSymbol,
  };
}

export function clearWatchlistStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function updateActiveWatchlistItems(
  state: WatchlistState,
  updater: (items: WatchlistItem[]) => WatchlistItem[],
): WatchlistState {
  const active = getActiveWatchlist(state);
  const now = Date.now();
  const watchlists = state.watchlists.map((list) =>
    list.id === active.id
      ? {
          ...list,
          items: updater(list.items),
          updatedAt: now,
        }
      : list,
  );
  return { ...state, watchlists };
}

function updateActiveWatchlistItem(
  state: WatchlistState,
  symbol: string,
  updater: (item: WatchlistItem) => WatchlistItem,
): WatchlistState {
  const sym = symbol.trim().toUpperCase();
  return updateActiveWatchlistItems(state, (items) =>
    items.map((item) => (item.symbol === sym ? updater(item) : item)),
  );
}

export function toggleWatchlistItemPin(
  state: WatchlistState,
  symbol: string,
): WatchlistState {
  return updateActiveWatchlistItem(state, symbol, (item) => ({
    ...item,
    pinned: !item.pinned,
  }));
}

export function setWatchlistItemTags(
  state: WatchlistState,
  symbol: string,
  tags: string[],
): WatchlistState {
  const normalized = normalizeTags(tags) ?? [];
  return updateActiveWatchlistItem(state, symbol, (item) => ({
    ...item,
    tags: normalized.length > 0 ? normalized : undefined,
  }));
}

export function setWatchlistItemNote(
  state: WatchlistState,
  symbol: string,
  note: string,
): WatchlistState {
  const normalized = normalizeNote(note);
  return updateActiveWatchlistItem(state, symbol, (item) => ({
    ...item,
    note: normalized,
  }));
}

export function setWatchlistViewPrefs(
  state: WatchlistState,
  watchlistId: string,
  patch: Partial<WatchlistViewPrefs>,
): WatchlistState {
  if (!state.watchlists.some((list) => list.id === watchlistId)) return state;
  const now = Date.now();
  return {
    ...state,
    watchlists: state.watchlists.map((list) => {
      if (list.id !== watchlistId) return list;
      const current = normalizeViewPrefs(list.viewPrefs);
      return {
        ...list,
        viewPrefs: normalizeViewPrefs({ ...current, ...patch }),
        updatedAt: now,
      };
    }),
  };
}
