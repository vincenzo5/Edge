/** Reasons a chart pane may need redraw. Used to skip expensive work on cheap interactions. */
export type DrawInvalidationReason =
  | 'data'
  | 'viewport'
  | 'size'
  | 'theme'
  | 'settings'
  | 'drawings'
  | 'selection'
  | 'crosshair';

export type DrawPhaseTimings = {
  backgroundMs: number;
  gridMs: number;
  candlesMs: number;
  indicatorsMs: number;
  drawingsMs: number;
  axesMs: number;
  totalMs: number;
};

const EMPTY_PHASES: DrawPhaseTimings = {
  backgroundMs: 0,
  gridMs: 0,
  candlesMs: 0,
  indicatorsMs: 0,
  drawingsMs: 0,
  axesMs: 0,
  totalMs: 0,
};

/** Invalidation reasons for the background layer — keep in sync with layers.ts. */
export const BACKGROUND_INVALIDATING: ReadonlySet<DrawInvalidationReason> = new Set([
  'data',
  'size',
  'theme',
  'settings',
  'viewport',
]);

/** Invalidation reasons for series/indicator layers — keep in sync with layers.ts. */
export const SERIES_INVALIDATING: ReadonlySet<DrawInvalidationReason> = new Set([
  'data',
  'size',
  'theme',
  'settings',
  'drawings',
  'selection',
]);

/** Coalesce draw requests and track invalidation reasons for layered rendering. */
export class RenderScheduler {
  private pendingReasons = new Set<DrawInvalidationReason>();
  private rafId: number | null = null;
  private lastPhases: DrawPhaseTimings = { ...EMPTY_PHASES };

  constructor(private readonly onDraw: (reasons: ReadonlySet<DrawInvalidationReason>) => void) {}

  request(reason: DrawInvalidationReason): void {
    this.pendingReasons.add(reason);
    if (this.rafId != null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const reasons = new Set(this.pendingReasons);
      this.pendingReasons.clear();
      this.onDraw(reasons);
    });
  }

  /** Immediate draw bypassing RAF coalescing (e.g. initial mount). */
  drawNow(reason: DrawInvalidationReason): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingReasons.clear();
    this.onDraw(new Set([reason]));
  }

  recordPhases(phases: DrawPhaseTimings): void {
    this.lastPhases = phases;
  }

  getLastPhases(): DrawPhaseTimings {
    return this.lastPhases;
  }

  dispose(): void {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingReasons.clear();
  }
}

/** True when only viewport/crosshair changed — skip indicator recompute and full data redraw. */
export function isCheapInteraction(reasons: ReadonlySet<DrawInvalidationReason>): boolean {
  if (reasons.size === 0) return false;
  for (const reason of reasons) {
    if (
      reason !== 'viewport' &&
      reason !== 'crosshair' &&
      reason !== 'selection'
    ) {
      return false;
    }
  }
  return true;
}

/** True when a layer's cached bitmap can be reused for the given invalidation reasons. */
export function canReuseLayerCache(
  invalidatingReasons: ReadonlySet<DrawInvalidationReason>,
  reasons: ReadonlySet<DrawInvalidationReason>,
): boolean {
  if (reasons.size === 0) return true;
  for (const reason of reasons) {
    if (invalidatingReasons.has(reason)) return false;
  }
  return true;
}

/** True when static background/grid can be reused from cache. */
export function canReuseBackgroundCache(reasons: ReadonlySet<DrawInvalidationReason>): boolean {
  return canReuseLayerCache(BACKGROUND_INVALIDATING, reasons);
}

/** True when series + indicator layers can be reused (viewport-only pan). */
export function canReuseSeriesCache(reasons: ReadonlySet<DrawInvalidationReason>): boolean {
  if (reasons.size === 0) return true;
  for (const reason of reasons) {
    if (SERIES_INVALIDATING.has(reason)) return false;
  }
  return reasons.has('viewport') || reasons.has('crosshair');
}

export function measurePhase<T>(run: () => T): { result: T; durationMs: number } {
  const start = performance.now();
  const result = run();
  return { result, durationMs: performance.now() - start };
}
