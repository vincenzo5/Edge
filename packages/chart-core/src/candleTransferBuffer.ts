import type { Candle } from './contracts';

/** Float64 layout: [t, o, h, l, c, v] per bar. */
export const CANDLE_TRANSFER_F64_STRIDE = 6;

export const CANDLE_TRANSFER_ENCODING = 'f64x6' as const;

export type CandleTransferEncoding = typeof CANDLE_TRANSFER_ENCODING;

export type PackedCandleTransferBuffer = {
  encoding: CandleTransferEncoding;
  buffer: ArrayBuffer;
  candleCount: number;
};

/**
 * Pack candles into a fresh ArrayBuffer suitable for worker postMessage transfer.
 * Always allocates a new buffer so the main-thread Candle[] is never detached.
 */
export function packCandlesToTransferBuffer(candles: Candle[]): PackedCandleTransferBuffer {
  const candleCount = candles.length;
  const buffer = new ArrayBuffer(candleCount * CANDLE_TRANSFER_F64_STRIDE * Float64Array.BYTES_PER_ELEMENT);
  const view = new Float64Array(buffer);

  for (let i = 0; i < candleCount; i += 1) {
    const candle = candles[i]!;
    const offset = i * CANDLE_TRANSFER_F64_STRIDE;
    view[offset] = candle.t;
    view[offset + 1] = candle.o;
    view[offset + 2] = candle.h;
    view[offset + 3] = candle.l;
    view[offset + 4] = candle.c;
    view[offset + 5] = candle.v ?? 0;
  }

  return {
    encoding: CANDLE_TRANSFER_ENCODING,
    buffer,
    candleCount,
  };
}

/** Decode a packed worker candle buffer back into Candle[]. */
export function unpackCandlesFromTransferBuffer(
  buffer: ArrayBuffer,
  candleCount: number,
  encoding: CandleTransferEncoding = CANDLE_TRANSFER_ENCODING,
): Candle[] {
  if (encoding !== CANDLE_TRANSFER_ENCODING) {
    throw new Error(`Unsupported candle transfer encoding: ${encoding}`);
  }

  const expectedBytes = candleCount * CANDLE_TRANSFER_F64_STRIDE * Float64Array.BYTES_PER_ELEMENT;
  if (buffer.byteLength < expectedBytes) {
    throw new Error('Candle transfer buffer is shorter than expected');
  }

  const view = new Float64Array(buffer, 0, candleCount * CANDLE_TRANSFER_F64_STRIDE);
  const candles: Candle[] = new Array(candleCount);

  for (let i = 0; i < candleCount; i += 1) {
    const offset = i * CANDLE_TRANSFER_F64_STRIDE;
    const volume = view[offset + 5]!;
    candles[i] = {
      t: view[offset]!,
      o: view[offset + 1]!,
      h: view[offset + 2]!,
      l: view[offset + 3]!,
      c: view[offset + 4]!,
      ...(volume !== 0 ? { v: volume } : {}),
    };
  }

  return candles;
}
