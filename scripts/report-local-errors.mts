#!/usr/bin/env npx tsx

import {
  LOCAL_ERROR_LOG_RELATIVE_PATH,
  readLocalErrorLog,
} from "../src/lib/observability/localErrorLogStore.ts";

const limitArgIndex = process.argv.indexOf("--limit");
const limit =
  limitArgIndex >= 0 && process.argv[limitArgIndex + 1]
    ? Number.parseInt(process.argv[limitArgIndex + 1]!, 10)
    : 50;

const entries = readLocalErrorLog(Number.isFinite(limit) ? limit : 50);

console.log(`Local error log (${LOCAL_ERROR_LOG_RELATIVE_PATH}) — ${entries.length} entr${entries.length === 1 ? "y" : "ies"}`);

if (entries.length === 0) {
  console.log("No entries.");
  process.exit(0);
}

for (const entry of entries) {
  const when = new Date(entry.at).toISOString();
  console.log(`\n[${when}] ${entry.source}`);
  console.log(entry.message);
  if (entry.detail) console.log(`detail: ${entry.detail}`);
  if (entry.stack) console.log(entry.stack);
}
