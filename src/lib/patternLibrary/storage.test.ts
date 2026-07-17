import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createDefaultTaxonomy } from "./taxonomy";
import { loadTaxonomy } from "./storage";

describe("patternLibrary storage", () => {
  it("loads taxonomy from custom path", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "pattern-lib-"));
    try {
      const taxonomyPath = path.join(tempDir, "taxonomy.json");
      writeFileSync(taxonomyPath, JSON.stringify(createDefaultTaxonomy()), "utf8");
      const loaded = loadTaxonomy(taxonomyPath);
      expect(loaded.setupFamilies.length).toBe(7);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
