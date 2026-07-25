#!/usr/bin/env npx tsx

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import type { Pool, PoolClient } from "pg";
import { Pool as PgPool } from "pg";
import Redis from "ioredis";

import { LOCAL_DEPLOY_CONTRACT } from "./validate-local-deploy.mts";

config({ path: ".env.local" });
config();

export const LOCAL_DATABASE_NAMES = [
  LOCAL_DEPLOY_CONTRACT.development.database,
  LOCAL_DEPLOY_CONTRACT.production.database,
] as const;

export type LocalDatabaseName = (typeof LOCAL_DATABASE_NAMES)[number];

export const REDIS_CACHE_ENVS = {
  development: LOCAL_DEPLOY_CONTRACT.development.cacheEnv,
  production: LOCAL_DEPLOY_CONTRACT.production.cacheEnv,
} as const;

const PROBE_TABLE = "edge_local_infra_probe";
const PROBE_SCHEMA_VERSION = 1;

export type PostgresConnect = (url: string) => Promise<void>;

export type ProvisionDatabaseResult = {
  name: LocalDatabaseName;
  status: "created" | "exists";
};

export type ProvisionResult = {
  databases: ProvisionDatabaseResult[];
};

export type PostgresIsolationResult = {
  devMarkerVisibleInProd: boolean;
  prodMarkerVisibleInDev: boolean;
  pass: boolean;
};

export type RedisIsolationResult = {
  devKey: string;
  prodKey: string;
  devValueInProdKey: string | null;
  prodValueInDevKey: string | null;
  pass: boolean;
};

export type VerifyResult = {
  postgres: PostgresIsolationResult;
  redis: RedisIsolationResult;
  pass: boolean;
};

function isAllowlistedDatabase(name: string): name is LocalDatabaseName {
  return (LOCAL_DATABASE_NAMES as readonly string[]).includes(name);
}

export function buildDatabaseUrl(baseUrl: string, databaseName: LocalDatabaseName): string {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

export function resolvePostgresAdminUrl(databaseUrl?: string): string {
  const raw = databaseUrl?.trim() || process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and start Postgres.",
    );
  }

  const parsed = new URL(raw);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use postgres:// or postgresql://.");
  }
  parsed.pathname = "/postgres";
  return parsed.toString();
}

export function resolveRedisUrl(redisUrl?: string): string {
  const raw = redisUrl?.trim() || process.env.REDIS_URL?.trim() || "redis://localhost:6379";
  return raw;
}

export function redisProbeKey(cacheEnv: string, marker: string): string {
  return `edge:${cacheEnv}:${PROBE_SCHEMA_VERSION}:md:infra-probe:${marker}`;
}

export async function databaseExists(client: PoolClient, name: LocalDatabaseName): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
    [name],
  );
  return result.rows[0]?.exists === true;
}

export async function ensureLocalDatabase(
  adminPool: Pool,
  name: LocalDatabaseName,
): Promise<ProvisionDatabaseResult> {
  if (!isAllowlistedDatabase(name)) {
    throw new Error(`Refusing to provision non-allowlisted database: ${name}`);
  }

  const client = await adminPool.connect();
  try {
    if (await databaseExists(client, name)) {
      return { name, status: "exists" };
    }
  } finally {
    client.release();
  }

  // CREATE DATABASE cannot run inside a transaction.
  await adminPool.query(`CREATE DATABASE "${name}"`);
  return { name, status: "created" };
}

export async function provisionLocalDatabases(options: {
  adminDatabaseUrl?: string;
  pool?: Pool;
} = {}): Promise<ProvisionResult> {
  const adminUrl = resolvePostgresAdminUrl(options.adminDatabaseUrl);
  const pool = options.pool ?? new PgPool({ connectionString: adminUrl });
  const ownsPool = !options.pool;

  try {
    const databases: ProvisionDatabaseResult[] = [];
    for (const name of LOCAL_DATABASE_NAMES) {
      databases.push(await ensureLocalDatabase(pool, name));
    }
    return { databases };
  } finally {
    if (ownsPool) {
      await pool.end();
    }
  }
}

async function withDatabasePool<T>(
  baseUrl: string,
  databaseName: LocalDatabaseName,
  run: (pool: Pool) => Promise<T>,
): Promise<T> {
  const pool = new PgPool({ connectionString: buildDatabaseUrl(baseUrl, databaseName) });
  try {
    return await run(pool);
  } finally {
    await pool.end();
  }
}

export type DatabasePoolRunner = <T>(
  baseUrl: string,
  databaseName: LocalDatabaseName,
  run: (pool: Pool) => Promise<T>,
) => Promise<T>;

async function ensureProbeTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${PROBE_TABLE} (
      marker_id text PRIMARY KEY,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function writeProbeMarker(pool: Pool, markerId: string): Promise<void> {
  await ensureProbeTable(pool);
  await pool.query(
    `INSERT INTO ${PROBE_TABLE} (marker_id) VALUES ($1) ON CONFLICT (marker_id) DO NOTHING`,
    [markerId],
  );
}

async function probeMarkerExists(pool: Pool, markerId: string): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [PROBE_TABLE],
  );
  if (!result.rows[0]?.exists) {
    return false;
  }
  const marker = await pool.query<{ marker_id: string }>(
    `SELECT marker_id FROM ${PROBE_TABLE} WHERE marker_id = $1 LIMIT 1`,
    [markerId],
  );
  return marker.rowCount === 1;
}

async function cleanupProbeMarkers(pool: Pool, markerIds: string[]): Promise<void> {
  if (markerIds.length === 0) return;
  await pool.query(`DELETE FROM ${PROBE_TABLE} WHERE marker_id = ANY($1::text[])`, [markerIds]);
}

export async function verifyPostgresIsolation(options: {
  baseDatabaseUrl?: string;
  poolRunner?: DatabasePoolRunner;
} = {}): Promise<PostgresIsolationResult> {
  const baseUrl = options.baseDatabaseUrl?.trim() || process.env.DATABASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const runWithPool = options.poolRunner ?? withDatabasePool;

  const devMarker = `dev-${Date.now()}`;
  const prodMarker = `prod-${Date.now()}`;

  await runWithPool(baseUrl, LOCAL_DEPLOY_CONTRACT.development.database, async (pool) => {
    await writeProbeMarker(pool, devMarker);
  });
  await runWithPool(baseUrl, LOCAL_DEPLOY_CONTRACT.production.database, async (pool) => {
    await writeProbeMarker(pool, prodMarker);
  });

  const devMarkerVisibleInProd = await runWithPool(
    baseUrl,
    LOCAL_DEPLOY_CONTRACT.production.database,
    (pool) => probeMarkerExists(pool, devMarker),
  );
  const prodMarkerVisibleInDev = await runWithPool(
    baseUrl,
    LOCAL_DEPLOY_CONTRACT.development.database,
    (pool) => probeMarkerExists(pool, prodMarker),
  );

  await runWithPool(baseUrl, LOCAL_DEPLOY_CONTRACT.development.database, (pool) =>
    cleanupProbeMarkers(pool, [devMarker, prodMarker]),
  );
  await runWithPool(baseUrl, LOCAL_DEPLOY_CONTRACT.production.database, (pool) =>
    cleanupProbeMarkers(pool, [devMarker, prodMarker]),
  );

  return {
    devMarkerVisibleInProd,
    prodMarkerVisibleInDev,
    pass: !devMarkerVisibleInProd && !prodMarkerVisibleInDev,
  };
}

export async function clearRedisProbeKeys(client: Redis, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await client.del(...keys);
}

export async function verifyRedisIsolation(options: {
  redisUrl?: string;
  client?: Redis;
} = {}): Promise<RedisIsolationResult> {
  const url = resolveRedisUrl(options.redisUrl);
  const client =
    options.client ??
    new Redis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
  const ownsClient = !options.client;

  const devMarker = `dev-${Date.now()}`;
  const prodMarker = `prod-${Date.now()}`;
  const devKey = redisProbeKey(REDIS_CACHE_ENVS.development, devMarker);
  const prodKey = redisProbeKey(REDIS_CACHE_ENVS.production, prodMarker);

  try {
    if (client.status !== "ready" && client.status !== "connect") {
      await client.connect();
    }

    await client.set(devKey, "dev");
    const prodSlotBeforeWrite = await client.get(prodKey);
    await client.set(prodKey, "prod");

    const devValue = await client.get(devKey);
    const prodValue = await client.get(prodKey);

    const pass =
      prodSlotBeforeWrite === null &&
      devValue === "dev" &&
      prodValue === "prod" &&
      devKey.startsWith(`edge:${REDIS_CACHE_ENVS.development}:`) &&
      prodKey.startsWith(`edge:${REDIS_CACHE_ENVS.production}:`) &&
      devKey !== prodKey;

    await clearRedisProbeKeys(client, [devKey, prodKey]);

    return {
      devKey,
      prodKey,
      devValueInProdKey: prodSlotBeforeWrite,
      prodValueInDevKey: prodValue,
      pass,
    };
  } finally {
    if (ownsClient) {
      await client.quit().catch(() => undefined);
    }
  }
}

export async function verifyLocalDataIsolation(options: {
  baseDatabaseUrl?: string;
  redisUrl?: string;
} = {}): Promise<VerifyResult> {
  const postgres = await verifyPostgresIsolation(options);
  const redis = await verifyRedisIsolation(options);
  return {
    postgres,
    redis,
    pass: postgres.pass && redis.pass,
  };
}

export function formatProvisionResult(result: ProvisionResult): string[] {
  return result.databases.map(
    (entry) => `database=${entry.name} status=${entry.status}`,
  );
}

export function formatVerifyResult(result: VerifyResult): string[] {
  return [
    `postgres.isolation=${result.postgres.pass ? "pass" : "fail"}`,
    `redis.isolation=${result.redis.pass ? "pass" : "fail"}`,
    `redis.devKey=${result.redis.devKey}`,
    `redis.prodKey=${result.redis.prodKey}`,
    `overall=${result.pass ? "pass" : "fail"}`,
  ];
}

export function runLocalInfraUp(cwd = process.cwd()): number {
  execFileSync("docker", ["compose", "up", "-d", "--wait", "postgres", "redis"], {
    cwd,
    stdio: "inherit",
  });
  console.log("Local infrastructure is healthy: postgres redis");
  return 0;
}

export async function runLocalInfraProvision(): Promise<number> {
  const result = await provisionLocalDatabases();
  for (const line of formatProvisionResult(result)) {
    console.log(line);
  }
  console.log("Local database provisioning complete.");
  return 0;
}

export async function runLocalInfraVerify(): Promise<number> {
  const result = await verifyLocalDataIsolation();
  for (const line of formatVerifyResult(result)) {
    console.log(line);
  }
  if (!result.pass) {
    console.error("Local data isolation verification failed.");
    return 1;
  }
  console.log("Local data isolation verification passed.");
  return 0;
}

async function main(): Promise<void> {
  const command = process.argv[2]?.trim();
  try {
    if (command === "up") {
      process.exit(runLocalInfraUp());
    }
    if (command === "provision") {
      process.exit(await runLocalInfraProvision());
    }
    if (command === "verify") {
      process.exit(await runLocalInfraVerify());
    }
    console.error("Usage: local-data-infrastructure.mts <up|provision|verify>");
    process.exit(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  void main();
}
