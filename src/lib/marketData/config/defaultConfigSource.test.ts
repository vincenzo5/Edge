import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfigSource, setConfigSourceForTests } from "./defaultConfigSource";
import { MapConfigSource } from "./mapConfigSource";

describe("defaultConfigSource", () => {
  afterEach(() => {
    setConfigSourceForTests(null);
    vi.unstubAllEnvs();
  });

  it("defaults to EnvConfigSource", () => {
    vi.stubEnv("FRED_API_KEY", "fred-key");
    expect(getConfigSource().get("FRED_API_KEY")).toBe("fred-key");
  });

  it("allows test override", () => {
    setConfigSourceForTests(
      new MapConfigSource({ MASSIVE_API_KEY: "test-massive" }),
    );
    expect(getConfigSource().get("MASSIVE_API_KEY")).toBe("test-massive");
  });

  it("restores env default when override cleared", () => {
    setConfigSourceForTests(new MapConfigSource({ MASSIVE_API_KEY: "test" }));
    setConfigSourceForTests(null);
    vi.stubEnv("MASSIVE_API_KEY", "env-massive");
    expect(getConfigSource().get("MASSIVE_API_KEY")).toBe("env-massive");
  });
});
