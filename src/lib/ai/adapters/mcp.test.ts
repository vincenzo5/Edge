import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as executeModule from "./execute";
import { buildMcpToolHandlers, logMcpToolCall } from "./mcp";
import { edgeToolRegistry } from "../tools";
import { runWithRequestId } from "@/lib/observability/requestIdContext";

type McpToolLog = {
  ts?: string;
  event: string;
  tool: string;
  ok: boolean;
  code?: string;
  durationMs: number;
  bridge: boolean;
};

function parseMcpToolLogs(consoleSpy: ReturnType<typeof vi.spyOn>): McpToolLog[] {
  return consoleSpy.mock.calls
    .map(([msg]) => String(msg))
    .filter((msg) => msg.includes('"event":"mcp.tool"'))
    .map((msg) => JSON.parse(msg) as McpToolLog);
}

describe("logMcpToolCall", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes structured stderr JSON without code when ok", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logMcpToolCall({
      tool: "search_symbols",
      ok: true,
      durationMs: 12,
      bridge: false,
    });

    const [line] = parseMcpToolLogs(consoleSpy);
    expect(line).toMatchObject({
      event: "mcp.tool",
      tool: "search_symbols",
      ok: true,
      durationMs: 12,
      bridge: false,
    });
    expect(line.code).toBeUndefined();
    expect(typeof line.ts).toBe("string");
  });

  it("includes requestId when ALS context is set", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    runWithRequestId("mcp-req-1", () => {
      logMcpToolCall({
        tool: "search_symbols",
        ok: true,
        durationMs: 12,
        bridge: false,
      });
    });

    const [line] = parseMcpToolLogs(consoleSpy);
    expect(line.requestId).toBe("mcp-req-1");
  });
});

describe("buildMcpToolHandlers", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("lists only server-side tools when bridge URL is unset", () => {
    delete process.env.EDGE_APP_URL;

    const handlers = buildMcpToolHandlers(edgeToolRegistry);
    const names = handlers.map((h) => h.name);

    expect(names).toContain("search_symbols");
    expect(names).not.toContain("get_app_state");
  });

  it("lists all tools when bridge URL is set", () => {
    process.env.EDGE_APP_URL = "http://localhost:3003";

    const handlers = buildMcpToolHandlers(edgeToolRegistry);
    const names = handlers.map((h) => h.name);

    expect(names).toContain("search_symbols");
    expect(names).toContain("get_app_state");
    expect(names).toContain("list_indicator_scripts");
  });

  it("routes client-session tools through the session bridge", async () => {
    process.env.EDGE_APP_URL = "http://localhost:3003";
    process.env.EDGE_PERMISSION_MODE = "write";

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, data: { hydrated: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const handlers = buildMcpToolHandlers(edgeToolRegistry);
    const appState = handlers.find((h) => h.name === "get_app_state");
    expect(appState).toBeDefined();

    const response = await appState!.handler({});
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3003/api/ai/session/execute",
      expect.objectContaining({ method: "POST" }),
    );
    expect(response.content[0]?.text).toContain('"hydrated": true');
  });

  it("logs bridge tool calls to stderr without secrets", async () => {
    process.env.EDGE_APP_URL = "http://localhost:3003";
    process.env.EDGE_API_KEY = "secret-test-key";

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, data: { hydrated: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const handlers = buildMcpToolHandlers(edgeToolRegistry);
    const appState = handlers.find((h) => h.name === "get_app_state");
    await appState!.handler({});

    const logs = parseMcpToolLogs(consoleSpy);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      event: "mcp.tool",
      tool: "get_app_state",
      ok: true,
      bridge: true,
    });
    expect(typeof logs[0].durationMs).toBe("number");
    expect(consoleSpy.mock.calls.map(([msg]) => String(msg)).join("\n")).not.toContain(
      "secret-test-key",
    );
  });

  it("logs server-side tool calls to stderr", async () => {
    delete process.env.EDGE_APP_URL;

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(executeModule, "executeTool").mockResolvedValue({
      ok: true,
      data: [{ symbol: "AAPL", name: "Apple", exchange: "NASDAQ" }],
    });

    const handlers = buildMcpToolHandlers(edgeToolRegistry);
    const search = handlers.find((h) => h.name === "search_symbols");
    expect(search).toBeDefined();

    await search!.handler({ query: "AAPL" });

    const logs = parseMcpToolLogs(consoleSpy);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      event: "mcp.tool",
      tool: "search_symbols",
      ok: true,
      bridge: false,
    });
    expect(typeof logs[0].durationMs).toBe("number");
  });
});
