import { describe, expect, it, vi, afterEach } from "vitest";
import { getIbkrClientConfig } from "./client";

describe("ibkr client config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.IBKR_ENABLED;
    delete process.env.IBKR_SSL_VERIFY;
    delete process.env.IBKR_BASE_URL;
  });

  it("defaults sslVerify to true when IBKR_SSL_VERIFY is unset", () => {
    vi.stubEnv("IBKR_ENABLED", "true");
    const config = getIbkrClientConfig();
    expect(config?.sslVerify).toBe(true);
  });

  it("disables sslVerify only when IBKR_SSL_VERIFY=false", () => {
    vi.stubEnv("IBKR_ENABLED", "true");
    vi.stubEnv("IBKR_SSL_VERIFY", "false");
    const config = getIbkrClientConfig();
    expect(config?.sslVerify).toBe(false);
  });
});
