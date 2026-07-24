import { describe, expect, it, vi, afterEach } from "vitest";
import {
  EDGE_SIDECAR_SECRET_HEADER,
  SidecarAuthConfigurationError,
  assertSidecarAuthConfigured,
  isSidecarUrlLoopback,
  readSidecarSecret,
  resolveSidecarUrl,
  sidecarAuthHeaders,
} from "./sidecarAuth";

describe("sidecarAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.TWS_SIDECAR_URL;
    delete process.env.TWS_SIDECAR_SECRET;
  });

  it("returns null when secret unset", () => {
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

  it("treats loopback sidecar URLs as local-only", () => {
    expect(isSidecarUrlLoopback("http://127.0.0.1:8765")).toBe(true);
    expect(isSidecarUrlLoopback("http://localhost:8765")).toBe(true);
    expect(isSidecarUrlLoopback("http://[::1]:8765")).toBe(true);
    expect(isSidecarUrlLoopback("http://192.168.1.10:8765")).toBe(false);
  });

  it("allows loopback URL without secret", () => {
    expect(() => assertSidecarAuthConfigured("http://127.0.0.1:8765")).not.toThrow();
  });

  it("requires secret for non-loopback sidecar URL", () => {
    expect(() => assertSidecarAuthConfigured("http://192.168.1.10:8765")).toThrow(
      SidecarAuthConfigurationError,
    );
    vi.stubEnv("TWS_SIDECAR_SECRET", "remote-secret");
    expect(() => assertSidecarAuthConfigured("http://192.168.1.10:8765")).not.toThrow();
  });

  it("resolves sidecar URL from env with trailing slash stripped", () => {
    vi.stubEnv("TWS_SIDECAR_URL", "http://127.0.0.1:8765/");
    expect(resolveSidecarUrl()).toBe("http://127.0.0.1:8765");
  });
});
