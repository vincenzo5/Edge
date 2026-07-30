import { describe, expect, it } from "vitest";
import {
  formatToolResultForModel,
  summarizeToolResult,
} from "./summarizeToolResult";

describe("summarizeToolResult", () => {
  it("explains missing browser session", () => {
    expect(
      summarizeToolResult("get_app_state", {
        ok: false,
        error: "needs browser",
        code: "requires_client_session",
      }),
    ).toMatch(/requires live browser session/i);
  });

  it("explains confirmation_required", () => {
    expect(
      summarizeToolResult("delete_drawing", {
        ok: false,
        error: "needs confirm",
        code: "confirmation_required",
      }),
    ).toMatch(/awaiting your confirmation/i);
  });

  it("summarizes get_candles without JSON dump", () => {
    const summary = summarizeToolResult("get_candles", {
      ok: true,
      data: {
        symbol: "AAPL",
        count: 250,
        candles: Array.from({ length: 250 }, () => ({ o: 1, h: 2, l: 0.5, c: 1.5 })),
      },
    });

    expect(summary).toBe("AAPL · 250 bars");
    expect(summary).not.toMatch(/[\[{]/);
  });

  it("summarizes get_quotes with price and change", () => {
    const summary = summarizeToolResult("get_quotes", {
      ok: true,
      data: {
        quotes: [
          {
            symbol: "AAPL",
            regularMarketPrice: 333.02,
            regularMarketChangePercent: 3.5316746,
          },
        ],
      },
    });

    expect(summary).toBe("AAPL $333.02 (+3.5%)");
    expect(summary).not.toMatch(/[\[{]/);
  });

  it("summarizes get_app_state from workspace snapshot", () => {
    const summary = summarizeToolResult("get_app_state", {
      ok: true,
      data: {
        hydrated: true,
        theme: "dark",
        activeCellIndex: 0,
        layoutId: "n1",
        linkSymbol: false,
        linkInterval: false,
        linkCrosshair: false,
        linkDrawings: false,
        toolbarPrefs: {},
        sidebar: {},
        cells: [{ index: 0, symbol: "AAPL", range: "1y", interval: "1d", chartType: "candle", indicatorCount: 0, drawingCount: 0 }],
        sidebarPanel: null,
      },
    });

    expect(summary).toBe("AAPL · dark · 1 cell");
    expect(summary).not.toMatch(/[\[{]/);
  });

  it("summarizes summarize_chart success", () => {
    const summary = summarizeToolResult("summarize_chart", {
      ok: true,
      data: {
        symbol: "AAPL",
        interval: "1D",
        drawingCount: 4,
      },
    });

    expect(summary).toBe("AAPL · 1D · 4 drawings");
  });

  it("summarizes summarize_chart chart context error in plain English", () => {
    const summary = summarizeToolResult("summarize_chart", {
      ok: false,
      error: "Chart context unavailable",
      code: "execution",
    });

    expect(summary).toBe("Chart context unavailable");
  });

  it("summarizes search_symbols match counts", () => {
    expect(
      summarizeToolResult("search_symbols", {
        ok: true,
        data: { results: [{ symbol: "AAPL", name: "Apple Inc." }] },
      }),
    ).toBe("AAPL");

    expect(
      summarizeToolResult("search_symbols", {
        ok: true,
        data: {
          results: [
            { symbol: "AAPL", name: "Apple Inc." },
            { symbol: "AAPL.L", name: "Other" },
          ],
        },
      }),
    ).toBe("2 matches · AAPL");
  });

  it("uses generic fallback without serializing large arrays", () => {
    const summary = summarizeToolResult("unknown_tool", {
      ok: true,
      data: {
        symbol: "MSFT",
        items: Array.from({ length: 500 }, (_, index) => ({ id: index })),
      },
    });

    expect(summary).toBe("MSFT · 500 items");
    expect(summary).not.toMatch(/[\[{]/);
  });

  it("summarizes profile_research_dataset compactly", () => {
    const summary = summarizeToolResult("profile_research_dataset", {
      ok: true,
      data: {
        jobId: "job_1234567890",
        keyMetrics: { Symbols: 2, "Total bars": 500 },
      },
    });
    expect(summary).toContain("2 symbols");
    expect(summary).toContain("500 bars");
    expect(summary).not.toMatch(/[\[{]/);
  });

  it("summarizes create_research_dataset compactly", () => {
    const summary = summarizeToolResult("create_research_dataset", {
      ok: true,
      data: {
        datasetId: "ds_abcdefghijklmnop",
        rowCount: 120,
        created: true,
      },
    });
    expect(summary).toContain("120 bars");
    expect(summary).toContain("created");
  });
});

describe("formatToolResultForModel", () => {
  it("includes top-level meta when present on data payload", () => {
    const formatted = formatToolResultForModel({
      ok: true,
      data: {
        symbol: "AAPL",
        meta: {
          source: "yahoo",
          stale: false,
        },
      },
    });

    expect(JSON.parse(formatted)).toEqual({
      data: {
        symbol: "AAPL",
        meta: {
          source: "yahoo",
          stale: false,
        },
      },
      meta: {
        source: "yahoo",
        stale: false,
      },
    });
  });

  it("serializes data only when meta is absent", () => {
    const formatted = formatToolResultForModel({
      ok: true,
      data: { count: 3 },
    });

    expect(JSON.parse(formatted)).toEqual({ count: 3 });
  });
});
