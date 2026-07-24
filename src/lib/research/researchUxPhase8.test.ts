import { describe, expect, it, beforeEach } from "vitest";

import {
  createLastModuleRecord,
  resolveRootRedirectTarget,
  shouldRedirectFromRoot,
} from "@/lib/app/lastModule";
import {
  DEFAULT_RESEARCH_DENSITY,
  readDefaultDensityPreference,
  RESEARCH_DEFAULT_DENSITY_KEY,
  writeDefaultDensityPreference,
} from "./defaultDensityPreference";
import { entryPolicyForPath, resolveEntryPolicyRootRedirect } from "./entryPolicy";
import { rootRedirectForDefaultDensity } from "./rootRedirect";

describe("defaultDensityPreference", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to Desk when unset", () => {
    expect(readDefaultDensityPreference()).toBe("Desk");
    expect(DEFAULT_RESEARCH_DENSITY).toBe("Desk");
  });

  it("round-trips Talk, Board, and Desk", () => {
    writeDefaultDensityPreference("Board");
    expect(window.localStorage.getItem(RESEARCH_DEFAULT_DENSITY_KEY)).toBe("Board");
    expect(readDefaultDensityPreference()).toBe("Board");

    writeDefaultDensityPreference("Talk");
    expect(readDefaultDensityPreference()).toBe("Talk");
  });

  it("ignores invalid stored values", () => {
    window.localStorage.setItem(RESEARCH_DEFAULT_DENSITY_KEY, "invalid");
    expect(readDefaultDensityPreference()).toBe("Desk");
  });
});

describe("rootRedirect", () => {
  it("maps densities to module routes", () => {
    expect(rootRedirectForDefaultDensity("Talk")).toBe("/copilot");
    expect(rootRedirectForDefaultDensity("Board")).toBe("/research");
    expect(rootRedirectForDefaultDensity("Desk")).toBe("/workspace");
  });
});

describe("research entry policy Phase 8", () => {
  it("aligns cold-start redirect with default density pref", () => {
    expect(resolveEntryPolicyRootRedirect("Board")).toBe("/research");
    expect(entryPolicyForPath("/")?.redirectBehavior).toContain("default density");
  });
});

describe("smart root redirect matrix", () => {
  const nowMs = Date.parse("2026-07-24T18:00:00.000Z");

  it("prefers recent lastModule over default density", () => {
    const raw = JSON.stringify(createLastModuleRecord("copilot", nowMs - 1000));
    expect(shouldRedirectFromRoot(raw, nowMs, "Desk")).toBe("/copilot");
  });

  it("uses Board pref on cold start", () => {
    expect(resolveRootRedirectTarget(null, nowMs, "Board")).toBe("/research");
  });

  it("uses Desk pref on cold start", () => {
    expect(resolveRootRedirectTarget(null, nowMs, "Desk")).toBe("/workspace");
  });
});
