import { describe, it, expect } from "vitest";
import {
  CANONICAL_EVENT_REGISTRY,
  PRIORITY_ONE_MACRO_IDS,
  getCanonicalEvent,
  getRegistryByFamily,
} from "./registry";
import { priorityOneMacroProviderCoverage } from "./providerMappings";

describe("canonical event registry", () => {
  it("defines priority corporate and filing events", () => {
    expect(getCanonicalEvent("earnings")?.family).toBe("corporate");
    expect(getCanonicalEvent("sec_8k")?.family).toBe("filing");
    expect(getCanonicalEvent("sec_filing")?.family).toBe("filing");
  });

  it("defines all priority-one macro events with provider paths", () => {
    for (const id of PRIORITY_ONE_MACRO_IDS) {
      const def = getCanonicalEvent(id);
      expect(def, id).toBeDefined();
      expect(def!.providerPaths.length).toBeGreaterThan(0);
    }
  });

  it("has unique canonical ids", () => {
    const ids = CANONICAL_EVENT_REGISTRY.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("maps macro registry entries to FRED release patterns", () => {
    const macro = getRegistryByFamily("macro");
    expect(macro.length).toBeGreaterThan(0);
    for (const entry of macro) {
      expect(entry.fredReleasePatterns?.length).toBeGreaterThan(0);
    }
  });

  it("reports macro provider coverage includes economic calendar slot", () => {
    const coverage = priorityOneMacroProviderCoverage();
    for (const id of PRIORITY_ONE_MACRO_IDS) {
      expect(coverage[id]?.hasLiveProvider).toBe(true);
      expect(coverage[id]?.providers).toContain("fred");
      expect(coverage[id]?.providers).toContain("economic_calendar");
    }
  });
});
