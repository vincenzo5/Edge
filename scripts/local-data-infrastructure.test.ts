import { afterEach, describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";

import {
  LOCAL_DATABASE_NAMES,
  REDIS_CACHE_ENVS,
  buildDatabaseUrl,
  databaseExists,
  ensureLocalDatabase,
  formatProvisionResult,
  formatVerifyResult,
  provisionLocalDatabases,
  redisProbeKey,
  resolvePostgresAdminUrl,
  verifyPostgresIsolation,
  verifyRedisIsolation,
} from "./local-data-infrastructure.mts";

describe("local-data-infrastructure", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses frozen allowlisted database names from the deployment contract", () => {
    expect(LOCAL_DATABASE_NAMES).toEqual(["edge_dev", "edge_prod"]);
    expect(REDIS_CACHE_ENVS).toEqual({ development: "dev", production: "prod" });
  });

  it("builds per-database URLs without leaking credentials in output helpers", () => {
    const url = buildDatabaseUrl("postgres://tvai:secret@localhost:5432/tvai", "edge_dev");
    expect(url).toBe("postgres://tvai:secret@localhost:5432/edge_dev");
    expect(formatProvisionResult({
      databases: [{ name: "edge_dev", status: "created" }],
    })).toEqual(["database=edge_dev status=created"]);
  });

  it("resolves the postgres maintenance database for admin provisioning", () => {
    expect(resolvePostgresAdminUrl("postgres://tvai:tvai@localhost:5432/edge_dev")).toBe(
      "postgres://tvai:tvai@localhost:5432/postgres",
    );
  });

  it("builds disjoint redis probe keys for dev and prod", () => {
    const devKey = redisProbeKey("dev", "marker");
    const prodKey = redisProbeKey("prod", "marker");
    expect(devKey).toBe("edge:dev:1:md:infra-probe:marker");
    expect(prodKey).toBe("edge:prod:1:md:infra-probe:marker");
    expect(devKey).not.toBe(prodKey);
  });

  it("creates missing databases idempotently", async () => {
    let exists = false;
    const clientQuery = vi.fn(async () => ({ rows: [{ exists }] }));
    const connect = vi.fn(async () => ({ query: clientQuery, release: vi.fn() }) as unknown as PoolClient);
    const poolQuery = vi.fn(async (sql: string) => {
      if (sql.includes("CREATE DATABASE")) {
        exists = true;
        return { rowCount: 0, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    });
    const pool = { connect, query: poolQuery } as unknown as Pool;

    const first = await ensureLocalDatabase(pool, "edge_dev");
    const second = await ensureLocalDatabase(pool, "edge_dev");

    expect(first).toEqual({ name: "edge_dev", status: "created" });
    expect(second).toEqual({ name: "edge_dev", status: "exists" });
    expect(poolQuery).toHaveBeenCalledWith('CREATE DATABASE "edge_dev"');
  });

  it("refuses non-allowlisted database names", async () => {
    const pool = { connect: vi.fn(), query: vi.fn() } as unknown as Pool;
    await expect(ensureLocalDatabase(pool, "edge_staging" as "edge_dev")).rejects.toThrow(
      /non-allowlisted/i,
    );
  });

  it("reports database existence from pg_catalog", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ exists: true }] });
    const client = { query } as unknown as PoolClient;
    await expect(databaseExists(client, "edge_prod")).resolves.toBe(true);
  });

  it("provisions both local databases through the admin pool", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ exists: false }] })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ exists: true }] });
    const connect = vi.fn(async () => ({ query, release: vi.fn() }) as unknown as PoolClient);
    const pool = { connect, query, end: vi.fn() } as unknown as Pool;

    const result = await provisionLocalDatabases({
      adminDatabaseUrl: "postgres://tvai:tvai@localhost:5432/postgres",
      pool,
    });

    expect(result.databases).toEqual([
      { name: "edge_dev", status: "created" },
      { name: "edge_prod", status: "exists" },
    ]);
  });

  it("verifies postgres isolation without cross-database marker leakage", async () => {
    const devMarkers = new Set<string>();
    const prodMarkers = new Set<string>();

    const poolRunner = async (
      _baseUrl: string,
      databaseName: "edge_dev" | "edge_prod",
      run: (pool: Pool) => Promise<unknown>,
    ) => {
      const pool = {
        query: vi.fn(async (sql: string, params?: unknown[]) => {
          const statement = String(sql);
          if (statement.includes("CREATE TABLE")) {
            return { rowCount: 0, rows: [] };
          }
          if (statement.includes("INSERT INTO")) {
            const markerId = String(params?.[0]);
            if (databaseName === "edge_dev") devMarkers.add(markerId);
            if (databaseName === "edge_prod") prodMarkers.add(markerId);
            return { rowCount: 1, rows: [] };
          }
          if (statement.includes("information_schema.tables")) {
            return { rows: [{ exists: true }] };
          }
          if (statement.includes("SELECT marker_id")) {
            const markerId = String(params?.[0]);
            const visible =
              databaseName === "edge_dev"
                ? devMarkers.has(markerId)
                : prodMarkers.has(markerId);
            return visible
              ? { rowCount: 1, rows: [{ marker_id: markerId }] }
              : { rowCount: 0, rows: [] };
          }
          if (statement.includes("DELETE FROM")) {
            return { rowCount: 1, rows: [] };
          }
          return { rowCount: 0, rows: [] };
        }),
      } as unknown as Pool;
      return run(pool);
    };

    const result = await verifyPostgresIsolation({
      baseDatabaseUrl: "postgres://tvai:tvai@localhost:5432/edge_dev",
      poolRunner,
    });

    expect(result.pass).toBe(true);
    expect(result.devMarkerVisibleInProd).toBe(false);
    expect(result.prodMarkerVisibleInDev).toBe(false);
  });

  it("verifies redis isolation with disjoint keys and no pre-write prod slot", async () => {
    const store = new Map<string, string>();
    const client = {
      status: "ready",
      connect: vi.fn(async () => {}),
      set: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      del: vi.fn(async (...keys: string[]) => {
        for (const key of keys) store.delete(key);
        return keys.length;
      }),
      quit: vi.fn(async () => {}),
    };

    const result = await verifyRedisIsolation({
      redisUrl: "redis://localhost:6379",
      client: client as never,
    });

    expect(result.pass).toBe(true);
    expect(result.devKey.startsWith("edge:dev:")).toBe(true);
    expect(result.prodKey.startsWith("edge:prod:")).toBe(true);
    expect(result.devValueInProdKey).toBeNull();
  });
});
