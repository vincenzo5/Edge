import { describe, expect, it } from "vitest";

import { DEFAULT_WATCHLIST_STATE } from "@/lib/watchlist/storage";
import { watchlistLibraryWriteSchema } from "@/lib/persistence/schemas/watchlistLibrary";

describe("watchlistLibrary schemas", () => {
  it("accepts the default watchlist state", () => {
    const parsed = watchlistLibraryWriteSchema.safeParse({
      schemaVersion: 1,
      baseRevision: 1,
      watchlistSnapshot: DEFAULT_WATCHLIST_STATE,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid active watchlist id", () => {
    const parsed = watchlistLibraryWriteSchema.safeParse({
      schemaVersion: 1,
      baseRevision: 1,
      watchlistSnapshot: {
        ...DEFAULT_WATCHLIST_STATE,
        activeWatchlistId: "missing-id",
      },
    });
    expect(parsed.success).toBe(false);
  });
});
