import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getTradingAuditRetentionDays,
  tradingAuditRetentionCutoffMs,
} from "./tradingAuditRetention";

describe("tradingAuditRetention", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to 90 days", () => {
    expect(getTradingAuditRetentionDays()).toBe(90);
  });

  it("honors EDGE_AUDIT_RETENTION_DAYS when valid", () => {
    vi.stubEnv("EDGE_AUDIT_RETENTION_DAYS", "30");
    expect(getTradingAuditRetentionDays()).toBe(30);
  });

  it("computes cutoff from retention days", () => {
    const now = 1_700_000_000_000;
    const cutoff = tradingAuditRetentionCutoffMs(now);
    expect(cutoff).toBe(now - 90 * 24 * 60 * 60 * 1000);
  });
});
