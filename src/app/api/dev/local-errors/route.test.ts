import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "./route";

const appendLocalError = vi.fn();
const readLocalErrorLog = vi.fn();

vi.mock("@/lib/observability/localErrorLog", () => ({
  appendLocalError: (...args: unknown[]) => appendLocalError(...args),
  readLocalErrorLog: (...args: unknown[]) => readLocalErrorLog(...args),
}));

function requestWithIp(url: string, ip: string, init?: RequestInit): Request {
  const req = new Request(url, init);
  Object.defineProperty(req, "ip", { value: ip, configurable: true });
  return req;
}

describe("/api/dev/local-errors", () => {
  beforeEach(() => {
    appendLocalError.mockReset();
    readLocalErrorLog.mockReset();
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.EDGE_API_KEY;
    delete process.env.EDGE_API_AUTH_MODE;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("POST appends a sanitized entry for loopback peers", async () => {
    appendLocalError.mockReturnValue({
      at: 1,
      source: "chart",
      message: "Chart render failed",
    });

    const response = await POST(
      requestWithIp("http://localhost/api/dev/local-errors", "127.0.0.1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "chart",
          message: "Chart render failed",
          stack: "Error: boom",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(appendLocalError).toHaveBeenCalledWith({
      source: "chart",
      message: "Chart render failed",
      stack: "Error: boom",
    });
  });

  it("POST rejects invalid payloads", async () => {
    const response = await POST(
      requestWithIp("http://localhost/api/dev/local-errors", "127.0.0.1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "", message: "" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(appendLocalError).not.toHaveBeenCalled();
  });

  it("GET returns recent entries for loopback peers", async () => {
    readLocalErrorLog.mockReturnValue([
      { at: 1, source: "api", message: "Failed to fetch quotes" },
    ]);

    const response = await GET(
      requestWithIp("http://localhost/api/dev/local-errors?limit=10", "127.0.0.1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(readLocalErrorLog).toHaveBeenCalledWith(10);
    expect(body.entries).toHaveLength(1);
  });

  it("returns 404 in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await GET(
      requestWithIp("http://localhost/api/dev/local-errors", "127.0.0.1"),
    );
    expect(response.status).toBe(404);
    expect(readLocalErrorLog).not.toHaveBeenCalled();
  });

  it("returns 401 for non-loopback peers without API key", async () => {
    vi.stubEnv("EDGE_TRUST_LOCALHOST", "false");
    const response = await GET(
      requestWithIp("http://example.com/api/dev/local-errors", "203.0.113.1"),
    );
    expect(response.status).toBe(401);
    expect(readLocalErrorLog).not.toHaveBeenCalled();
  });

  it("accepts valid API key for non-loopback peers", async () => {
    vi.stubEnv("EDGE_API_KEY", "secret-key");
    vi.stubEnv("EDGE_TRUST_LOCALHOST", "false");
    readLocalErrorLog.mockReturnValue([]);

    const response = await GET(
      requestWithIp("http://example.com/api/dev/local-errors", "203.0.113.1", {
        headers: { "x-edge-api-key": "secret-key" },
      }),
    );

    expect(response.status).toBe(200);
  });
});
