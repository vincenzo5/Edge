/** Default bar count for history pagination requests. */
export const HISTORY_FETCH_BAR_COUNT = 500;

/** @deprecated Use HISTORY_FETCH_BAR_COUNT */
export const EDGE_FETCH_BAR_COUNT = HISTORY_FETCH_BAR_COUNT;

export const HISTORY_PREFETCH_LOOKAHEAD_RATIO = 0.5;
export const HISTORY_PREFETCH_MIN_THRESHOLD = 50;
export const HISTORY_URGENT_LOOKAHEAD_RATIO = 0.1;
export const HISTORY_URGENT_MIN_THRESHOLD = 10;
export const HISTORY_PREFETCH_DEBOUNCE_MS = 100;
export const HISTORY_BACKGROUND_PREFETCH_PAGES = 1;

/** @deprecated Fixed threshold kept for legacy callers */
export const PREFETCH_START_INDEX_THRESHOLD = 30;

export type HistoryPrefetchInput = {
  startIndex: number;
  visibleBars: number;
  loadedBars: number;
  hasMore: boolean;
  userHasPanned: boolean;
};

/** Start prefetch when the left edge is within this many bars of index 0. */
export function computePrefetchThreshold(visibleBars: number): number {
  const visible = Math.max(1, visibleBars);
  return Math.max(
    HISTORY_PREFETCH_MIN_THRESHOLD,
    Math.floor(visible * HISTORY_PREFETCH_LOOKAHEAD_RATIO),
  );
}

/** Bypass debounce when the left edge is within this many bars of index 0. */
export function computeUrgentThreshold(visibleBars: number): number {
  const visible = Math.max(1, visibleBars);
  return Math.max(
    HISTORY_URGENT_MIN_THRESHOLD,
    Math.floor(visible * HISTORY_URGENT_LOOKAHEAD_RATIO),
  );
}

export function shouldPrefetchHistory(input: HistoryPrefetchInput): boolean {
  if (!input.hasMore || input.loadedBars <= 0) return false;
  if (!input.userHasPanned) return false;
  return input.startIndex < computePrefetchThreshold(input.visibleBars);
}

export function isUrgentPrefetch(input: HistoryPrefetchInput): boolean {
  if (!shouldPrefetchHistory(input)) return false;
  return input.startIndex < computeUrgentThreshold(input.visibleBars);
}

export function shouldBackgroundPrefetch(hasMore: boolean, loadedBars: number): boolean {
  return hasMore && loadedBars > 0;
}

/** @deprecated Use shouldPrefetchHistory with visible bar count */
export function shouldPrefetchEdge(
  startIndex: number,
  threshold = PREFETCH_START_INDEX_THRESHOLD,
): boolean {
  return startIndex < threshold;
}
