import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

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

describe("/api/market-data/health GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      };
    };

    expect(json.ok).toBe(true);
    expect(json.health.providers.some((row) => row.id === "tws")).toBe(true);
    expect(json.health.providers.some((row) => row.id === "ibkr")).toBe(false);
    expect(JSON.stringify(json)).not.toMatch(/FMP_API_KEY|FRED_API_KEY|SEC_USER_AGENT/);
    expect(json.health.recentWarnings.some((w) => w.includes("authenticated"))).toBe(false);
    expect(getIbkrStatusProbe).not.toHaveBeenCalled();
  });

  it("bypasses TWS circuit when recovery query param is set", async () => {
    await GET(new Request("http://localhost/api/market-data/health?recovery=1"));
    expect(getTwsStatusProbe).toHaveBeenCalledWith({ bypassCircuit: true });
  });
});
