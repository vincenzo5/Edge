import { describe, expect, it } from "vitest";
import {
  journalDashboardSectionGridClass,
  journalHeroCardSpanClass,
  journalSummaryGridClass,
  resolveTileDensityMode,
} from "./tileDensity";

describe("resolveTileDensityMode", () => {
  it("classifies compact below 520", () => {
    expect(resolveTileDensityMode(519)).toBe("compact");
    expect(resolveTileDensityMode(400)).toBe("compact");
  });

  it("classifies standard between 520 and 899", () => {
    expect(resolveTileDensityMode(520)).toBe("standard");
    expect(resolveTileDensityMode(750)).toBe("standard");
    expect(resolveTileDensityMode(899)).toBe("standard");
  });

  it("classifies wide at 900 and above", () => {
    expect(resolveTileDensityMode(900)).toBe("wide");
    expect(resolveTileDensityMode(1440)).toBe("wide");
  });

  it("applies hysteresis when shrinking from wide", () => {
    expect(resolveTileDensityMode(876, "wide")).toBe("wide");
    expect(resolveTileDensityMode(875, "wide")).toBe("standard");
  });

  it("applies hysteresis when growing from compact", () => {
    expect(resolveTileDensityMode(544, "compact")).toBe("standard");
    expect(resolveTileDensityMode(543, "compact")).toBe("compact");
  });
});

describe("journal density grid helpers", () => {
  it("uses single column summary grid in compact mode", () => {
    expect(journalSummaryGridClass("compact")).toContain("grid-cols-1");
    expect(journalHeroCardSpanClass("compact")).toBe("");
  });

  it("uses two-column summary grid without hero span in standard mode", () => {
    expect(journalSummaryGridClass("standard")).toContain("grid-cols-2");
    expect(journalHeroCardSpanClass("standard")).toBe("");
  });

  it("uses two-column dashboard sections only in wide mode", () => {
    expect(journalDashboardSectionGridClass("compact", "min-h-96")).not.toContain("lg:grid-cols-2");
    expect(journalDashboardSectionGridClass("wide", "min-h-96")).toContain("lg:grid-cols-2");
  });
});
