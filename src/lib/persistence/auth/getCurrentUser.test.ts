import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSignedUserCookieValue } from "./devSessionCookie";

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

import { getCurrentUser } from "./getCurrentUser";

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EDGE_AUTH_SECRET = "test-auth-secret";

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

  it("resolves a valid signed cookie without creating a new user", async () => {
    const userId = "11111111-1111-1111-1111-111111111111";
    cookieStore.get.mockReturnValue({
      value: createSignedUserCookieValue(userId),
    });

    dbMocks.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            {
              id: userId,
              email: "dev@localhost",
              displayName: "Dev User",
            },
          ]),
        })),
      })),
    });

    const user = await getCurrentUser();

    expect(user?.id).toBe(userId);
    expect(dbMocks.insert).not.toHaveBeenCalled();
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("ignores unsigned cookies and creates a signed dev user", async () => {
    cookieStore.get.mockReturnValue({
      value: "11111111-1111-1111-1111-111111111111",
    });

    const user = await getCurrentUser();

    expect(user?.id).toBe("22222222-2222-2222-2222-222222222222");
    expect(cookieStore.set).toHaveBeenCalledWith(
      "edge-user-id",
      expect.stringContaining("22222222-2222-2222-2222-222222222222."),
      expect.objectContaining({ httpOnly: true }),
    );
  });
});
