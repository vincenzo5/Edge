import type { Candle } from './contracts';

function updateHash(hash: number, value: number | undefined): number {
  const part = `${value ?? ''};`;
  let next = hash;
  for (let i = 0; i < part.length; i += 1) {
    next ^= part.charCodeAt(i);
    next = Math.imul(next, 16777619);
  }
  return next;
}

function hashCandleFields(hash: number, candle: Candle): number {
  let next = updateHash(hash, candle.t);
  next = updateHash(next, candle.o);
  next = updateHash(next, candle.h);
  next = updateHash(next, candle.l);
  next = updateHash(next, candle.c);
  next = updateHash(next, candle.v);
  return next;
}

export function candleTipRevision(candle: Candle): string {
  let hash = 2166136261;
  hash = hashCandleFields(hash, candle);
  return (hash >>> 0).toString(36);
}

export function candleTipRevisionFromSeries(candles: Candle[]): string {
  const last = candles.at(-1);
  if (!last) return '0';
  return candleTipRevision(last);
}

export type CandleSeriesAdvanceKind =
  | 'snapshot'
  | 'append'
  | 'replace-latest'
  | 'trim'
  | 'prepend'
  | 'merge';

export type CandleSeriesIdentity = {
  bodyRevision: number;
  tipRevision: string;
  length: number;
  firstT: number;
  lastT: number;
  lastAdvanceKind?: CandleSeriesAdvanceKind;
};

let globalBodyRevisionSeq = 1;

/** Test helper — reset monotonic body revision counter. */
export function resetCandleSeriesIdentitySeqForTests(): void {
  globalBodyRevisionSeq = 1;
}

export function boundsFromCandles(
  candles: Candle[],
): Pick<CandleSeriesIdentity, 'length' | 'firstT' | 'lastT' | 'tipRevision'> {
  const length = candles.length;
  const firstT = candles[0]?.t ?? 0;
  const lastT = candles.at(-1)?.t ?? 0;
  const last = candles.at(-1);
  const tipRevision = last ? candleTipRevision(last) : '0';
  return { length, firstT, lastT, tipRevision };
}

export function createCandleSeriesIdentity(candles: Candle[]): CandleSeriesIdentity {
  return {
    bodyRevision: globalBodyRevisionSeq++,
    ...boundsFromCandles(candles),
    lastAdvanceKind: 'snapshot',
  };
}

function shouldBumpBodyRevision(
  kind: CandleSeriesAdvanceKind,
  prev: CandleSeriesIdentity | undefined,
  nextLength: number,
): boolean {
  if (!prev) return true;
  if (kind === 'replace-latest') {
    return nextLength !== prev.length;
  }
  return true;
}

export function advanceCandleSeriesIdentity(
  prev: CandleSeriesIdentity | undefined,
  nextCandles: Candle[],
  kind: CandleSeriesAdvanceKind,
): CandleSeriesIdentity {
  const bounds = boundsFromCandles(nextCandles);
  if (!prev) {
    return {
      bodyRevision: globalBodyRevisionSeq++,
      ...bounds,
      lastAdvanceKind: kind,
    };
  }

  const bodyRevision = shouldBumpBodyRevision(kind, prev, bounds.length)
    ? globalBodyRevisionSeq++
    : prev.bodyRevision;

  return {
    bodyRevision,
    ...bounds,
    lastAdvanceKind: kind,
  };
}

/** Classify append stream semantics for identity advancement. */
export function classifyAppendAdvanceKind(existing: Candle[], candle: Candle): CandleSeriesAdvanceKind {
  if (existing.length === 0) return 'append';
  const last = existing[existing.length - 1]!;
  if (candle.t > last.t) return 'append';
  if (candle.t === last.t) return 'replace-latest';
  return 'merge';
}
