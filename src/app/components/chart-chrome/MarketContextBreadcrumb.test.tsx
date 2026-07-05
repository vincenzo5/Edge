import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import MarketContextBreadcrumb from "./MarketContextBreadcrumb";

const contextPayload = {
  context: {
    symbol: "AAPL",
    name: "Apple Inc.",
    assetClass: "equity",
    exchange: "NASDAQ",
    sector: { label: "Technology", source: "tws", confidence: "provider" },
    industry: {
      label: "Consumer Electronics",
      source: "tws",
      confidence: "provider",
    },
    relationships: [
      {
        kind: "sector",
        label: "Technology",
        source: "tws",
        confidence: "provider",
      },
      {
        kind: "industry",
        label: "Consumer Electronics",
        source: "tws",
        confidence: "provider",
      },
    ],
    tradableGroups: [
      {
        flavor: "sector_etf",
        label: "Sector ETF",
        members: [
          {
            flavor: "sector_etf",
            label: "Technology sector",
            symbol: "XLK",
            source: "curated",
            confidence: "curated",
          },
        ],
      },
      {
        flavor: "broad_market",
        label: "Broad market",
        members: [
          {
            flavor: "broad_market",
            label: "S&P 500",
            symbol: "SPY",
            indexLabel: "S&P 500",
            source: "curated",
            confidence: "curated",
          },
        ],
      },
      {
        flavor: "benchmark",
        label: "Benchmark",
        members: [
          {
            flavor: "benchmark",
            label: "Nasdaq-100",
            symbol: "QQQ",
            indexLabel: "Nasdaq-100",
            source: "curated",
            confidence: "curated",
          },
        ],
      },
    ],
    updatedAt: Date.now(),
  },
};

describe("MarketContextBreadcrumb", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => contextPayload,
      })) as unknown as typeof fetch,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders classification text and ticker chips", async () => {
    render(
      <MarketContextBreadcrumb
        symbol="AAPL"
        theme="dark"
        density="full"
        onSymbolSelect={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("market-context-classification")).toBeTruthy();
    });

    expect(screen.getByTestId("market-context-classification")).toHaveTextContent(
      "Technology · Consumer Electronics",
    );

    const sectorChip = screen.getByTestId("market-context-crumb-sector-XLK");
    expect(sectorChip.tagName).toBe("BUTTON");
    expect(sectorChip).toHaveTextContent("XLK");

    expect(screen.queryByTestId("market-context-crumb-industry-XLK")).toBeNull();
    expect(screen.getByTestId("market-context-crumb-broad_market-SPY")).toHaveTextContent("SPY");
    expect(screen.getByTestId("market-context-crumb-benchmark-QQQ")).toHaveTextContent("QQQ");
  });

  it("shows app tooltips with the ETF redirect target on hover", async () => {
    render(
      <MarketContextBreadcrumb
        symbol="AAPL"
        theme="dark"
        density="full"
        onSymbolSelect={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("market-context-crumb-sector-XLK")).toBeTruthy();
    });

    vi.useFakeTimers();

    fireEvent.mouseEnter(screen.getByTestId("market-context-crumb-sector-XLK"));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Opens related ETF XLK — Technology sector",
    );

    fireEvent.mouseLeave(screen.getByTestId("market-context-crumb-sector-XLK"));
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.mouseEnter(screen.getByTestId("market-context-crumb-benchmark-QQQ"));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Opens related ETF QQQ — Nasdaq-100",
    );
  });

  it("navigates when a chip is clicked", async () => {
    const onSymbolSelect = vi.fn();
    render(
      <MarketContextBreadcrumb
        symbol="AAPL"
        theme="dark"
        density="full"
        onSymbolSelect={onSymbolSelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("market-context-crumb-sector-XLK")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("market-context-crumb-sector-XLK"));
    expect(onSymbolSelect).toHaveBeenCalledWith({
      symbol: "XLK",
      name: "Technology sector",
      exchange: "NASDAQ",
    });

    fireEvent.click(screen.getByTestId("market-context-crumb-broad_market-SPY"));
    expect(onSymbolSelect).toHaveBeenCalledWith({
      symbol: "SPY",
      name: "S&P 500",
      exchange: "NASDAQ",
    });
  });

  it("shows sector classification and one chip on compact density", async () => {
    render(
      <MarketContextBreadcrumb
        symbol="AAPL"
        theme="dark"
        density="compact"
        onSymbolSelect={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("market-context-classification")).toHaveTextContent(
        "Technology",
      );
    });

    expect(screen.getByTestId("market-context-crumb-sector-XLK")).toHaveTextContent("XLK");
    expect(screen.queryByTestId("market-context-crumb-broad_market-SPY")).toBeNull();
    expect(screen.getByTestId("market-context-overflow-trigger")).toHaveTextContent("+2");
  });

  it("opens overflow menu with hidden chips", async () => {
    render(
      <MarketContextBreadcrumb
        symbol="AAPL"
        theme="dark"
        density="compact"
        onSymbolSelect={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("market-context-overflow-trigger")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("market-context-overflow-trigger"));
    expect(screen.getByTestId("market-context-overflow-menu")).toBeTruthy();
    expect(screen.getByTestId("market-context-crumb-broad_market-SPY")).toHaveTextContent("SPY");
  });

  it("renders classification only when no ETF mapping exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          context: {
            ...contextPayload.context,
            tradableGroups: [],
            relationships: [
              {
                kind: "sector",
                label: "Unknown Sector",
                source: "tws",
                confidence: "provider",
              },
            ],
            sector: { label: "Unknown Sector", source: "tws", confidence: "provider" },
            industry: null,
          },
        }),
      })) as unknown as typeof fetch,
    );

    render(
      <MarketContextBreadcrumb
        symbol="TEST"
        theme="dark"
        density="full"
        onSymbolSelect={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("market-context-classification")).toBeTruthy();
    });

    expect(screen.getByTestId("market-context-classification")).toHaveTextContent(
      "Unknown Sector",
    );
    expect(screen.queryByTestId("market-context-crumb-sector-XLK")).toBeNull();
  });
});
