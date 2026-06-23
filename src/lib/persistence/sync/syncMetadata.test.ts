import { describe, expect, it } from "vitest";

import { isRemoteNewer } from "@/lib/persistence/sync/syncMetadata";

describe("syncMetadata", () => {
  it("treats missing local metadata as older than remote", () => {
    expect(isRemoteNewer(null, "2026-01-02T00:00:00.000Z", 1)).toBe(true);
  });

  it("prefers higher sync revision", () => {
    expect(
      isRemoteNewer(
        { syncRevision: 2, updatedAt: "2026-01-01T00:00:00.000Z" },
        "2026-01-01T00:00:00.000Z",
        3,
      ),
    ).toBe(true);
  });

  it("uses updatedAt when revisions match", () => {
    expect(
      isRemoteNewer(
        { syncRevision: 2, updatedAt: "2026-01-01T00:00:00.000Z" },
        "2026-01-02T00:00:00.000Z",
        2,
      ),
    ).toBe(true);
  });
});
