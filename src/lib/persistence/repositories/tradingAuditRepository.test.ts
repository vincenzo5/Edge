import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { getDb, isDatabaseConfigured } from "@/db";
import { tradingAuditEvents } from "@/db/schema";
import { ensureDevAppUser } from "@/lib/persistence/repositories/appUserRepository";
import {
  insertTradingAuditEvent,
  listTradingAuditEvents,
  purgeTradingAuditEventsOlderThan,
} from "@/lib/persistence/repositories/tradingAuditRepository";

describe("tradingAuditRepository", () => {
  afterEach(async () => {
    if (!isDatabaseConfigured()) return;
    const userId = await ensureDevAppUser();
    await getDb().delete(tradingAuditEvents).where(eq(tradingAuditEvents.userId, userId));
  });

  it("inserts and lists newest-first events", async () => {
    if (!isDatabaseConfigured()) return;

    const userId = await ensureDevAppUser();
    await insertTradingAuditEvent(userId, {
      at: 100,
      action: "preview",
      outcome: "success",
      intentId: "intent-a",
    });
    await insertTradingAuditEvent(userId, {
      at: 200,
      action: "submit",
      outcome: "success",
      intentId: "intent-b",
      orderRef: "edge-intent-intent-b",
    });

    const events = await listTradingAuditEvents(userId, { limit: 10 });
    expect(events).toHaveLength(2);
    expect(events[0]?.action).toBe("submit");
    expect(events[1]?.action).toBe("preview");
  });

  it("purges rows older than cutoff", async () => {
    if (!isDatabaseConfigured()) return;

    const userId = await ensureDevAppUser();
    await insertTradingAuditEvent(userId, {
      at: 100,
      action: "failed",
      outcome: "failed",
      detail: "old",
    });
    await insertTradingAuditEvent(userId, {
      at: 500,
      action: "cancel",
      outcome: "success",
    });

    const removed = await purgeTradingAuditEventsOlderThan(300);
    expect(removed).toBe(1);

    const remaining = await listTradingAuditEvents(userId, { limit: 10 });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.action).toBe("cancel");
  });
});
