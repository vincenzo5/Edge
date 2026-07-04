import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  getCurrentUser: vi.fn(async () => null),
  establishDevSession: vi.fn(async () => ({
    id: "user-1",
    email: "dev@localhost",
    displayName: "Dev User",
  })),
  isDevPassphraseRequired: vi.fn(() => false),
}));

vi.mock("@/db", () => ({
  isDatabaseConfigured: mocks.isDatabaseConfigured,
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/persistence/auth/devSession", () => ({
  establishDevSession: mocks.establishDevSession,
  isDevPassphraseRequired: mocks.isDevPassphraseRequired,
}));

import { withPersistenceAuth } from "./routeHelpers";

describe("withPersistenceAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDatabaseConfigured.mockReturnValue(true);
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.isDevPassphraseRequired.mockReturnValue(false);
    mocks.establishDevSession.mockResolvedValue({
      id: "user-1",
      email: "dev@localhost",
      displayName: "Dev User",
    });
  });

  it("bootstraps a dev session in route handlers when persistence is enabled", async () => {
    const result = await withPersistenceAuth(async (userId) => ({ userId }));

    expect(mocks.establishDevSession).toHaveBeenCalledWith({ bootstrap: true });
    expect(result).toEqual({ userId: "user-1" });
  });

  it("returns unauthorized when bootstrap cannot establish a session", async () => {
    mocks.establishDevSession.mockResolvedValue(null);

    const result = await withPersistenceAuth(async () => ({ ok: true }));

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("does not bootstrap when a dev passphrase is required", async () => {
    mocks.isDevPassphraseRequired.mockReturnValue(true);

    const result = await withPersistenceAuth(async () => ({ ok: true }));

    expect(mocks.establishDevSession).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("uses an existing session without bootstrapping", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "existing-user",
      email: "dev@localhost",
      displayName: "Dev User",
    });

    const result = await withPersistenceAuth(async (userId) => ({ userId }));

    expect(mocks.establishDevSession).not.toHaveBeenCalled();
    expect(result).toEqual({ userId: "existing-user" });
  });
});
