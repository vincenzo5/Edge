import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { Pool } from "pg";

import { runPendingMigrations } from "./db-migrate-lib.mts";

config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local and start Postgres.");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../src/db/migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (migrationFiles.length === 0) {
  console.error("No migration files found in", migrationsDir);
  process.exit(1);
}

const migrations = migrationFiles.map((file) => ({
  filename: file,
  sql: readFileSync(join(migrationsDir, file), "utf8"),
}));

const pool = new Pool({ connectionString: databaseUrl });

try {
  const appliedNow = await runPendingMigrations(pool, migrations);
  if (appliedNow.length === 0) {
    console.log("No pending migrations.");
  } else {
    for (const file of appliedNow) {
      console.log("Applied migration:", join(migrationsDir, file));
    }
  }
} finally {
  await pool.end();
}
