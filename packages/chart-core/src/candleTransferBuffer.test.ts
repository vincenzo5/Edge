import { describe, expect, it } from 'vitest';
import type { Candle } from './contracts';
import {
  CANDLE_TRANSFER_F64_STRIDE,
  packCandlesToTransferBuffer,
  unpackCandlesFromTransferBuffer,
} from './candleTransferBuffer';
import { makeSyntheticCandles } from './scriptFixtures';

describe('candleTransferBuffer', () => {
  it('round-trips synthetic candles through f64x6 layout', () => {
    const candles = makeSyntheticCandles(120);
    const packed = packCandlesToTransferBuffer(candles);
    const restored = unpackCandlesFromTransferBuffer(packed.buffer, packed.candleCount, packed.encoding);

    expect(restored).toEqual(candles);
    expect(packed.buffer.byteLength).toBe(
      candles.length * CANDLE_TRANSFER_F64_STRIDE * Float64Array.BYTES_PER_ELEMENT,
    );
  });

  it('preserves OHLCV when volume is omitted on input', () => {
    const candles: Candle[] = [
      { t: 1, o: 2, h: 3, l: 1.5, c: 2.5 },
      { t: 2, o: 3, h: 4, l: 2.5, c: 3.5, v: 100 },
    ];
    const packed = packCandlesToTransferBuffer(candles);
    const restored = unpackCandlesFromTransferBuffer(packed.buffer, packed.candleCount, packed.encoding);

    expect(restored[0]).toEqual({ t: 1, o: 2, h: 3, l: 1.5, c: 2.5 });
    expect(restored[1]).toEqual({ t: 2, o: 3, h: 4, l: 2.5, c: 3.5, v: 100 });
  });

  it('allocates a fresh buffer that does not alias caller memory', () => {
    const candles = makeSyntheticCandles(3);
    const packed = packCandlesToTransferBuffer(candles);
    const view = new Float64Array(packed.buffer);
    view[0] = -1;

    expect(candles[0]!.t).not.toBe(-1);
  });
});
