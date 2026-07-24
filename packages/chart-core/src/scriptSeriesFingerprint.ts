import type { NormalizedScriptCandle } from './scriptContracts';
import { candleValueFingerprint } from './indicatorCompute';

export function buildSecondarySeriesFingerprint(
  alignedByKey: Record<string, NormalizedScriptCandle[]>,
): string {
  const keys = Object.keys(alignedByKey).sort();
  if (keys.length === 0) return '';
  const parts = keys.map((key) => {
    const aligned = alignedByKey[key] ?? [];
    const asCandles = aligned.map((c) => ({
      t: c.t,
      o: c.o,
      h: c.h,
      l: c.l,
      c: c.c,
      v: c.v,
    }));
    return `${key}:${candleValueFingerprint(asCandles)}`;
  });
  return parts.join(';');
}
