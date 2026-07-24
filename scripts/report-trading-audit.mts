#!/usr/bin/env npx tsx

import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { isDatabaseConfigured } from "../src/db/index.ts";
import { ensureDevAppUser } from "../src/lib/persistence/repositories/appUserRepository.ts";
import {
  listTradingAuditEvents,
  normalizeTradingAuditListLimit,
} from "../src/lib/persistence/repositories/tradingAuditRepository.ts";
import { purgeTradingAuditRetentionNow } from "../src/lib/trading/tradingAuditPersist.ts";

const limitArgIndex = process.argv.indexOf("--limit");
const limit =
  limitArgIndex >= 0 && process.argv[limitArgIndex + 1]
    ? Number.parseInt(process.argv[limitArgIndex + 1]!, 10)
    : 50;

async function main(): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.error(
      "Trading audit report requires DATABASE_URL (Postgres). In-memory ring is process-local only.",
    );
    process.exit(1);
  }

  await purgeTradingAuditRetentionNow();

  const userId = await ensureDevAppUser();
  const events = await listTradingAuditEvents(userId, {
    limit: normalizeTradingAuditListLimit(limit),
  });

  console.log(
    `Trading audit (Postgres) — ${events.length} entr${events.length === 1 ? "y" : "ies"}`,
  );

  if (events.length === 0) {
    console.log("No entries.");
    return;
  }

  for (const event of events) {
    const when = new Date(event.at).toISOString();
    const refs = [
      event.intentId ? `intent=${event.intentId}` : null,
      event.orderRef ? `orderRef=${event.orderRef}` : null,
      event.requestId ? `requestId=${event.requestId}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    console.log(`\n[${when}] ${event.action} ${event.outcome}${refs ? ` ${refs}` : ""}`);
    if (event.detail) console.log(`detail: ${event.detail}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
