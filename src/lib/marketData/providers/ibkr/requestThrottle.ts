/** IBKR Client Portal global limit is ~10 req/s; stay under to avoid 429 penalty box. */
export const IBKR_MAX_REQUESTS_PER_SECOND = 8;

export type ThrottledRequestFn = <T>(
  fn: () => Promise<T>,
) => Promise<T>;

/**
 * Queued scheduler capped at maxPerSecond requests per rolling 1s window.
 */
export function createRequestThrottle(maxPerSecond = IBKR_MAX_REQUESTS_PER_SECOND): {
  schedule: ThrottledRequestFn;
  pendingCount(): number;
} {
  const queue: Array<{
    run: () => void;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = [];
  const timestamps: number[] = [];
  let draining = false;

  function prune(now: number): void {
    while (timestamps.length > 0 && now - timestamps[0]! >= 1000) {
      timestamps.shift();
    }
  }

  async function drain(): Promise<void> {
    if (draining) return;
    draining = true;
    try {
      while (queue.length > 0) {
        const now = Date.now();
        prune(now);
        if (timestamps.length >= maxPerSecond) {
          const waitMs = 1000 - (now - timestamps[0]!) + 5;
          await new Promise((r) => setTimeout(r, Math.max(waitMs, 1)));
          continue;
        }
        const item = queue.shift();
        if (!item) break;
        timestamps.push(Date.now());
        try {
          const result = await item.run();
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }
      }
    } finally {
      draining = false;
      if (queue.length > 0) {
        void drain();
      }
    }
  }

  function schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push({
        run: fn,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      void drain();
    });
  }

  return {
    schedule,
    pendingCount: () => queue.length,
  };
}
