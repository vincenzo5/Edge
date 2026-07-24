import { afterEach, describe, expect, it, vi } from "vitest";

import type { TradingAuditEntry } from "./auditLog";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  ensureDevAppUser: vi.fn(async () => "user-1"),
  insertTradingAuditEvent: vi.fn(async () => ({
    id: "evt-1",
    at: 1,
    action: "submit",
    outcome: "success",
  })),
  purgeTradingAuditEventsOlderThan: vi.fn(async () => 0),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/repositories/appUserRepository", () => ({
  ensureDevAppUser: mocks.ensureDevAppUser,
}));

vi.mock("@/lib/persistence/repositories/tradingAuditRepository", () => ({
  insertTradingAuditEvent: mocks.insertTradingAuditEvent,
  purgeTradingAuditEventsOlderThan: mocks.purgeTradingAuditEventsOlderThan,
}));

describe("tradingAuditPersist", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("no-ops when DATABASE_URL is unset", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    const { persistTradingAudit } = await import("./tradingAuditPersist");
    await persistTradingAudit({
      at: Date.now(),
      action: "preview",
      outcome: "success",
      accountId: "DUP586813",
    });
    expect(mocks.insertTradingAuditEvent).not.toHaveBeenCalled();
  });

  it("redacts detail and omits accountId from durable insert", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    const { persistTradingAudit } = await import("./tradingAuditPersist");
    const entry: TradingAuditEntry = {
      at: 1_700_000_000_000,
      action: "blocked",
      outcome: "blocked",
      accountId: "DUP586813",
      intentId: "intent-1",
      detail: "account DUP586813 blocked",
    };
    await persistTradingAudit(entry);

    expect(mocks.insertTradingAuditEvent).toHaveBeenCalledTimes(1);
    const [, persisted] = mocks.insertTradingAuditEvent.mock.calls[0]!;
    expect(persisted).not.toHaveProperty("accountId");
    expect(persisted.detail).not.toContain("DUP586813");
    expect(persisted.detail).toContain("[REDACTED]");
  });
});
