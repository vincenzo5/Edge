#!/usr/bin/env npx tsx

import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { isDatabaseConfigured } from "../src/db/index.ts";
import { ensureDevAppUser } from "../src/lib/persistence/repositories/appUserRepository.ts";
import {
  listProductionErrorEvents,
  normalizeProductionErrorListLimit,
} from "../src/lib/persistence/repositories/productionErrorRepository.ts";
import { purgeProductionErrorRetentionNow } from "../src/lib/observability/productionErrorPersist.ts";

const limitArgIndex = process.argv.indexOf("--limit");
const limit =
  limitArgIndex >= 0 && process.argv[limitArgIndex + 1]
    ? Number.parseInt(process.argv[limitArgIndex + 1]!, 10)
    : 50;

async function main(): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.error(
      "Production error report requires DATABASE_URL (Postgres). Local JSONL is non-prod only.",
    );
    process.exit(1);
  }

  await purgeProductionErrorRetentionNow();

  const userId = await ensureDevAppUser();
  const events = await listProductionErrorEvents(userId, {
    limit: normalizeProductionErrorListLimit(limit),
  });

  console.log(
    `Production errors (Postgres) — ${events.length} entr${events.length === 1 ? "y" : "ies"}`,
  );

  if (events.length === 0) {
    console.log("No entries.");
    return;
  }

  for (const event of events) {
    const when = new Date(event.at).toISOString();
    const refs = event.requestId ? ` requestId=${event.requestId}` : "";
    console.log(`\n[${when}] ${event.source}${refs}`);
    console.log(`message: ${event.message}`);
    if (event.detail) console.log(`detail: ${event.detail}`);
    if (event.stack) console.log(`stack: ${event.stack.split("\n")[0]}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
