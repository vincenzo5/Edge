import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { getDb, isDatabaseConfigured } from "@/db";
import { productionErrorEvents } from "@/db/schema";
import { ensureDevAppUser } from "@/lib/persistence/repositories/appUserRepository";
import {
  insertProductionErrorEvent,
  listProductionErrorEvents,
  purgeProductionErrorEventsOlderThan,
} from "@/lib/persistence/repositories/productionErrorRepository";

describe("productionErrorRepository", () => {
  afterEach(async () => {
    if (!isDatabaseConfigured()) return;
    const userId = await ensureDevAppUser();
    await getDb().delete(productionErrorEvents).where(eq(productionErrorEvents.userId, userId));
  });

  it("inserts and lists newest-first events", async () => {
    if (!isDatabaseConfigured()) return;

    const userId = await ensureDevAppUser();
    await insertProductionErrorEvent(userId, {
      at: 100,
      source: "api",
      message: "older error",
    });
    await insertProductionErrorEvent(userId, {
      at: 200,
      source: "chart",
      message: "newer error",
      requestId: "req-1",
    });

    const events = await listProductionErrorEvents(userId, { limit: 10 });
    expect(events).toHaveLength(2);
    expect(events[0]?.source).toBe("chart");
    expect(events[1]?.source).toBe("api");
  });

  it("purges rows older than cutoff", async () => {
    if (!isDatabaseConfigured()) return;

    const userId = await ensureDevAppUser();
    await insertProductionErrorEvent(userId, {
      at: 100,
      source: "api",
      message: "old",
    });
    await insertProductionErrorEvent(userId, {
      at: 500,
      source: "window",
      message: "recent",
    });

    const removed = await purgeProductionErrorEventsOlderThan(300);
    expect(removed).toBe(1);

    const remaining = await listProductionErrorEvents(userId, { limit: 10 });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.source).toBe("window");
  });
});
