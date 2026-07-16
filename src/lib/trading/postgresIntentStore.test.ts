import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { getDb, isDatabaseConfigured } from "@/db";
import { orderIntents } from "@/db/schema";
import { ensureDevAppUser } from "@/lib/persistence/repositories/appUserRepository";
import { createPostgresIntentStoreIfConfigured } from "./postgresIntentStore";
import { resetServerIntentStoreForTests } from "./intentStore";

const baseDraft = {
  accountId: "DUP586813",
  symbol: "AAPL",
  side: "BUY" as const,
  quantity: 1,
  orderType: "LMT" as const,
  limitPrice: 1,
  tif: "DAY" as const,
  environment: "paper" as const,
};

describe("postgresIntentStore", () => {
  afterEach(() => {
    resetServerIntentStoreForTests();
  });

  it("persists intents and dedupes by idempotency key", async () => {
    if (!isDatabaseConfigured()) return;

    const userId = await ensureDevAppUser();
    const db = getDb();
    await db.delete(orderIntents).where(eq(orderIntents.userId, userId));

    const store = await createPostgresIntentStoreIfConfigured();
    const first = await store.createIntent(baseDraft, "pg-key-1");
    const second = await store.createIntent(baseDraft, "pg-key-1");
    expect(second.intentId).toBe(first.intentId);

    const loaded = await store.getByIdempotencyKey("pg-key-1");
    expect(loaded?.orderRef).toBe(first.orderRef);
  });
});
