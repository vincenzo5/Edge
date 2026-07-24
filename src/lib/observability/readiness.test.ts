import { beforeEach, describe, expect, it, vi } from "vitest";

import * as db from "@/db";
import * as redisClient from "@/lib/marketData/cache/redisClient";
import { createTwsClient } from "@/lib/marketData/providers/tws/client";

import { checkReadiness } from "./readiness";

vi.mock("@/db", async (importOriginal) => {
  const actual = await importOriginal<typeof db>();
  return {
    ...actual,
    isDatabaseConfigured: vi.fn(() => false),
    pingDatabase: vi.fn(async () => true),
  };
});

vi.mock("@/lib/marketData/cache/cacheBackendTypes", () => ({
  isRedisRequired: vi.fn(() => false),
}));

vi.mock("@/lib/marketData/cache/redisClient", () => ({
  getRedisUrl: vi.fn(() => undefined),
  getSharedRedisClient: vi.fn(),
  pingRedis: vi.fn(async () => true),
}));

vi.mock("@/lib/marketData/providers/tws/client", () => ({
  createTwsClient: vi.fn(() => ({
    probeLiveness: vi.fn(async () => true),
  })),
}));

describe("checkReadiness", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.EDGE_READYZ_REQUIRE_TWS;
    delete process.env.TWS_SIDECAR_URL;
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    delete process.env.EDGE_REQUIRE_REDIS;
    delete process.env.NODE_ENV;
    vi.mocked(db.isDatabaseConfigured).mockReturnValue(false);
    vi.mocked(db.pingDatabase).mockResolvedValue(true);
    const { isRedisRequired } = await import(
      "@/lib/marketData/cache/cacheBackendTypes"
    );
    vi.mocked(isRedisRequired).mockReturnValue(false);
    vi.mocked(redisClient.getRedisUrl).mockReturnValue(undefined);
    vi.mocked(redisClient.pingRedis).mockResolvedValue(true);
    vi.mocked(createTwsClient).mockReturnValue({
      probeLiveness: vi.fn(async () => true),
    } as never);
  });

  it("returns ok when no dependencies are required", async () => {
    const result = await checkReadiness();
    expect(result).toEqual({ ok: true, reasons: [] });
  });

  it("returns postgres_unavailable when database ping fails", async () => {
    vi.mocked(db.isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(db.pingDatabase).mockResolvedValue(false);

    const result = await checkReadiness();
    expect(result).toEqual({
      ok: false,
      reasons: ["postgres_unavailable"],
    });
  });

  it("returns redis_unavailable when Redis is required but URL is missing", async () => {
    const { isRedisRequired } = await import(
      "@/lib/marketData/cache/cacheBackendTypes"
    );
    vi.mocked(isRedisRequired).mockReturnValue(true);
    vi.mocked(redisClient.getRedisUrl).mockReturnValue(undefined);

    const result = await checkReadiness();
    expect(result).toEqual({
      ok: false,
      reasons: ["redis_unavailable"],
    });
  });

  it("returns redis_unavailable when Redis ping fails", async () => {
    const { isRedisRequired } = await import(
      "@/lib/marketData/cache/cacheBackendTypes"
    );
    vi.mocked(isRedisRequired).mockReturnValue(true);
    vi.mocked(redisClient.getRedisUrl).mockReturnValue("redis://127.0.0.1:6379");
    vi.mocked(redisClient.pingRedis).mockResolvedValue(false);

    const result = await checkReadiness();
    expect(result).toEqual({
      ok: false,
      reasons: ["redis_unavailable"],
    });
  });

  it("returns tws_unavailable when TWS readiness is required and probe fails", async () => {
    process.env.EDGE_READYZ_REQUIRE_TWS = "1";
    process.env.TWS_SIDECAR_URL = "http://127.0.0.1:8765";
    vi.mocked(createTwsClient).mockReturnValue({
      probeLiveness: vi.fn(async () => false),
    } as never);

    const result = await checkReadiness();
    expect(result).toEqual({
      ok: false,
      reasons: ["tws_unavailable"],
    });
  });

  it("aggregates multiple failure reasons", async () => {
    const { isRedisRequired } = await import(
      "@/lib/marketData/cache/cacheBackendTypes"
    );
    vi.mocked(db.isDatabaseConfigured).mockReturnValue(true);
    vi.mocked(db.pingDatabase).mockResolvedValue(false);
    vi.mocked(isRedisRequired).mockReturnValue(true);
    vi.mocked(redisClient.getRedisUrl).mockReturnValue(undefined);
    process.env.EDGE_READYZ_REQUIRE_TWS = "1";
    process.env.TWS_SIDECAR_URL = "http://127.0.0.1:8765";
    vi.mocked(createTwsClient).mockReturnValue({
      probeLiveness: vi.fn(async () => false),
    } as never);

    const result = await checkReadiness();
    expect(result.ok).toBe(false);
    expect(result.reasons).toEqual([
      "postgres_unavailable",
      "redis_unavailable",
      "tws_unavailable",
    ]);
  });
});
