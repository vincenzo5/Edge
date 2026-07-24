/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { clearRecentSymbols, recordRecentSymbol } from "@/lib/app/recentSymbols";
import { useSymbolSearch } from "./useSymbolSearch";

const results = [{ symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" }];
const recents = [{ symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ" }];

describe("useSymbolSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearRecentSymbols();
    recordRecentSymbol(recents[0]!);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    clearRecentSymbols();
  });

  it("debounces search requests", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ results }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = renderHook(
      ({ query, enabled }) => useSymbolSearch({ query, enabled }),
      { initialProps: { query: "AA", enabled: true } },
    );

    rerender({ query: "AAPL", enabled: true });
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/search",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query: "AAPL" }),
      }),
    );
  });

  it("returns recent symbols for empty query", () => {
    const { result } = renderHook(() => useSymbolSearch({ query: "", enabled: true }));

    expect(result.current.results).toEqual(recents);
    expect(result.current.loading).toBe(false);
    expect(result.current.showingRecents).toBe(true);
  });

  it("clears to recents when query is cleared", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ results }),
      })),
    );

    const { result, rerender } = renderHook(
      ({ query, enabled }) => useSymbolSearch({ query, enabled }),
      { initialProps: { query: "AAPL", enabled: true } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.results).toEqual(results);

    rerender({ query: "   ", enabled: true });
    expect(result.current.results).toEqual(recents);
    expect(result.current.loading).toBe(false);
    expect(result.current.showingRecents).toBe(true);
  });

  it("ignores stale responses when a newer request completes first", async () => {
    let resolveSlow: (value: unknown) => void = () => {};
    const slowPromise = new Promise((resolve) => {
      resolveSlow = resolve;
    });

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => slowPromise)
      .mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({ results: [{ symbol: "MSFT", name: "Microsoft", exchange: "NASDAQ" }] }),
      }));

    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ query, enabled }) => useSymbolSearch({ query, enabled }),
      { initialProps: { query: "slow", enabled: true } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    rerender({ query: "fast", enabled: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.results[0]?.symbol).toBe("MSFT");

    await act(async () => {
      resolveSlow({ ok: true, json: async () => ({ results }) });
      await Promise.resolve();
    });

    expect(result.current.results[0]?.symbol).toBe("MSFT");
  });

  it("does not search when disabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useSymbolSearch({ query: "AAPL", enabled: false }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
