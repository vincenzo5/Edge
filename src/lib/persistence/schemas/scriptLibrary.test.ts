import { describe, expect, it } from "vitest";

import { DEFAULT_SCRIPT_LIBRARY_STATE } from "@/lib/scriptLibrary/types";
import { scriptLibraryWriteSchema } from "@/lib/persistence/schemas/scriptLibrary";

describe("scriptLibrary schemas", () => {
  it("accepts an empty script library snapshot", () => {
    const parsed = scriptLibraryWriteSchema.safeParse({
      schemaVersion: 1,
      baseRevision: 0,
      scriptLibrarySnapshot: DEFAULT_SCRIPT_LIBRARY_STATE,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects snapshots with invalid version", () => {
    const parsed = scriptLibraryWriteSchema.safeParse({
      schemaVersion: 1,
      baseRevision: 0,
      scriptLibrarySnapshot: {
        version: 2,
        scripts: [],
      },
    });
    expect(parsed.success).toBe(false);
  });
});
