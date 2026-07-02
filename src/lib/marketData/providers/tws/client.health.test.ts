import { describe, expect, it, vi } from "vitest";
import { isStaleTwsSidecarHealth } from "./client";

describe("isStaleTwsSidecarHealth", () => {
  it("returns true when controlRecovery capability is missing", () => {
    expect(
      isStaleTwsSidecarHealth({
        ok: true,
        version: "0.1.0",
        capabilities: { controlReconnect: true },
      }),
    ).toBe(true);
  });

  it("returns false for current-source health payload", () => {
    expect(
      isStaleTwsSidecarHealth({
        ok: true,
        version: "0.2.0",
        capabilities: { controlRecovery: true, streamQuotes: true },
      }),
    ).toBe(false);
  });
});
