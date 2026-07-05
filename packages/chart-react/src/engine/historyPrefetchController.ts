import {
  HISTORY_PREFETCH_DEBOUNCE_MS,
  isUrgentPrefetch,
  shouldBackgroundPrefetch,
  shouldPrefetchHistory,
  type HistoryPrefetchInput,
} from '@edge/chart-core';

export type HistoryPrefetchSnapshot = {
  startIndex: number;
  endIndex: number;
  loadedBars: number;
  hasMore: boolean;
  userHasPanned: boolean;
};

export type HistoryPrefetchFetchResult = {
  addedBars: number;
  hasMore: boolean;
};

export type HistoryPrefetchControllerOptions = {
  debounceMs?: number;
  onFetch: (context: { background: boolean; queued: boolean }) => Promise<HistoryPrefetchFetchResult>;
  getSnapshot: () => HistoryPrefetchSnapshot | null;
};

export type HistoryPrefetchController = {
  reset: () => void;
  scheduleViewportCheck: () => void;
  maybePrefetch: () => void;
  prefetchBackground: () => void;
  dispose: () => void;
};

function toPrefetchInput(snapshot: HistoryPrefetchSnapshot): HistoryPrefetchInput {
  return {
    startIndex: snapshot.startIndex,
    visibleBars: Math.max(1, snapshot.endIndex - snapshot.startIndex),
    loadedBars: snapshot.loadedBars,
    hasMore: snapshot.hasMore,
    userHasPanned: snapshot.userHasPanned,
  };
}

export function createHistoryPrefetchController(
  options: HistoryPrefetchControllerOptions,
): HistoryPrefetchController {
  let inFlight = false;
  let queued = false;
  let backgroundDone = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const clearDebounce = () => {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  const canFetch = (snapshot: HistoryPrefetchSnapshot | null, background: boolean): boolean => {
    if (!snapshot || snapshot.loadedBars <= 0 || !snapshot.hasMore) return false;
    if (background) {
      return shouldBackgroundPrefetch(snapshot.hasMore, snapshot.loadedBars);
    }
    return shouldPrefetchHistory(toPrefetchInput(snapshot));
  };

  const runFetch = async (context: { background: boolean; queued: boolean }) => {
    if (inFlight) {
      queued = true;
      return;
    }

    const snapshot = options.getSnapshot();
    if (!canFetch(snapshot, context.background)) return;

    inFlight = true;
    let followUpQueued = false;
    try {
      await options.onFetch(context);
    } finally {
      inFlight = false;
      followUpQueued = queued;
      queued = false;
      if (followUpQueued) {
        void runFetch({ background: false, queued: true });
      }
    }
  };

  const scheduleViewportCheck = () => {
    const snapshot = options.getSnapshot();
    if (!snapshot) return;
    const input = toPrefetchInput(snapshot);
    if (!shouldPrefetchHistory(input)) return;

    if (isUrgentPrefetch(input)) {
      clearDebounce();
      void runFetch({ background: false, queued: false });
      return;
    }

    clearDebounce();
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void runFetch({ background: false, queued: false });
    }, options.debounceMs ?? HISTORY_PREFETCH_DEBOUNCE_MS);
  };

  return {
    reset() {
      clearDebounce();
      inFlight = false;
      queued = false;
      backgroundDone = false;
    },
    scheduleViewportCheck,
    maybePrefetch() {
      const snapshot = options.getSnapshot();
      if (!snapshot) return;
      const input = toPrefetchInput(snapshot);
      if (!shouldPrefetchHistory(input)) return;
      if (isUrgentPrefetch(input)) {
        clearDebounce();
        void runFetch({ background: false, queued: false });
        return;
      }
      scheduleViewportCheck();
    },
    prefetchBackground() {
      if (backgroundDone) return;
      backgroundDone = true;
      void runFetch({ background: true, queued: false });
    },
    dispose() {
      clearDebounce();
    },
  };
}
