import { describe, expect, it } from "vitest";

import { screenerLibraryWriteSchema } from "./screenerLibrary";
import { DEFAULT_SCREENER_STATE } from "@/lib/screener/screenStorage";

describe("screenerLibraryWriteSchema", () => {
  it("accepts a valid screener snapshot write", () => {
    const parsed = screenerLibraryWriteSchema.safeParse({
      schemaVersion: 1,
      baseRevision: 0,
      screenerSnapshot: DEFAULT_SCREENER_STATE,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects activeScreenId that does not exist in savedScreens", () => {
    const parsed = screenerLibraryWriteSchema.safeParse({
      schemaVersion: 1,
      baseRevision: 0,
      screenerSnapshot: {
        ...DEFAULT_SCREENER_STATE,
        activeScreenId: "missing",
      },
    });
    expect(parsed.success).toBe(false);
  });
});
