import { describe, expect, it, vi } from "vitest";

import {
  getProductionErrorRetentionDays,
  productionErrorRetentionCutoffMs,
} from "./productionErrorRetention";

describe("productionErrorRetention", () => {
  it("defaults to 30 days", () => {
    expect(getProductionErrorRetentionDays()).toBe(30);
  });

  it("reads EDGE_ERROR_RETENTION_DAYS when valid", () => {
    vi.stubEnv("EDGE_ERROR_RETENTION_DAYS", "14");
    expect(getProductionErrorRetentionDays()).toBe(14);
    vi.unstubAllEnvs();
  });

  it("falls back when EDGE_ERROR_RETENTION_DAYS is invalid", () => {
    vi.stubEnv("EDGE_ERROR_RETENTION_DAYS", "0");
    expect(getProductionErrorRetentionDays()).toBe(30);
    vi.unstubAllEnvs();
  });

  it("computes cutoff from retention days", () => {
    const now = 1_700_000_000_000;
    vi.stubEnv("EDGE_ERROR_RETENTION_DAYS", "7");
    const cutoff = productionErrorRetentionCutoffMs(now);
    expect(cutoff).toBe(now - 7 * 24 * 60 * 60 * 1000);
    vi.unstubAllEnvs();
  });
});
