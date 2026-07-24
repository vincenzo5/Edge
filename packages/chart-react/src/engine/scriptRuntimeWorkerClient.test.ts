import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { makeSyntheticCandles, packCandlesToTransferBuffer, SCRIPT_FIXTURES } from '@edge/chart-core';
import { handleRuntimeWorkerMessage } from '@edge/indicator-runtime';
import * as chartCore from '@edge/chart-core';
import { runScriptPipeline, resetScriptRuntimeWorkerForTests } from './scriptRuntimeWorkerClient';

describe('scriptRuntimeWorkerClient transfer path', () => {
  beforeEach(() => {
    resetScriptRuntimeWorkerForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts packed candles with transferable buffer', async () => {
    const postMessage = vi.fn();
    const listeners = new Map<string, Set<(event: MessageEvent) => void>>();

    class MockWorker {
      postMessage = (message: unknown, transfer?: Transferable[]) => {
        postMessage(message, transfer);
        queueMicrotask(async () => {
          const response = await handleRuntimeWorkerMessage(message as never);
          for (const handler of listeners.get('message') ?? []) {
            handler({ data: response } as MessageEvent);
          }
        });
      };

      addEventListener = (event: string, handler: (event: MessageEvent) => void) => {
        const set = listeners.get(event) ?? new Set();
        set.add(handler);
        listeners.set(event, set);
      };

      removeEventListener = vi.fn();

      terminate = vi.fn();
    }

    vi.stubGlobal('Worker', MockWorker);

    const candles = makeSyntheticCandles(40);
    await runScriptPipeline({
      requestId: 'transfer-req-1',
      source: SCRIPT_FIXTURES['line-midpoint'].source,
      candles,
      inputs: { period: 20 },
      revision: 'rev-1',
      sessionKey: 'transfer-session-1',
    });

    expect(postMessage).toHaveBeenCalledTimes(1);
    const [message, transferList] = postMessage.mock.calls[0]!;
    expect(message).toMatchObject({
      type: 'compile-and-run',
      candlesEncoding: 'f64x6',
      candleCount: candles.length,
    });
    expect(message.candles).toBeUndefined();
    expect(transferList).toEqual([message.candlesBuffer]);
    expect(transferList?.[0]).toBeInstanceOf(ArrayBuffer);
  });

  it('falls back to structured-clone Candle[] when packing fails', async () => {
    vi.spyOn(chartCore, 'packCandlesToTransferBuffer').mockImplementation(() => {
      throw new Error('pack failed');
    });

    const postMessage = vi.fn();
    const listeners = new Map<string, Set<(event: MessageEvent) => void>>();

    class MockWorker {
      postMessage = (message: unknown, transfer?: Transferable[]) => {
        postMessage(message, transfer);
        queueMicrotask(async () => {
          const response = await handleRuntimeWorkerMessage(message as never);
          for (const handler of listeners.get('message') ?? []) {
            handler({ data: response } as MessageEvent);
          }
        });
      };

      addEventListener = (event: string, handler: (event: MessageEvent) => void) => {
        const set = listeners.get(event) ?? new Set();
        set.add(handler);
        listeners.set(event, set);
      };

      removeEventListener = vi.fn();

      terminate = vi.fn();
    }

    vi.stubGlobal('Worker', MockWorker);

    const candles = makeSyntheticCandles(12);
    await runScriptPipeline({
      requestId: 'fallback-req-1',
      source: SCRIPT_FIXTURES['line-midpoint'].source,
      candles,
      inputs: {},
      revision: 'rev-2',
      sessionKey: 'fallback-session-1',
    });

    expect(postMessage).toHaveBeenCalledTimes(1);
    const [message, transferList] = postMessage.mock.calls[0]!;
    expect(message.candles).toEqual(candles);
    expect(message.candlesEncoding).toBeUndefined();
    expect(transferList).toBeUndefined();
  });

  it('does not mutate source candles when transferring packed buffer', async () => {
    const postMessage = vi.fn();
    const listeners = new Map<string, Set<(event: MessageEvent) => void>>();

    class MockWorker {
      postMessage = (message: unknown, transfer?: Transferable[]) => {
        postMessage(message, transfer);
        queueMicrotask(async () => {
          const response = await handleRuntimeWorkerMessage(message as never);
          for (const handler of listeners.get('message') ?? []) {
            handler({ data: response } as MessageEvent);
          }
        });
      };

      addEventListener = (event: string, handler: (event: MessageEvent) => void) => {
        const set = listeners.get(event) ?? new Set();
        set.add(handler);
        listeners.set(event, set);
      };

      removeEventListener = vi.fn();

      terminate = vi.fn();
    }

    vi.stubGlobal('Worker', MockWorker);

    const candles = makeSyntheticCandles(5);
    const originalTip = candles.at(-1)!.c;

    await runScriptPipeline({
      requestId: 'transfer-immutable-1',
      source: SCRIPT_FIXTURES['line-midpoint'].source,
      candles,
      inputs: { period: 2 },
      revision: 'rev-3',
      sessionKey: 'transfer-session-2',
    });

    const [message] = postMessage.mock.calls[0]!;
    const packed = packCandlesToTransferBuffer(candles);
    expect(message.candlesBuffer).not.toBe(packed.buffer);
    expect(candles.at(-1)!.c).toBe(originalTip);
  });
});
