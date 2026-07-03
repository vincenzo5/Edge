import { describe, expect, it, vi, afterEach } from "vitest";
import {
  EDGE_SIDECAR_SECRET_HEADER,
  readSidecarSecret,
  sidecarAuthHeaders,
} from "./sidecarAuth";

describe("sidecarAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when secret unset", () => {
    delete process.env.TWS_SIDECAR_SECRET;
    expect(readSidecarSecret()).toBeNull();
    expect(sidecarAuthHeaders({ Accept: "application/json" })).toEqual({
      Accept: "application/json",
    });
  });

  it("adds secret header when configured", () => {
    vi.stubEnv("TWS_SIDECAR_SECRET", "sidecar-secret");
    expect(readSidecarSecret()).toBe("sidecar-secret");
    expect(sidecarAuthHeaders()).toEqual({
      [EDGE_SIDECAR_SECRET_HEADER]: "sidecar-secret",
    });
  });
});
