import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvConfigSource } from "./envConfigSource";

describe("EnvConfigSource", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns trimmed value for set keys", () => {
    vi.stubEnv("FMP_API_KEY", "  secret-key  ");
    const source = new EnvConfigSource();
    expect(source.get("FMP_API_KEY")).toBe("secret-key");
    expect(source.isSet("FMP_API_KEY")).toBe(true);
  });

  it("returns undefined for empty or whitespace-only values", () => {
    vi.stubEnv("FMP_API_KEY", "   ");
    const source = new EnvConfigSource();
    expect(source.get("FMP_API_KEY")).toBeUndefined();
    expect(source.isSet("FMP_API_KEY")).toBe(false);
  });

  it("returns undefined for missing keys", () => {
    const source = new EnvConfigSource();
    expect(source.get("MISSING_KEY")).toBeUndefined();
    expect(source.isSet("MISSING_KEY")).toBe(false);
  });

  it("reads TWS_SIDECAR_SECRET via static env binding", () => {
    vi.stubEnv("TWS_SIDECAR_SECRET", "  sidecar-secret  ");
    const source = new EnvConfigSource();
    expect(source.get("TWS_SIDECAR_SECRET")).toBe("sidecar-secret");
    expect(source.isSet("TWS_SIDECAR_SECRET")).toBe(true);
  });
});
