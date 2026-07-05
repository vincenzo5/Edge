import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createHistoryPrefetchController } from './historyPrefetchController';

describe('createHistoryPrefetchController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs background prefetch once per session', async () => {
    const onFetch = vi.fn().mockResolvedValue({ addedBars: 100, hasMore: true });
    const getSnapshot = vi.fn(() => ({
      startIndex: 100,
      endIndex: 250,
      loadedBars: 250,
      hasMore: true,
      userHasPanned: false,
    }));

    const controller = createHistoryPrefetchController({ onFetch, getSnapshot });
    controller.prefetchBackground();
    controller.prefetchBackground();
    await Promise.resolve();

    expect(onFetch).toHaveBeenCalledTimes(1);
    expect(onFetch).toHaveBeenCalledWith({ background: true, queued: false });
  });

  it('skips debounce for urgent viewport checks', async () => {
    const onFetch = vi.fn().mockResolvedValue({ addedBars: 50, hasMore: true });
    const getSnapshot = vi.fn(() => ({
      startIndex: 5,
      endIndex: 105,
      loadedBars: 250,
      hasMore: true,
      userHasPanned: true,
    }));

    const controller = createHistoryPrefetchController({ onFetch, getSnapshot });
    controller.scheduleViewportCheck();
    await Promise.resolve();

    expect(onFetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('debounces non-urgent viewport checks', async () => {
    const onFetch = vi.fn().mockResolvedValue({ addedBars: 50, hasMore: true });
    const getSnapshot = vi.fn(() => ({
      startIndex: 30,
      endIndex: 130,
      loadedBars: 250,
      hasMore: true,
      userHasPanned: true,
    }));

    const controller = createHistoryPrefetchController({ onFetch, getSnapshot, debounceMs: 100 });
    controller.scheduleViewportCheck();
    expect(onFetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);
    expect(onFetch).toHaveBeenCalledTimes(1);
  });

  it('queues a follow-up fetch when another request arrives during in-flight work', async () => {
    let resolveFirst: (value: { addedBars: number; hasMore: boolean }) => void = () => {};
    const first = new Promise<{ addedBars: number; hasMore: boolean }>((resolve) => {
      resolveFirst = resolve;
    });

    const onFetch = vi
      .fn()
      .mockImplementationOnce(() => first)
      .mockResolvedValueOnce({ addedBars: 50, hasMore: true });

    const getSnapshot = vi.fn(() => ({
      startIndex: 5,
      endIndex: 105,
      loadedBars: 250,
      hasMore: true,
      userHasPanned: true,
    }));

    const controller = createHistoryPrefetchController({ onFetch, getSnapshot });
    controller.scheduleViewportCheck();
    controller.scheduleViewportCheck();
    await Promise.resolve();

    expect(onFetch).toHaveBeenCalledTimes(1);

    resolveFirst({ addedBars: 100, hasMore: true });
    await Promise.resolve();
    await Promise.resolve();

    expect(onFetch).toHaveBeenCalledTimes(2);
  });

  it('reset cancels pending debounce and allows background prefetch again', async () => {
    const onFetch = vi.fn().mockResolvedValue({ addedBars: 0, hasMore: false });
    const getSnapshot = vi.fn(() => ({
      startIndex: 30,
      endIndex: 130,
      loadedBars: 250,
      hasMore: true,
      userHasPanned: true,
    }));

    const controller = createHistoryPrefetchController({ onFetch, getSnapshot, debounceMs: 100 });
    controller.scheduleViewportCheck();
    controller.reset();
    controller.prefetchBackground();
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(100);
    expect(onFetch).toHaveBeenCalledTimes(1);
    expect(onFetch).toHaveBeenCalledWith({ background: true, queued: false });
  });

  it('does not fetch when loader snapshot is missing history', async () => {
    const onFetch = vi.fn().mockResolvedValue({ addedBars: 50, hasMore: true });
    const getSnapshot = vi.fn(() => ({
      startIndex: 5,
      endIndex: 105,
      loadedBars: 250,
      hasMore: false,
      userHasPanned: true,
    }));

    const controller = createHistoryPrefetchController({ onFetch, getSnapshot });
    controller.scheduleViewportCheck();
    await Promise.resolve();

    expect(onFetch).not.toHaveBeenCalled();
  });
});
