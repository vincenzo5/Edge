import type { Pool } from "pg";

export const MIGRATIONS_TABLE = "edge_schema_migrations";

export function listPendingMigrations(
  migrationFiles: string[],
  applied: ReadonlySet<string>,
): string[] {
  return migrationFiles.filter((file) => !applied.has(file));
}

export async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function readAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>(
    `SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY filename`,
  );
  return new Set(result.rows.map((row) => row.filename));
}

export async function applyMigration(
  pool: Pool,
  filename: string,
  sql: string,
): Promise<void> {
  await pool.query("BEGIN");
  try {
    await pool.query(sql);
    await pool.query(`INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`, [filename]);
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

export async function runPendingMigrations(
  pool: Pool,
  migrations: ReadonlyArray<{ filename: string; sql: string }>,
): Promise<string[]> {
  await ensureMigrationsTable(pool);
  await backfillLegacyAppliedMigrations(
    pool,
    migrations.map((migration) => migration.filename),
  );
  const applied = await readAppliedMigrations(pool);
  const pending = listPendingMigrations(
    migrations.map((migration) => migration.filename),
    applied,
  );

  const appliedNow: string[] = [];
  for (const filename of pending) {
    const migration = migrations.find((entry) => entry.filename === filename);
    if (!migration) continue;
    await applyMigration(pool, migration.filename, migration.sql);
    appliedNow.push(migration.filename);
  }

  return appliedNow;
}

async function backfillLegacyAppliedMigrations(
  pool: Pool,
  migrationFiles: string[],
): Promise<void> {
  const applied = await readAppliedMigrations(pool);
  if (applied.size > 0) {
    return;
  }

  const result = await pool.query<{ exists: boolean }>(
    "SELECT to_regclass('public.app_users') IS NOT NULL AS exists",
  );
  if (!result.rows[0]?.exists) {
    return;
  }

  for (const filename of migrationFiles) {
    await pool.query(`INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1) ON CONFLICT DO NOTHING`, [
      filename,
    ]);
  }
}
