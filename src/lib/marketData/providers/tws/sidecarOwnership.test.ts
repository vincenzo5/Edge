import { describe, expect, it } from "vitest";
import { checkSidecarOwnership } from "./sidecarOwnership";

describe("checkSidecarOwnership", () => {
  it("allows standalone sidecar when nothing spawned yet", () => {
    expect(
      checkSidecarOwnership(
        { ok: true, managedBy: "standalone", instanceId: "abc" },
        null,
      ).foreign,
    ).toBe(false);
  });

  it("flags foreign edge-local when nothing spawned yet", () => {
    const result = checkSidecarOwnership(
      { ok: true, managedBy: "edge-local", instanceId: "other" },
      null,
    );
    expect(result.foreign).toBe(true);
    expect(result.reason).toMatch(/another Edge dev instance/i);
  });

  it("allows owned edge-local instance", () => {
    expect(
      checkSidecarOwnership(
        { ok: true, managedBy: "edge-local", instanceId: "mine" },
        "mine",
      ).foreign,
    ).toBe(false);
  });
});
