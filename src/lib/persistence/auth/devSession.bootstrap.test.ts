import { describe, expect, it, vi, beforeEach } from "vitest";

const cookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: vi.fn(() => true),
  getDb: vi.fn(() => dbMocks),
}));

import { ensurePersistenceSession } from "./devSession";

describe("ensurePersistenceSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EDGE_AUTH_SECRET = "test-auth-secret";
    delete process.env.EDGE_DEV_PASSPHRASE;
    cookieStore.get.mockReturnValue(undefined);
    dbMocks.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => {
            throw new Error('Failed query: select from "app_users"');
          }),
        })),
      })),
    });
  });

  it("does not throw when persistence database is unavailable during bootstrap", async () => {
    await expect(ensurePersistenceSession()).resolves.toBeUndefined();
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});
