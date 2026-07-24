import { describe, expect, it } from 'vitest';
import { handleRuntimeWorkerMessage, markRuntimeRequestCancelled, resolveWorkerCandles } from './runtimeWorker.js';
import {
  SCRIPT_FIXTURES,
  applyCandleReplaceLatest,
  makeSyntheticCandles,
  packCandlesToTransferBuffer,
} from '@edge/chart-core';
import { DEFAULT_SCRIPT_RUNTIME_BUDGETS } from '@edge/chart-core';

describe('runtimeWorker protocol', () => {
  it('runs compile-and-execute pipeline with requestId', async () => {
    const response = await handleRuntimeWorkerMessage({
      type: 'compile-and-run',
      requestId: 'req-1',
      source: SCRIPT_FIXTURES['line-midpoint'].source,
      candles: makeSyntheticCandles(30),
      inputs: { period: 20 },
      revision: 'ignored',
      sessionKey: 'worker-session-1',
      budgets: DEFAULT_SCRIPT_RUNTIME_BUDGETS,
    });
    if (response.type === 'stale-rejected') {
      throw new Error('unexpected stale rejection');
    }
    expect(response.requestId).toBe('req-1');
    expect(response.compile.ok).toBe(true);
    expect(response.execution?.status).toBe('ready');
  });

  it('accepts packed f64x6 candle payload', async () => {
    const candles = makeSyntheticCandles(30);
    const packed = packCandlesToTransferBuffer(candles);
    const response = await handleRuntimeWorkerMessage({
      type: 'compile-and-run',
      requestId: 'req-packed',
      source: SCRIPT_FIXTURES['line-midpoint'].source,
      candlesEncoding: packed.encoding,
      candlesBuffer: packed.buffer,
      candleCount: packed.candleCount,
      inputs: { period: 20 },
      revision: 'ignored',
      sessionKey: 'worker-session-packed',
      budgets: DEFAULT_SCRIPT_RUNTIME_BUDGETS,
    });
    if (response.type === 'stale-rejected') {
      throw new Error('unexpected stale rejection');
    }
    expect(response.compile.ok).toBe(true);
    expect(response.execution?.status).toBe('ready');
  });

  it('packed live tip replace-latest does not require Candle[] on the wire', async () => {
    let candles = makeSyntheticCandles(40);
    candles = applyCandleReplaceLatest(candles, {
      t: candles.at(-1)!.t,
      o: 1,
      h: 2,
      l: 0.5,
      c: 1.5,
      v: 999,
    });
    const packed = packCandlesToTransferBuffer(candles);
    const request = {
      type: 'compile-and-run' as const,
      requestId: 'req-tip-packed',
      source: SCRIPT_FIXTURES['line-midpoint'].source,
      candlesEncoding: packed.encoding,
      candlesBuffer: packed.buffer,
      candleCount: packed.candleCount,
      inputs: { period: 20 },
      revision: 'ignored',
      sessionKey: 'worker-session-tip',
      budgets: DEFAULT_SCRIPT_RUNTIME_BUDGETS,
    };

    expect(request.candles).toBeUndefined();
    expect(resolveWorkerCandles(request)).toEqual(candles);

    const response = await handleRuntimeWorkerMessage(request);
    if (response.type === 'stale-rejected') {
      throw new Error('unexpected stale rejection');
    }
    expect(response.execution?.status).toBe('ready');
  });

  it('honours cancel before pipeline starts', async () => {
    markRuntimeRequestCancelled('req-cancel');
    const response = await handleRuntimeWorkerMessage({
      type: 'compile-and-run',
      requestId: 'req-cancel',
      source: SCRIPT_FIXTURES['line-midpoint'].source,
      candles: makeSyntheticCandles(10),
      inputs: {},
      revision: 'rev',
      sessionKey: 'worker-session-2',
    });
    if (response.type === 'stale-rejected') {
      throw new Error('unexpected stale rejection');
    }
    expect(response.execution?.errorCode).toBe('cancelled');
  });
});
