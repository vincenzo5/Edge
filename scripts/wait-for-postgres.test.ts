import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PostgresWaitConfigError,
  PostgresWaitTimeoutError,
  waitForPostgres,
} from "./wait-for-postgres.mts";

describe("waitForPostgres", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws when DATABASE_URL is missing", async () => {
    await expect(
      waitForPostgres({ databaseUrl: "", connect: vi.fn(async () => {}) }),
    ).rejects.toBeInstanceOf(PostgresWaitConfigError);
  });

  it("resolves when connect succeeds on first attempt", async () => {
    const connect = vi.fn(async () => {});

    await expect(
      waitForPostgres({
        databaseUrl: "postgres://tvai:tvai@localhost:5432/tvai",
        connect,
      }),
    ).resolves.toBeUndefined();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("retries until connect succeeds", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const connect = vi.fn(async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("connection refused");
      }
    });

    const promise = waitForPostgres({
      databaseUrl: "postgres://tvai:tvai@localhost:5432/tvai",
      timeoutMs: 5_000,
      intervalMs: 100,
      connect,
    });

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
    expect(connect).toHaveBeenCalledTimes(3);
  });

  it("throws after timeout when connect never succeeds", async () => {
    vi.useFakeTimers();
    const connect = vi.fn(async () => {
      throw new Error("connection refused");
    });

    const promise = waitForPostgres({
      databaseUrl: "postgres://tvai:tvai@localhost:5432/tvai",
      timeoutMs: 300,
      intervalMs: 100,
      connect,
    });

    const expectation = expect(promise).rejects.toBeInstanceOf(PostgresWaitTimeoutError);
    await vi.runAllTimersAsync();
    await expectation;
    expect(connect.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
