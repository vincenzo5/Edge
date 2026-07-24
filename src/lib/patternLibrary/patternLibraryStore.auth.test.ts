import { describe, expect, it, vi, afterEach } from "vitest";

import { resolvePatternLibraryStoreForRequest } from "./patternLibraryStore";

vi.mock("@/db", () => ({
  isDatabaseConfigured: () => true,
}));

vi.mock("@/lib/persistence/auth/getCurrentUser", () => ({
  getCurrentUser: vi.fn(async () => null),
}));

describe("resolvePatternLibraryStoreForRequest", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requires auth when Postgres is configured and user is missing", async () => {
    await expect(resolvePatternLibraryStoreForRequest()).rejects.toMatchObject({
      name: "PatternLibraryAuthRequiredError",
    });
  });
});
