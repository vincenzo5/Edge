import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRiskMarginContext } from "./useRiskMarginContext";

const mockUseAccountOptional = vi.fn();

vi.mock("../AccountProvider", () => ({
  useAccountOptional: () => mockUseAccountOptional(),
}));

const mockFetchWhatIfPreview = vi.fn();

vi.mock("@/lib/brokerage/whatIfClient", () => ({
  fetchWhatIfPreview: (...args: unknown[]) => mockFetchWhatIfPreview(...args),
  WhatIfClientError: class WhatIfClientError extends Error {
    name = "WhatIfClientError";
  },
}));

describe("useRiskMarginContext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetchWhatIfPreview.mockReset();
    mockUseAccountOptional.mockReturnValue({
      disabled: false,
      connectionState: "connected",
      tradingEnvironment: "paper",
      summary: {
        tags: {
          NetLiquidation: { tag: "NetLiquidation", value: "100000" },
          InitMarginReq: { tag: "InitMarginReq", value: "62000" },
          AvailableFunds: { tag: "AvailableFunds", value: "41000" },
          ExcessLiquidity: { tag: "ExcessLiquidity", value: "38000" },
        },
        updatedAt: Date.now(),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses current margin from connected account", () => {
    const { result } = renderHook(() =>
      useRiskMarginContext({
        symbol: null,
        shares: null,
        direction: null,
        notional: null,
        enabled: false,
      }),
    );

    expect(result.current.accountConnected).toBe(true);
    expect(result.current.current?.initMarginReq).toBe(62000);
    expect(result.current.current?.utilization).toBeCloseTo(0.62);
  });

  it("debounces what-if preview when shares are sized", async () => {
    mockFetchWhatIfPreview.mockResolvedValue({
      symbol: "AAPL",
      action: "BUY",
      quantity: 200,
      orderType: "MKT",
      initMarginChange: 4200,
      maintMarginChange: 3500,
      updatedAt: 1,
    });

    const { result } = renderHook(() =>
      useRiskMarginContext({
        symbol: "AAPL",
        shares: 200,
        direction: "long",
        notional: 20000,
        enabled: true,
      }),
    );

    expect(mockFetchWhatIfPreview).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(mockFetchWhatIfPreview).toHaveBeenCalledWith(
      {
        symbol: "AAPL",
        action: "BUY",
        quantity: 200,
        orderType: "MKT",
        outsideRth: false,
      },
      expect.objectContaining({ environment: "paper" }),
    );
    expect(result.current.impact?.initMarginChange).toBe(4200);
    expect(result.current.impactStatus).toBe("tight");
  });

  it("estimates from IBKR Reg T rules when what-if returns zero deltas", async () => {
    mockUseAccountOptional.mockReturnValue({
      disabled: false,
      connectionState: "connected",
      tradingEnvironment: "paper",
      summary: {
        tags: {
          NetLiquidation: { tag: "NetLiquidation", value: "1048000" },
          InitMarginReq: { tag: "InitMarginReq", value: "19" },
          AvailableFunds: { tag: "AvailableFunds", value: "1047624" },
          ExcessLiquidity: { tag: "ExcessLiquidity", value: "1047626" },
        },
        updatedAt: Date.now(),
      },
    });

    mockFetchWhatIfPreview.mockResolvedValue({
      symbol: "BRUN",
      action: "BUY",
      quantity: 1550,
      orderType: "MKT",
      initMarginChange: 0,
      maintMarginChange: 0,
      updatedAt: 1,
    });

    const { result } = renderHook(() =>
      useRiskMarginContext({
        symbol: "BRUN",
        shares: 1550,
        direction: "long",
        notional: 37851,
        entryPrice: 24.42,
        enabled: true,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(result.current.impact?.initMarginChange).toBeCloseTo(37851 * 0.5);
    expect(result.current.impact?.maintMarginChange).toBeCloseTo(37851 * 0.25);
    expect(result.current.impact?.estimated).toBe(true);
    expect(result.current.impactStatus).toBe("ok");
  });

  it("estimates short CSCO overnight with 50% init / 30% maint", async () => {
    mockUseAccountOptional.mockReturnValue({
      disabled: false,
      connectionState: "connected",
      tradingEnvironment: "paper",
      summary: {
        tags: {
          NetLiquidation: { tag: "NetLiquidation", value: "36948" },
          InitMarginReq: { tag: "InitMarginReq", value: "0" },
          AvailableFunds: { tag: "AvailableFunds", value: "36948" },
          ExcessLiquidity: { tag: "ExcessLiquidity", value: "36948" },
        },
        updatedAt: Date.now(),
      },
    });

    mockFetchWhatIfPreview.mockResolvedValue({
      symbol: "CSCO",
      action: "SELL",
      quantity: 300,
      orderType: "MKT",
      initMarginChange: 0,
      maintMarginChange: 0,
      updatedAt: 1,
    });

    const notional = 300 * 111.5;
    const { result } = renderHook(() =>
      useRiskMarginContext({
        symbol: "CSCO",
        shares: 300,
        direction: "short",
        notional,
        entryPrice: 111.5,
        enabled: true,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(result.current.impact?.initMarginChange).toBeCloseTo(notional * 0.5);
    expect(result.current.impact?.maintMarginChange).toBeCloseTo(notional * 0.3);
    expect(result.current.impact?.projectedUtilization).toBeLessThan(0.9);
    expect(result.current.impactStatus).not.toBe("over");
  });

  it("classifies over when init delta exceeds available funds", async () => {
    mockFetchWhatIfPreview.mockResolvedValue({
      symbol: "AAPL",
      action: "BUY",
      quantity: 200,
      orderType: "MKT",
      initMarginChange: 50000,
      maintMarginChange: 40000,
      updatedAt: 1,
    });

    const { result } = renderHook(() =>
      useRiskMarginContext({
        symbol: "AAPL",
        shares: 200,
        direction: "long",
        notional: 20000,
        enabled: true,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(result.current.impactStatus).toBe("over");
  });

  it("computes maxAffordable from what-if when shares are unset", async () => {
    mockFetchWhatIfPreview.mockResolvedValue({
      symbol: "AAPL",
      action: "BUY",
      quantity: 1,
      orderType: "MKT",
      initMarginChange: 75,
      maintMarginChange: 50,
      updatedAt: 1,
    });

    const { result } = renderHook(() =>
      useRiskMarginContext({
        symbol: "AAPL",
        shares: null,
        direction: "long",
        notional: null,
        entryPrice: 100,
        enabled: true,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(mockFetchWhatIfPreview).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 1 }),
      expect.any(Object),
    );
    expect(result.current.maxAffordable?.shares).toBe(Math.floor(41000 / 75));
    expect(result.current.impact).toBeNull();
  });
});
