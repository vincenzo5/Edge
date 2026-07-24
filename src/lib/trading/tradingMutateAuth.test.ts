import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { resolveTradingMutateUser, requireTradingMutateAuth } from "./tradingMutateAuth";

const getCurrentUserMock = vi.fn();
const isPersistenceEnabledMock = vi.fn();
const ensureDevAppUserMock = vi.fn();

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
  isPersistenceEnabled: (...args: unknown[]) => isPersistenceEnabledMock(...args),
}));

vi.mock("@/lib/persistence/repositories/appUserRepository", () => ({
  ensureDevAppUser: (...args: unknown[]) => ensureDevAppUserMock(...args),
}));

describe("tradingMutateAuth", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    isPersistenceEnabledMock.mockReset();
    ensureDevAppUserMock.mockReset();
    delete process.env.EDGE_TRADING_SERVICE_SECRET;
  });

  afterEach(() => {
    delete process.env.EDGE_TRADING_SERVICE_SECRET;
  });

  it("allows mutate without session when persistence is disabled", async () => {
    isPersistenceEnabledMock.mockReturnValue(false);
    const userId = await resolveTradingMutateUser(new Request("http://localhost"));
    expect(userId).toBeNull();

    const auth = await requireTradingMutateAuth(new Request("http://localhost"));
    expect(auth.ok).toBe(true);
    if (auth.ok) expect(auth.userId).toBeNull();
  });

  it("requires persistence session when enabled", async () => {
    isPersistenceEnabledMock.mockReturnValue(true);
    getCurrentUserMock.mockResolvedValue(null);

    const auth = await requireTradingMutateAuth(new Request("http://localhost"));
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      expect(auth.response.status).toBe(401);
    }
  });

  it("accepts persistence session user", async () => {
    isPersistenceEnabledMock.mockReturnValue(true);
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });

    const userId = await resolveTradingMutateUser(new Request("http://localhost"));
    expect(userId).toBe("user-1");
  });

  it("accepts configured service secret", async () => {
    isPersistenceEnabledMock.mockReturnValue(true);
    process.env.EDGE_TRADING_SERVICE_SECRET = "service-secret";
    ensureDevAppUserMock.mockResolvedValue("dev-user");

    const req = new NextRequest("http://localhost", {
      headers: { "x-edge-trading-service-secret": "service-secret" },
    });
    const userId = await resolveTradingMutateUser(req);
    expect(userId).toBe("dev-user");
  });
});
