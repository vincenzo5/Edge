import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildMcpToolHandlers } from "./mcp";
import { edgeToolRegistry } from "../tools";

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
});
