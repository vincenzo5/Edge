import { describe, expect, it } from "vitest";
import { createScriptIndicatorInstance } from "@/lib/chartConfig";

describe("createScriptIndicatorInstance", () => {
  it("creates additive script identity fields", () => {
    const instance = createScriptIndicatorInstance({
      scriptId: "line-midpoint",
      revision: "golden-v1",
      name: "__script_line_midpoint",
      pane: "main",
      inputs: { period: 20 },
    });
    expect(instance.kind).toBe("script");
    expect(instance.scriptId).toBe("line-midpoint");
    expect(instance.revision).toBe("golden-v1");
    expect(instance.id.length).toBeGreaterThan(0);
  });
});
