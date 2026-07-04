import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });
config();

export type WaitForPostgresOptions = {
  databaseUrl?: string;
  timeoutMs?: number;
  intervalMs?: number;
  connect?: (url: string) => Promise<void>;
};

export class PostgresWaitTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Postgres did not become ready within ${timeoutMs}ms. Check docker compose and DATABASE_URL.`);
    this.name = "PostgresWaitTimeoutError";
  }
}

export class PostgresWaitConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostgresWaitConfigError";
  }
}

async function defaultConnect(url: string): Promise<void> {
  const pool = new Pool({ connectionString: url });
  try {
    await pool.query("SELECT 1");
  } finally {
    await pool.end();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitForPostgres(options: WaitForPostgresOptions = {}): Promise<void> {
  const databaseUrl =
    options.databaseUrl !== undefined
      ? options.databaseUrl.trim()
      : process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new PostgresWaitConfigError(
      "DATABASE_URL is not set. Copy .env.example to .env.local and start Postgres.",
    );
  }

  const timeoutMs = options.timeoutMs ?? 30_000;
  const intervalMs = options.intervalMs ?? 500;
  const connect = options.connect ?? defaultConnect;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await connect(databaseUrl);
      return;
    } catch {
      await sleep(intervalMs);
    }
  }

  throw new PostgresWaitTimeoutError(timeoutMs);
}

async function main(): Promise<void> {
  try {
    await waitForPostgres();
    console.log("Postgres is ready.");
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
