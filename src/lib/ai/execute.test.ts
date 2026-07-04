import { describe, expect, it, vi } from "vitest";
import { executeTool } from "./adapters/execute";
import { edgeToolRegistry } from "./tools";
import type { ToolContext } from "./context";

function mockContext(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    clientSession: false,
    app: null,
    chart: null,
    watchlist: null,
    screener: null,
    risk: null,
    account: null,
    options: null,
    marketData: {
      searchSymbols: vi.fn().mockResolvedValue([{ symbol: "AAPL", name: "Apple", exchange: "NASDAQ" }]),
      getCandles: vi.fn().mockResolvedValue([]),
      getQuotes: vi.fn().mockResolvedValue([]),
      getFundamentals: vi.fn().mockResolvedValue({ symbol: "AAPL", updatedAt: Date.now() }),
      getOptionExpirations: vi.fn().mockResolvedValue([]),
      getOptionsChain: vi.fn().mockResolvedValue({
        underlying: "AAPL",
        expiration: "2025-06-20",
        contracts: [],
      }),
    },
    ...overrides,
  };
}

describe("executeTool", () => {
  it("returns not_found for unknown tools", async () => {
    const result = await executeTool(
      edgeToolRegistry,
      "nonexistent",
      {},
      mockContext(),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_found");
  });

  it("validates input before execution", async () => {
    const result = await executeTool(
      edgeToolRegistry,
      "search_symbols",
      { query: "" },
      mockContext(),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("validation");
  });

  it("executes market data tools server-side", async () => {
    const ctx = mockContext();
    const result = await executeTool(
      edgeToolRegistry,
      "search_symbols",
      { query: "AAPL" },
      ctx,
    );
    expect(result.ok).toBe(true);
    expect(ctx.marketData.searchSymbols).toHaveBeenCalledWith("AAPL", 8);
  });

  it("blocks client-session tools without browser context", async () => {
    const result = await executeTool(
      edgeToolRegistry,
      "get_app_state",
      {},
      mockContext({ clientSession: false }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("requires_client_session");
  });

  it("requires confirmation for destructive tools", async () => {
    const result = await executeTool(
      edgeToolRegistry,
      "delete_drawing",
      { drawingId: "x" },
      mockContext({ clientSession: true }),
      { permissionMode: "full", confirmed: false },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("confirmation_required");
  });

  it("denies write tools in read permission mode", async () => {
    const result = await executeTool(
      edgeToolRegistry,
      "set_symbol",
      { symbol: "MSFT" },
      mockContext({ clientSession: true }),
      { permissionMode: "read" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("permission_denied");
  });
});

describe("edgeToolRegistry", () => {
  it("registers all planned tool groups", () => {
    const names = edgeToolRegistry.list().map((t) => t.name);
    expect(names).toContain("get_app_state");
    expect(names).toContain("search_symbols");
    expect(names).toContain("add_indicator");
    expect(names).toContain("add_drawing");
    expect(names).toContain("get_watchlists");
    expect(names).toContain("summarize_chart");
    expect(names).toContain("summarize_screen");
    expect(names.length).toBeGreaterThanOrEqual(30);
  });
});
