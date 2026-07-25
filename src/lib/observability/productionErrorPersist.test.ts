import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProductionErrorPersistInput } from "./productionErrorPersist";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  ensureDevAppUser: vi.fn(async () => "user-1"),
  insertProductionErrorEvent: vi.fn(async () => ({
    id: "evt-1",
    at: 1,
    source: "api",
    message: "failed",
  })),
  purgeProductionErrorEventsOlderThan: vi.fn(async () => 0),
  getRequestId: vi.fn(() => "req-from-als"),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/repositories/appUserRepository", () => ({
  ensureDevAppUser: mocks.ensureDevAppUser,
}));

vi.mock("@/lib/persistence/repositories/productionErrorRepository", () => ({
  insertProductionErrorEvent: mocks.insertProductionErrorEvent,
  purgeProductionErrorEventsOlderThan: mocks.purgeProductionErrorEventsOlderThan,
}));

vi.mock("./requestIdContext", () => ({
  getRequestId: mocks.getRequestId,
}));

describe("productionErrorPersist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDatabaseConfigured.mockReturnValue(true);
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("no-ops when DATABASE_URL is unset", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(false);
    const { persistProductionError } = await import("./productionErrorPersist");
    await persistProductionError({
      source: "api",
      message: "Request failed",
    });
    expect(mocks.insertProductionErrorEvent).not.toHaveBeenCalled();
  });

  it("redacts fields and attaches requestId from ALS", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    const { persistProductionError } = await import("./productionErrorPersist");
    const input: ProductionErrorPersistInput = {
      source: "api",
      message: "accountId=DU123456 failed Bearer abc.def.ghi",
      stack: "Error: boom\nBearer secret.token.here",
      detail: "token=sk-live-123",
    };
    await persistProductionError(input);

    expect(mocks.insertProductionErrorEvent).toHaveBeenCalledTimes(1);
    const [userId, persisted] = mocks.insertProductionErrorEvent.mock.calls[0]!;
    expect(userId).toBe("user-1");
    expect(persisted.message).not.toMatch(/DU123456/);
    expect(persisted.stack).not.toMatch(/Bearer secret/);
    expect(persisted.detail).not.toMatch(/sk-live/);
    expect(persisted.requestId).toBe("req-from-als");
  });

  it("uses explicit userId for client ingest", async () => {
    mocks.isDatabaseConfigured.mockReturnValue(true);
    const { persistProductionError } = await import("./productionErrorPersist");
    await persistProductionError(
      { source: "window", message: "Unhandled rejection" },
      { userId: "session-user" },
    );

    expect(mocks.ensureDevAppUser).not.toHaveBeenCalled();
    expect(mocks.insertProductionErrorEvent).toHaveBeenCalledWith(
      "session-user",
      expect.objectContaining({ source: "window" }),
    );
  });
});
