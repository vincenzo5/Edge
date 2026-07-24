import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const getCurrentUser = vi.fn();
const ensureDevAppUser = vi.fn(async () => "dev-user-id");

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: () => getCurrentUser(),
}));

vi.mock("@/lib/persistence/repositories/appUserRepository", () => ({
  ensureDevAppUser: () => ensureDevAppUser(),
}));

import { readCronSecret, resolveCronUserId } from "./cronAuth";

function cronRequest(init?: RequestInit): Request {
  return new Request("http://localhost/api/cron/brokerage-ingest", init);
}

describe("cronAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.EDGE_CRON_SECRET;
    delete process.env.EDGE_API_AUTH_MODE;
    vi.stubEnv("NODE_ENV", "development");
    getCurrentUser.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads cron secret from header or bearer token", () => {
    expect(
      readCronSecret(
        cronRequest({ headers: { "x-edge-cron-secret": "secret-1" } }),
      ),
    ).toBe("secret-1");
    expect(
      readCronSecret(
        cronRequest({ headers: { authorization: "Bearer secret-2" } }),
      ),
    ).toBe("secret-2");
  });

  it("returns dev app user when cron secret matches", async () => {
    process.env.EDGE_CRON_SECRET = "secret-1";
    const userId = await resolveCronUserId(
      cronRequest({ headers: { "x-edge-cron-secret": "secret-1" } }),
    );
    expect(userId).toBe("dev-user-id");
    expect(ensureDevAppUser).toHaveBeenCalled();
  });

  it("returns session user without cron secret", async () => {
    getCurrentUser.mockResolvedValue({
      id: "session-user",
      email: "dev@localhost",
      displayName: "Dev",
    });
    const userId = await resolveCronUserId(cronRequest());
    expect(userId).toBe("session-user");
    expect(ensureDevAppUser).not.toHaveBeenCalled();
  });

  it("rejects anonymous cron when secret is unset", async () => {
    const userId = await resolveCronUserId(cronRequest());
    expect(userId).toBeNull();
    expect(ensureDevAppUser).not.toHaveBeenCalled();
  });

  it("rejects anonymous cron in dev-open mode without secret", async () => {
    vi.stubEnv("EDGE_API_AUTH_MODE", "dev-open");
    const userId = await resolveCronUserId(cronRequest());
    expect(userId).toBeNull();
    expect(ensureDevAppUser).not.toHaveBeenCalled();
  });

  it("rejects wrong cron secret without session", async () => {
    process.env.EDGE_CRON_SECRET = "secret-1";
    const userId = await resolveCronUserId(
      cronRequest({ headers: { "x-edge-cron-secret": "wrong" } }),
    );
    expect(userId).toBeNull();
  });
});
