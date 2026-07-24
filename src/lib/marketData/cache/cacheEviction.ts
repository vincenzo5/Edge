type BudgetTrackedEntry = {
  touchedAt: number;
  approxBytes: number;
};

export type EvictMapBudgetOptions<K> = {
  maxEntries: number;
  softBytes: number;
  /** Higher score = evict sooner when touchedAt ties (e.g. high-cardinality IBKR keys). */
  evictionScore?: (key: K) => number;
};

function totalBytes<V extends BudgetTrackedEntry>(map: Map<unknown, V>): number {
  let sum = 0;
  for (const entry of map.values()) {
    sum += entry.approxBytes;
  }
  return sum;
}

/** Evict least-recently-touched entries until within entry and soft byte budgets. */
export function evictMapUntilWithinBudget<K, V extends BudgetTrackedEntry>(
  map: Map<K, V>,
  options: EvictMapBudgetOptions<K>,
): void {
  const score = options.evictionScore ?? (() => 0);

  while (map.size > options.maxEntries || totalBytes(map) > options.softBytes) {
    let victimKey: K | null = null;
    let victimTouch = Infinity;
    let victimScore = -Infinity;

    for (const [key, entry] of map) {
      const entryScore = score(key);
      const shouldEvict =
        victimKey == null ||
        entry.touchedAt < victimTouch ||
        (entry.touchedAt === victimTouch && entryScore > victimScore);
      if (shouldEvict) {
        victimKey = key;
        victimTouch = entry.touchedAt;
        victimScore = entryScore;
      }
    }

    if (victimKey == null) break;
    map.delete(victimKey);
  }
}
