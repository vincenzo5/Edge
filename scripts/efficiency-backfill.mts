#!/usr/bin/env npx tsx
/**
 * Optional backfill: import prompt rows from ~/.cursor/analytics/analytics.db
 * into .edge/prompts.jsonl (dedup by conversation_id + generation_id + ts).
 *
 * Usage: npm run efficiency:backfill [-- --dry-run]
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, homedir, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DEFAULT_PROMPTS_PATH, readPromptLog } from "./efficiency-ledger.mts";

const ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_DB = join(homedir(), ".cursor", "analytics", "analytics.db");

function parseArgs(argv: string[]): { dryRun: boolean; dbPath: string } {
  const dbFlagIndex = argv.indexOf("--db");
  const dbPath =
    dbFlagIndex !== -1 && argv[dbFlagIndex + 1]
      ? resolve(argv[dbFlagIndex + 1]!)
      : DEFAULT_DB;
  return { dryRun: argv.includes("--dry-run"), dbPath };
}

function dedupeKey(row: { ts: string; conversation_id: string; generation_id?: string }): string {
  return `${row.conversation_id}|${row.generation_id ?? ""}|${row.ts}`;
}

function queryPromptRows(dbPath: string): Array<{
  ts: string;
  conversation_id: string;
  generation_id: string;
  prompt_head: string;
  prompt_length: number;
}> {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((row) => String((row as { name: string }).name));

  const candidateTables = tables.filter((name) =>
    /prompt|message|submit|analytics/i.test(name),
  );

  for (const table of candidateTables) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    const columnNames = columns.map((column) => column.name.toLowerCase());

    const promptCol = columnNames.find((name) => /prompt|message|content|text/.test(name));
    const tsCol = columnNames.find((name) => /ts|time|created|timestamp/.test(name));
    const convCol = columnNames.find((name) => /conversation/.test(name));
    const genCol = columnNames.find((name) => /generation/.test(name));

    if (!promptCol || !tsCol) continue;

    const actual = Object.fromEntries(columns.map((column) => [column.name.toLowerCase(), column.name]));
    const sql = `SELECT ${actual[tsCol]}, ${actual[promptCol]}, ${convCol ? actual[convCol] : "''"} AS conversation_id, ${genCol ? actual[genCol] : "''"} AS generation_id FROM ${table}`;
    try {
      const rows = db.prepare(sql).all() as Array<Record<string, unknown>>;
      const mapped = rows
        .map((row) => {
          const prompt = String(row[actual[promptCol]!] ?? "");
          const tsRaw = row[actual[tsCol]!];
          const ts =
            typeof tsRaw === "number"
              ? new Date(tsRaw).toISOString()
              : String(tsRaw ?? new Date().toISOString());
          return {
            ts,
            conversation_id: String(row.conversation_id ?? ""),
            generation_id: String(row.generation_id ?? ""),
            prompt_head: prompt.slice(0, 200),
            prompt_length: prompt.length,
          };
        })
        .filter((row) => row.prompt_length > 0);

      if (mapped.length > 0) return mapped;
    } catch {
      // try next table
    }
  }

  return [];
}

function main(): void {
  const { dryRun, dbPath } = parseArgs(process.argv.slice(2));

  if (!existsSync(dbPath)) {
    console.error(`efficiency:backfill — analytics db not found: ${dbPath}`);
    process.exit(1);
  }

  const promptsPath = DEFAULT_PROMPTS_PATH;
  const existing = readPromptLog(promptsPath, ROOT);
  const existingKeys = new Set(existing.map(dedupeKey));

  const candidates = queryPromptRows(dbPath);
  if (candidates.length === 0) {
    console.log("efficiency:backfill — no prompt rows found in analytics db");
    process.exit(0);
  }

  let imported = 0;
  let skipped = 0;
  const absolute = resolve(ROOT, promptsPath);

  for (const row of candidates) {
    const key = dedupeKey(row);
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }

    if (!dryRun) {
      mkdirSync(dirname(absolute), { recursive: true });
      appendFileSync(absolute, `${JSON.stringify(row)}\n`, "utf8");
    }
    existingKeys.add(key);
    imported += 1;
  }

  const mode = dryRun ? "dry-run" : "complete";
  console.log(
    `efficiency:backfill ${mode} — imported=${imported} skipped=${skipped} source=${dbPath}`,
  );
}

main();
