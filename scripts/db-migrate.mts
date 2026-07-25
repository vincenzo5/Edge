import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { Pool } from "pg";

import { runPendingMigrations } from "./db-migrate-lib.mts";

function parseEnvFileArg(argv: string[]): string {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--env-file") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        console.error("--env-file requires a path.");
        process.exit(2);
      }
      return value;
    }
    if (arg.startsWith("--env-file=")) {
      const value = arg.slice("--env-file=".length);
      if (!value) {
        console.error("--env-file requires a path.");
        process.exit(2);
      }
      return value;
    }
  }
  return ".env.local";
}

const envFile = parseEnvFileArg(process.argv.slice(2));
if (!existsSync(envFile)) {
  console.error(`Environment file not found: ${envFile}`);
  process.exit(1);
}

config({ path: envFile });
config();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error(`DATABASE_URL is not set in ${envFile}. Configure persistence vars before migrating.`);
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
