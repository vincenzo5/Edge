import type { Candle } from './contracts';
import type { NormalizedScriptCandle } from './scriptContracts';
import { normalizeScriptCandles } from './scriptContracts';

const MISSING_CANDLE_FIELDS = {
  o: Number.NaN,
  h: Number.NaN,
  l: Number.NaN,
  c: Number.NaN,
  v: 0,
} as const;

function toNormalized(candles: Candle[]): NormalizedScriptCandle[] {
  return normalizeScriptCandles(candles);
}

/**
 * Align secondary candles to primary bar indices using close-of-bar mapping:
 * for each primary timestamp, use the last secondary bar with secondary.t <= primary.t.
 * No lookahead — future secondary bars never affect earlier primary indices.
 */
export function alignSeriesToPrimary(
  primary: Candle[],
  secondary: Candle[],
): NormalizedScriptCandle[] {
  if (primary.length === 0) return [];
  const normalizedSecondary = toNormalized(secondary);
  if (normalizedSecondary.length === 0) {
    return primary.map((bar) => ({
      t: bar.t,
      ...MISSING_CANDLE_FIELDS,
    }));
  }

  const aligned: NormalizedScriptCandle[] = [];
  let secondaryIndex = 0;
  let lastKnown: NormalizedScriptCandle | null = null;

  for (const bar of primary) {
    while (
      secondaryIndex < normalizedSecondary.length &&
      normalizedSecondary[secondaryIndex]!.t <= bar.t
    ) {
      lastKnown = normalizedSecondary[secondaryIndex]!;
      secondaryIndex += 1;
    }

    if (lastKnown != null && lastKnown.t <= bar.t) {
      aligned.push({
        t: bar.t,
        o: lastKnown.o,
        h: lastKnown.h,
        l: lastKnown.l,
        c: lastKnown.c,
        v: lastKnown.v,
      });
    } else {
      aligned.push({
        t: bar.t,
        ...MISSING_CANDLE_FIELDS,
      });
    }
  }

  return aligned;
}
