import { describe, expect, it } from "vitest";
import {
  createDefaultTaxonomy,
  getSetupFamily,
  validateRecordFamily,
} from "./taxonomy";
import { patternTaxonomySchema } from "./types";

describe("patternLibrary taxonomy", () => {
  it("creates default taxonomy with setup families including unclassified", () => {
    const taxonomy = createDefaultTaxonomy("trader-1");
    expect(taxonomy.setupFamilies.length).toBe(7);
    expect(taxonomy.traderId).toBe("trader-1");
    expect(patternTaxonomySchema.safeParse(taxonomy).success).toBe(true);
  });

  it("resolves setup family by id", () => {
    const taxonomy = createDefaultTaxonomy();
    const family = getSetupFamily(taxonomy, "breakout_retest");
    expect(family?.name).toBe("Breakout retest");
    expect(family?.nearMisses.length).toBeGreaterThan(0);
  });

  it("validates record family ids against taxonomy", () => {
    const taxonomy = createDefaultTaxonomy();
    expect(validateRecordFamily(taxonomy, "pullback_in_trend")).toBe(true);
    expect(validateRecordFamily(taxonomy, "unknown_family")).toBe(false);
  });

  it("includes production gate metrics", () => {
    const taxonomy = createDefaultTaxonomy();
    expect(taxonomy.successMetrics.longShortGapMaxPp).toBe(10);
    expect(taxonomy.successMetrics.directionWilsonLowerMin).toBe(0.5);
  });
});
