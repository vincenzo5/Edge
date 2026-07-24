import { beforeEach, describe, expect, it, vi } from "vitest";

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

import {
  establishDevSession,
  isDevPassphraseRequired,
  isOpenDevSessionAllowed,
  validateDevPassphrase,
} from "./devSession";

describe("devSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EDGE_AUTH_SECRET = "test-auth-secret";
    process.env.EDGE_ALLOW_OPEN_DEV_SESSION = "1";
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.EDGE_DEV_PASSPHRASE;

    dbMocks.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    });

    dbMocks.insert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [
          {
            id: "22222222-2222-2222-2222-222222222222",
            email: "dev@localhost",
            displayName: "Dev User",
          },
        ]),
      })),
    });
  });

  it("detects when passphrase is required", () => {
    expect(isDevPassphraseRequired()).toBe(false);
    process.env.EDGE_DEV_PASSPHRASE = "secret";
    expect(isDevPassphraseRequired()).toBe(true);
  });

  it("validates passphrase with timing-safe comparison", () => {
    process.env.EDGE_DEV_PASSPHRASE = "secret";
    expect(validateDevPassphrase("secret")).toBe(true);
    expect(validateDevPassphrase("wrong")).toBe(false);
  });

  it("bootstraps a dev session when open dev session is allowed", async () => {
    expect(isOpenDevSessionAllowed()).toBe(true);
    const user = await establishDevSession({ bootstrap: true });
    expect(user?.id).toBe("22222222-2222-2222-2222-222222222222");
    expect(cookieStore.set).toHaveBeenCalled();
  });

  it("rejects bootstrap when open dev session is not allowed", async () => {
    delete process.env.EDGE_ALLOW_OPEN_DEV_SESSION;
    expect(isOpenDevSessionAllowed()).toBe(false);
    const user = await establishDevSession({ bootstrap: true });
    expect(user).toBeNull();
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("rejects bootstrap in production even when open dev session env is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.EDGE_ALLOW_OPEN_DEV_SESSION = "1";
    expect(isOpenDevSessionAllowed()).toBe(false);
    const user = await establishDevSession({ bootstrap: true });
    expect(user).toBeNull();
  });

  it("rejects bootstrap when passphrase is required", async () => {
    process.env.EDGE_DEV_PASSPHRASE = "secret";
    const user = await establishDevSession({ bootstrap: true });
    expect(user).toBeNull();
  });

  it("creates a session when passphrase matches", async () => {
    process.env.EDGE_DEV_PASSPHRASE = "secret";
    const user = await establishDevSession({ passphrase: "secret" });
    expect(user?.id).toBe("22222222-2222-2222-2222-222222222222");
  });
});
