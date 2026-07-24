import { describe, expect, it } from "vitest";
import {
  GOLDEN_SCRIPT_FIXTURE_REVISION,
  resolveScriptFixtureSource,
  scriptInstanceNameForFixture,
} from "@edge/chart-core";

describe("scriptFixtureCatalog", () => {
  it("resolves golden fixtures by scriptId and revision", () => {
    const resolved = resolveScriptFixtureSource("line-midpoint", GOLDEN_SCRIPT_FIXTURE_REVISION);
    expect(resolved?.source).toContain("edgeScript");
    expect(resolved?.defaultInputs?.period).toBe(20);
  });

  it("rejects unknown revision", () => {
    expect(resolveScriptFixtureSource("line-midpoint", "wrong-rev")).toBeNull();
  });

  it("maps stable instance names", () => {
    expect(scriptInstanceNameForFixture("band-boll-style")).toBe("__script_band_boll_style");
  });
});
