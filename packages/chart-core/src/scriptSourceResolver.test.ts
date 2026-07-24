import { describe, expect, it } from "vitest";
import { resolveScriptFixtureSource } from "./scriptFixtureCatalog";
import { resolveScriptSource } from "./scriptSourceResolver";
import { SCRIPT_FIXTURES } from "./scriptFixtures";

describe("resolveScriptSource", () => {
  it("falls back to golden fixtures when resolver misses", () => {
    const resolved = resolveScriptSource("line-midpoint", "golden-v1", () => null);
    expect(resolved?.source).toBe(SCRIPT_FIXTURES["line-midpoint"].source);
  });

  it("prefers injected resolver over fixtures", () => {
    const resolved = resolveScriptSource("line-midpoint", "golden-v1", () => ({
      scriptId: "line-midpoint",
      revision: "golden-v1",
      source: "custom-source",
      defaultInputs: { period: 5 },
      displayName: "Custom",
      pane: "main",
    }));
    expect(resolved?.source).toBe("custom-source");
    expect(resolveScriptFixtureSource("line-midpoint", "golden-v1")?.source).not.toBe("custom-source");
  });
});
