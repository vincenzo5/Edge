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

  it("renders sector, industry, and tradable members as inline clickable crumbs", async () => {
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

    const sectorCrumb = screen.getByTestId("market-context-crumb-sector-XLK");
    expect(sectorCrumb.tagName).toBe("BUTTON");
    expect(sectorCrumb).toHaveTextContent("Technology");
    expect(sectorCrumb).not.toHaveAttribute("title");
    expect(sectorCrumb.className).toContain("cursor-pointer");

    expect(screen.queryByTestId("market-context-tradables-popover")).toBeNull();
    expect(screen.queryByTestId("market-context-tradables-trigger")).toBeNull();

    expect(screen.getByTestId("market-context-crumb-industry-XLK")).toHaveTextContent(
      "Consumer Electronics",
    );
    expect(screen.getByTestId("market-context-crumb-broad_market-SPY")).toHaveTextContent(
      "S&P 500",
    );
    expect(screen.getByTestId("market-context-crumb-benchmark-QQQ")).toHaveTextContent(
      "Nasdaq-100",
    );
    expect(screen.getByTestId("market-context-crumb-benchmark-QQQ")).not.toHaveAttribute(
      "title",
    );

    expect(screen.queryByTestId("symbol-nav-back")).toBeNull();
    expect(screen.queryByTestId("symbol-nav-forward")).toBeNull();
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

    fireEvent.mouseEnter(screen.getByTestId("market-context-crumb-industry-XLK"));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Opens related ETF XLK — Technology sector",
    );

    fireEvent.mouseLeave(screen.getByTestId("market-context-crumb-industry-XLK"));
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.mouseEnter(screen.getByTestId("market-context-crumb-benchmark-QQQ"));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Opens related ETF QQQ — Nasdaq-100",
    );
  });

  it("navigates to the sector ETF when the industry crumb has no distinct ETF mapping", async () => {
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
      expect(screen.getByTestId("market-context-crumb-industry-XLK")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("market-context-crumb-industry-XLK"));
    expect(onSymbolSelect).toHaveBeenCalledWith({
      symbol: "XLK",
      name: "Technology sector",
      exchange: "NASDAQ",
    });
  });

  it("navigates to the sector ETF when the sector label crumb is clicked", async () => {
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
  });

  it("navigates when a tradable crumb is clicked", async () => {
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
      expect(screen.getByTestId("market-context-crumb-broad_market-SPY")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("market-context-crumb-broad_market-SPY"));
    expect(onSymbolSelect).toHaveBeenCalledWith({
      symbol: "SPY",
      name: "S&P 500",
      exchange: "NASDAQ",
    });
  });

  it("shows only the sector crumb on compact density", async () => {
    render(
      <MarketContextBreadcrumb
        symbol="AAPL"
        theme="dark"
        density="compact"
        onSymbolSelect={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("market-context-crumb-sector-XLK")).toHaveTextContent(
        "Technology",
      );
    });

    expect(screen.queryByTestId("market-context-crumb-industry-XLK")).toBeNull();
    expect(screen.queryByTestId("market-context-crumb-broad_market-SPY")).toBeNull();
    expect(screen.queryByTestId("market-context-tradables-popover")).toBeNull();
  });

  it("renders sector as muted non-interactive text when no ETF mapping exists", async () => {
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
      expect(screen.getByTestId("market-context-crumb-sector")).toBeTruthy();
    });

    const sectorLabel = screen.getByTestId("market-context-crumb-sector");
    expect(sectorLabel.tagName).toBe("SPAN");
    expect(sectorLabel).toHaveTextContent("Unknown Sector");
    expect(sectorLabel.className).toContain("text-[var(--edge-text-muted)]");
    expect(sectorLabel).not.toHaveAttribute("title");
  });
});
