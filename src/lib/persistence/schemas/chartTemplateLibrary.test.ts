import { describe, expect, it } from "vitest";

import { chartTemplateLibraryWriteSchema } from "@/lib/persistence/schemas/chartTemplateLibrary";

describe("chartTemplateLibrary schemas", () => {
  it("accepts an empty template snapshot", () => {
    const parsed = chartTemplateLibraryWriteSchema.safeParse({
      schemaVersion: 1,
      baseRevision: 0,
      templateSnapshot: {
        version: 1,
        presets: [],
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid preset kind", () => {
    const parsed = chartTemplateLibraryWriteSchema.safeParse({
      schemaVersion: 1,
      baseRevision: 0,
      templateSnapshot: {
        version: 1,
        presets: [
          {
            version: 1,
            id: "preset-1",
            name: "Broken",
            createdAt: Date.now(),
            kind: "broken",
            payload: {},
          },
        ],
      },
    });
    expect(parsed.success).toBe(false);
  });
});
