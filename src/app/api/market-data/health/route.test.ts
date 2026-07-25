import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { getServerCacheHealthSnapshot } from "@/lib/marketData/cache/serverCacheHealth";
import { createTwsClient, isTwsConfigured } from "@/lib/marketData/providers/tws/client";

const getTwsStatusProbe = vi.fn(async () => ({
  data: {
    configured: true,
    sidecarReachable: true,
    gatewayConnected: true,
    warnings: [],
  },
  source: "tws",
  requestedAt: Date.now(),
  receivedAt: Date.now(),
  stale: false,
  warnings: [],
}));

const getIbkrStatusProbe = vi.fn(async () => ({
  data: {
    configured: true,
    gatewayReachable: true,
    authenticated: false,
    connected: false,
    competing: false,
    warnings: ["Client Portal not authenticated"],
  },
  source: "ibkr",
  requestedAt: Date.now(),
  receivedAt: Date.now(),
  stale: false,
  warnings: ["Client Portal not authenticated"],
}));

vi.mock("@/lib/marketData/service/server", () => ({
  getServerMarketDataService: () => ({
    getTwsStatusProbe,
    getIbkrStatusProbe,
  }),
}));

vi.mock("@/lib/marketData/providers/tws/recoverySession", () => ({
  getTwsRecoverySession: vi.fn(() => null),
}));

vi.mock("@/lib/marketData/providers/tws/client", () => ({
  isTwsConfigured: vi.fn(() => true),
  createTwsClient: vi.fn(() => ({
    probeHealth: vi.fn(async () => ({ ok: true, capabilities: { controlRecovery: true } })),
  })),
}));

vi.mock("@/lib/marketData/cache/serverCacheHealth", () => ({
  getServerCacheHealthSnapshot: vi.fn(async () => ({
    kind: "memory",
    degraded: false,
    lastPingOk: null,
    lastPingAt: null,
  })),
}));

describe("/api/market-data/health GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerCacheHealthSnapshot).mockResolvedValue({
      kind: "memory",
      degraded: false,
      lastPingOk: null,
      lastPingAt: null,
    });
    delete process.env.FMP_API_KEY;
    delete process.env.FRED_API_KEY;
    delete process.env.SEC_USER_AGENT;
  });

  it("returns provider health without secrets and never probes Client Portal IBKR", async () => {
    const res = await GET(new Request("http://localhost/api/market-data/health"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      health: {
        providers: Array<{ id: string; configured: boolean; detail: string }>;
        recentWarnings: string[];
        deliveryDiagnostics?: Array<{ datasetId: string; source: string }>;
        operationalReliability?: {
          deliverySuccess: { status: string; samples: number; ratio: number | null };
        };
        cache?: {
          kind: "memory" | "redis";
          degraded: boolean;
          lastPingOk: boolean | null;
          lastPingAt: number | null;
        };
        twsStatus?: { gatewayConnected?: boolean };
      };
    };

    expect(json.ok).toBe(true);
    expect(json.health.cache).toEqual({
      kind: "memory",
      degraded: false,
      lastPingOk: null,
      lastPingAt: null,
    });
    expect(json.health.providers.some((row) => row.id === "tws")).toBe(true);
    expect(json.health.providers.some((row) => row.id === "massive")).toBe(true);
    expect(json.health.providers.some((row) => row.id === "ibkr")).toBe(true);
    expect(json.health.twsStatus?.gatewayConnected).toBe(true);
    expect(Array.isArray(json.health.deliveryDiagnostics)).toBe(true);
    expect(json.health.operationalReliability?.deliverySuccess).toMatchObject({
      status: "no_samples",
      samples: 0,
      ratio: null,
    });
    expect(JSON.stringify(json)).not.toMatch(/FMP_API_KEY|FRED_API_KEY|SEC_USER_AGENT/);
    expect(json.health.recentWarnings.some((w) => w.includes("authenticated"))).toBe(false);
    expect(getIbkrStatusProbe).not.toHaveBeenCalled();
  });

  it("skips sidecar probe when TWS is not configured", async () => {
    vi.mocked(isTwsConfigured).mockReturnValueOnce(false);
    const res = await GET(new Request("http://localhost/api/market-data/health"));
    expect(res.status).toBe(200);
    expect(createTwsClient).not.toHaveBeenCalled();
  });

  it("returns monotonic revision metadata", async () => {
    const firstRes = await GET(new Request("http://localhost/api/market-data/health"));
    const secondRes = await GET(new Request("http://localhost/api/market-data/health"));
    const first = (await firstRes.json()) as {
      health: { revision?: { sequence: number; epoch: number; generatedAt: number } };
    };
    const second = (await secondRes.json()) as {
      health: { revision?: { sequence: number; epoch: number; generatedAt: number } };
    };
    expect(first.health.revision?.sequence).toBeTypeOf("number");
    expect(second.health.revision?.sequence).toBeGreaterThan(first.health.revision!.sequence);
    expect(second.health.revision?.epoch).toBe(first.health.revision?.epoch);
  });

  it("redacts sensitive TWS warnings and omits internal endpoint details", async () => {
    getTwsStatusProbe.mockResolvedValueOnce({
      data: {
        configured: true,
        sidecarReachable: true,
        gatewayConnected: false,
        host: "private-gateway.internal",
        port: 4002,
        message: 'failed with "token": "abc def" for DU123456',
        warnings: [
          "Authorization: Bearer secret.token",
          "https://private.example/status?api_key=secret",
        ],
        connections: {
          "ib-paper": {
            connectionId: "ib-paper",
            gatewayConnected: false,
            host: "10.0.0.2",
            port: 4002,
            message: "accountId=U1234567",
          },
        },
      },
      source: "tws",
      requestedAt: Date.now(),
      receivedAt: Date.now(),
      stale: false,
      warnings: ['provider error "api_key":"top secret"'],
    });

    const res = await GET(new Request("http://localhost/api/market-data/health"));
    const text = await res.text();

    expect(text).not.toMatch(
      /abc def|DU123456|secret\.token|top secret|private-gateway|10\.0\.0\.2/,
    );
    const json = JSON.parse(text) as { health: { twsStatus?: Record<string, unknown> } };
    expect(json.health.twsStatus).not.toHaveProperty("host");
    expect(json.health.twsStatus).not.toHaveProperty("port");
    expect(text).toContain("[REDACTED]");
  });

  it("bypasses TWS circuit when recovery query param is set", async () => {
    await GET(new Request("http://localhost/api/market-data/health?recovery=1"));
    expect(getTwsStatusProbe).toHaveBeenCalledWith({ bypassCircuit: true });
  });

  it("reports redis cache kind with ping status", async () => {
    vi.mocked(getServerCacheHealthSnapshot).mockResolvedValueOnce({
      kind: "redis",
      degraded: false,
      lastPingOk: true,
      lastPingAt: 1_700_000_000_000,
    });

    const res = await GET(new Request("http://localhost/api/market-data/health"));
    const json = (await res.json()) as {
      health: {
        cache: {
          kind: string;
          degraded: boolean;
          lastPingOk: boolean | null;
          lastPingAt: number | null;
        };
      };
    };

    expect(json.health.cache).toEqual({
      kind: "redis",
      degraded: false,
      lastPingOk: true,
      lastPingAt: 1_700_000_000_000,
    });
  });

  it("reports degraded redis cache when ping fails", async () => {
    vi.mocked(getServerCacheHealthSnapshot).mockResolvedValueOnce({
      kind: "redis",
      degraded: true,
      lastPingOk: false,
      lastPingAt: 1_700_000_000_001,
    });

    const res = await GET(new Request("http://localhost/api/market-data/health"));
    const json = (await res.json()) as {
      health: { cache: { kind: string; degraded: boolean; lastPingOk: boolean | null } };
    };

    expect(json.health.cache).toMatchObject({
      kind: "redis",
      degraded: true,
      lastPingOk: false,
    });
  });

  it("never exposes REDIS_URL or credentials in cache health", async () => {
    process.env.REDIS_URL = "redis://:super-secret@private-redis.internal:6379";
    vi.mocked(getServerCacheHealthSnapshot).mockResolvedValueOnce({
      kind: "redis",
      degraded: false,
      lastPingOk: true,
      lastPingAt: Date.now(),
    });

    const res = await GET(new Request("http://localhost/api/market-data/health"));
    const text = await res.text();

    expect(text).not.toMatch(/REDIS_URL|super-secret|private-redis\.internal/);
    delete process.env.REDIS_URL;
  });
});
