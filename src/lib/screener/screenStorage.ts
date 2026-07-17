import type { SavedScreen, ScreenerColumnId, ScreenerSortSpec, ScreenerState, PersistedScreenerSortSpec } from "./types";
import { ALL_SCREENER_COLUMN_IDS, DEFAULT_SCREENER_COLUMNS, isSavedMoversScreen, isScreenerColumnId } from "./types";
import type { ScreenQuery } from "./types";
import { SCREENER_PRESETS, type ScreenerPreset } from "./presets";
import type { FmpMarketMoverKind } from "@/lib/marketData/contracts/fmp";

const STORAGE_KEY = "tv-ai:screener:v1";

export const MAX_SAVED_SCREENS = 50;

export const DEFAULT_SCREENER_STATE: ScreenerState = {
  version: 1,
  activeScreenId: null,
  query: { limit: 200 },
  columns: DEFAULT_SCREENER_COLUMNS,
  sort: null,
  savedScreens: [],
};

const ALLOWED_COLUMNS = new Set<ScreenerColumnId>(ALL_SCREENER_COLUMN_IDS);

export function normalizeSort(sort: unknown): PersistedScreenerSortSpec | null {
  if (!sort || typeof sort !== "object") return null;
  const raw = sort as Partial<ScreenerSortSpec>;
  if (typeof raw.column !== "string" || !isScreenerColumnId(raw.column)) return null;
  if (raw.direction !== "asc" && raw.direction !== "desc") return null;
  return { column: raw.column, direction: raw.direction };
}

export function normalizeColumns(columns: unknown): ScreenerColumnId[] {
  if (!Array.isArray(columns) || columns.length === 0) {
    return DEFAULT_SCREENER_COLUMNS;
  }
  const filtered = columns.filter(
    (column): column is ScreenerColumnId =>
      typeof column === "string" && ALLOWED_COLUMNS.has(column as ScreenerColumnId),
  );
  return filtered.length > 0 ? filtered : DEFAULT_SCREENER_COLUMNS;
}

function normalizeQuery(query: unknown): ScreenQuery {
  if (!query || typeof query !== "object") {
    return { limit: 200 };
  }
  const raw = query as Partial<ScreenQuery>;
  return {
    ...raw,
    limit:
      typeof raw.limit === "number" && raw.limit >= 1 && raw.limit <= 1000
        ? raw.limit
        : 200,
  };
}

const MOVER_KINDS = new Set<FmpMarketMoverKind>(["gainers", "losers", "actives"]);

function presetToSavedScreen(preset: ScreenerPreset, now = Date.now()): SavedScreen {
  const base = {
    id: preset.id,
    name: preset.label,
    columns: DEFAULT_SCREENER_COLUMNS,
    sort: null,
    createdAt: now,
    updatedAt: now,
    isStarter: true,
  };
  if (preset.kind === "movers") {
    return {
      ...base,
      kind: "movers",
      moverKind: preset.moverKind,
      limit: preset.limit ?? 50,
    };
  }
  return {
    ...base,
    kind: "screener",
    query: preset.query,
  };
}

/** Upsert missing starter screens by stable id without overwriting user edits. */
export function ensureStarterScreens(state: ScreenerState): ScreenerState {
  const existingIds = new Set(state.savedScreens.map((screen) => screen.id));
  const missing = SCREENER_PRESETS.filter((preset) => !existingIds.has(preset.id)).map((preset) =>
    presetToSavedScreen(preset),
  );
  if (missing.length === 0) return state;
  const savedScreens = [...missing, ...state.savedScreens].slice(0, MAX_SAVED_SCREENS);
  return { ...state, savedScreens };
}

function normalizeMoverKind(value: unknown): FmpMarketMoverKind | null {
  if (typeof value !== "string") return null;
  return MOVER_KINDS.has(value as FmpMarketMoverKind) ? (value as FmpMarketMoverKind) : null;
}

function normalizeSavedScreen(screen: Partial<SavedScreen>): SavedScreen | null {
  if (!screen.id || !screen.name) return null;
  const columns = normalizeColumns(screen.columns);
  const sort = normalizeSort(screen.sort);
  const createdAt = typeof screen.createdAt === "number" ? screen.createdAt : Date.now();
  const updatedAt = typeof screen.updatedAt === "number" ? screen.updatedAt : Date.now();
  const isStarter = screen.isStarter === true;
  const base = { id: screen.id, name: screen.name, columns, sort, createdAt, updatedAt, isStarter };

  const rawKind = (screen as { kind?: string }).kind;
  if (rawKind === "movers") {
    const moverKind = normalizeMoverKind((screen as { moverKind?: unknown }).moverKind);
    if (!moverKind) return null;
    const limitRaw = (screen as { limit?: unknown }).limit;
    const limit =
      typeof limitRaw === "number" && limitRaw >= 1 && limitRaw <= 1000 ? limitRaw : 50;
    return { ...base, kind: "movers", moverKind, limit };
  }

  // Default legacy screens without kind to screener query screens.
  return {
    ...base,
    kind: "screener",
    query: normalizeQuery((screen as { query?: unknown }).query),
  };
}

function activeScreenQuery(screen: SavedScreen): ScreenQuery {
  if (isSavedMoversScreen(screen)) {
    return { limit: screen.limit ?? 50 };
  }
  return screen.query;
}

export function loadScreenerState(): ScreenerState {
  if (typeof window === "undefined") return ensureStarterScreens(DEFAULT_SCREENER_STATE);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return ensureStarterScreens(DEFAULT_SCREENER_STATE);
    const parsed = JSON.parse(raw) as Partial<ScreenerState>;
    if (parsed.version !== 1) return ensureStarterScreens(DEFAULT_SCREENER_STATE);

    const savedScreens = Array.isArray(parsed.savedScreens)
      ? parsed.savedScreens
          .map((screen) => normalizeSavedScreen(screen as Partial<SavedScreen>))
          .filter((screen): screen is SavedScreen => screen != null)
          .slice(0, MAX_SAVED_SCREENS)
      : [];

    const activeScreenId =
      typeof parsed.activeScreenId === "string" &&
      savedScreens.some((screen) => screen.id === parsed.activeScreenId)
        ? parsed.activeScreenId
        : null;

    return ensureStarterScreens({
      version: 1,
      activeScreenId,
      query: normalizeQuery(parsed.query),
      columns: normalizeColumns(parsed.columns),
      sort: normalizeSort(parsed.sort),
      savedScreens,
    });
  } catch {
    return ensureStarterScreens(DEFAULT_SCREENER_STATE);
  }
}

export function saveScreenerState(state: ScreenerState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be full or disabled; ignore.
  }
}

export function clearScreenerStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function upsertSavedScreen(
  state: ScreenerState,
  screen: SavedScreen,
): ScreenerState {
  const without = state.savedScreens.filter((entry) => entry.id !== screen.id);
  const next = [screen, ...without].slice(0, MAX_SAVED_SCREENS);
  return {
    ...state,
    activeScreenId: screen.id,
    query: activeScreenQuery(screen),
    columns: screen.columns,
    sort: screen.sort ?? null,
    savedScreens: next,
  };
}

export function deleteSavedScreen(state: ScreenerState, screenId: string): ScreenerState {
  return {
    ...state,
    activeScreenId: state.activeScreenId === screenId ? null : state.activeScreenId,
    savedScreens: state.savedScreens.filter((screen) => screen.id !== screenId),
  };
}

export function loadSavedScreen(state: ScreenerState, screenId: string): ScreenerState {
  const screen = state.savedScreens.find((entry) => entry.id === screenId);
  if (!screen) return state;
  return {
    ...state,
    activeScreenId: screen.id,
    query: activeScreenQuery(screen),
    columns: screen.columns,
    sort: screen.sort ?? null,
  };
}

export function getSavedScreen(state: ScreenerState, screenId: string): SavedScreen | null {
  return state.savedScreens.find((entry) => entry.id === screenId) ?? null;
}

export function patchScreenerState(
  state: ScreenerState,
  patch: Partial<Pick<ScreenerState, "query" | "columns" | "sort" | "activeScreenId">>,
): ScreenerState {
  let nextSort = state.sort ?? null;
  if (patch.sort !== undefined) {
    if (patch.sort == null) {
      nextSort = null;
    } else if (isScreenerColumnId(patch.sort.column)) {
      nextSort = normalizeSort(patch.sort) ?? (patch.sort as PersistedScreenerSortSpec);
    } else {
      nextSort = state.sort ?? null;
    }
  }

  return {
    ...state,
    ...patch,
    query: patch.query ? normalizeQuery(patch.query) : state.query,
    columns: patch.columns ? normalizeColumns(patch.columns) : state.columns,
    sort: nextSort,
  };
}

export function ensureColumnVisible(
  columns: ScreenerColumnId[],
  column: ScreenerColumnId,
): ScreenerColumnId[] {
  if (columns.includes(column)) return columns;
  return [...columns, column];
}

export function applySortToActiveSavedScreen(
  state: ScreenerState,
  sort: ScreenerSortSpec | PersistedScreenerSortSpec | null,
): ScreenerState {
  if (!state.activeScreenId || !sort || !isScreenerColumnId(sort.column)) {
    return state;
  }
  const normalized = normalizeSort(sort);
  if (!normalized) return state;
  return {
    ...state,
    savedScreens: state.savedScreens.map((screen) =>
      screen.id === state.activeScreenId
        ? { ...screen, sort: normalized, updatedAt: Date.now() }
        : screen,
    ),
  };
}
