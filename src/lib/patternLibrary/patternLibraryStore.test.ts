import { describe, expect, it } from "vitest";

import { createPatternLibraryStore } from "./patternLibraryStore";

describe("patternLibraryStore", () => {
  it("uses filesystem backend when no user id is provided", async () => {
    const store = createPatternLibraryStore(null);
    const taxonomy = await store.loadTaxonomy();
    expect(taxonomy.setupFamilies.length).toBeGreaterThan(0);
  });

  it("uses filesystem backend when database is unavailable", async () => {
    const store = createPatternLibraryStore("00000000-0000-4000-8000-000000000001");
    const taxonomy = await store.loadTaxonomy();
    expect(taxonomy.setupFamilies.length).toBeGreaterThan(0);
  });
});
