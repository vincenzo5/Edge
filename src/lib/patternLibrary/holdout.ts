import type { PatternRecord } from "./types";

export type HoldoutSplit = {
  train: PatternRecord[];
  holdout: PatternRecord[];
  holdoutFraction: number;
  cutoffAsOf: string | null;
};

export function splitByTimeHoldout(
  records: PatternRecord[],
  holdoutFraction = 0.2,
): HoldoutSplit {
  if (records.length === 0) {
    return { train: [], holdout: [], holdoutFraction, cutoffAsOf: null };
  }

  const sorted = [...records].sort(
    (a, b) => new Date(a.asOf).getTime() - new Date(b.asOf).getTime(),
  );
  const holdoutCount = Math.max(1, Math.floor(sorted.length * holdoutFraction));
  const trainCount = sorted.length - holdoutCount;
  const train = sorted.slice(0, trainCount);
  const holdout = sorted.slice(trainCount);
  const cutoffAsOf = holdout[0]?.asOf ?? null;

  return { train, holdout, holdoutFraction, cutoffAsOf };
}

export function assertNoLookAhead(record: PatternRecord): boolean {
  const asOfMs = new Date(record.asOf).getTime();
  return record.ohlcv.every((bar) => bar.timestamp <= asOfMs);
}
