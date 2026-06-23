import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local and start Postgres.");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(__dirname, "../src/db/migrations/0000_init.sql");
const sql = readFileSync(migrationPath, "utf8");

const pool = new Pool({ connectionString: databaseUrl });

try {
  await pool.query(sql);
  console.log("Applied migration:", migrationPath);
} finally {
  await pool.end();
}
