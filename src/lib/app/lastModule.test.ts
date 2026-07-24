import { describe, expect, it } from "vitest";
import {
  createLastModuleRecord,
  isLastModuleRecent,
  LAST_MODULE_TTL_MS,
  readLastModuleRecord,
  resolveRootRedirectTarget,
  shouldRedirectFromRoot,
} from "./lastModule";

describe("lastModule", () => {
  const nowMs = Date.parse("2026-07-05T12:00:00.000Z");

  describe("readLastModuleRecord", () => {
    it("parses valid records", () => {
      const raw = JSON.stringify(createLastModuleRecord("chart", nowMs));
      expect(readLastModuleRecord(raw)).toEqual({
        module: "chart",
        updatedAt: "2026-07-05T12:00:00.000Z",
      });
    });

    it("rejects invalid payloads", () => {
      expect(readLastModuleRecord(null)).toBeNull();
      expect(readLastModuleRecord("{")).toBeNull();
      expect(readLastModuleRecord(JSON.stringify({ module: "invalid" }))).toBeNull();
    });
  });

  describe("isLastModuleRecent", () => {
    it("returns true within TTL", () => {
      const record = createLastModuleRecord("chart", nowMs - 60_000);
      expect(isLastModuleRecent(record, nowMs)).toBe(true);
    });

    it("returns false when expired", () => {
      const record = createLastModuleRecord("chart", nowMs - LAST_MODULE_TTL_MS - 1);
      expect(isLastModuleRecent(record, nowMs)).toBe(false);
    });
  });

  describe("shouldRedirectFromRoot", () => {
    it("redirects to workspace when recent chart module", () => {
      const raw = JSON.stringify(createLastModuleRecord("chart", nowMs - 1000));
      expect(shouldRedirectFromRoot(raw, nowMs)).toBe("/workspace");
    });

    it("redirects to workspace when recent journal module", () => {
      const raw = JSON.stringify(createLastModuleRecord("journal", nowMs - 1000));
      expect(shouldRedirectFromRoot(raw, nowMs)).toBe("/workspace");
    });

    it("redirects to workspace when recent screener module", () => {
      const raw = JSON.stringify(createLastModuleRecord("screener", nowMs - 1000));
      expect(shouldRedirectFromRoot(raw, nowMs)).toBe("/workspace");
    });

    it("redirects to workspace when recent workspace module", () => {
      const raw = JSON.stringify(createLastModuleRecord("workspace", nowMs - 1000));
      expect(shouldRedirectFromRoot(raw, nowMs)).toBe("/workspace");
    });

    it("redirects to research when recent research module", () => {
      const raw = JSON.stringify(createLastModuleRecord("research", nowMs - 1000));
      expect(shouldRedirectFromRoot(raw, nowMs)).toBe("/research");
    });

    it("redirects to copilot when recent copilot module", () => {
      const raw = JSON.stringify(createLastModuleRecord("copilot", nowMs - 1000));
      expect(shouldRedirectFromRoot(raw, nowMs)).toBe("/copilot");
    });

    it("redirects to home when module is home", () => {
      const raw = JSON.stringify(createLastModuleRecord("home", nowMs - 1000));
      expect(shouldRedirectFromRoot(raw, nowMs)).toBe("/home");
    });

    it("redirects to workspace when record is missing or expired and default is Desk", () => {
      expect(shouldRedirectFromRoot(null, nowMs)).toBe("/workspace");
      const expired = JSON.stringify(createLastModuleRecord("chart", nowMs - LAST_MODULE_TTL_MS - 1));
      expect(shouldRedirectFromRoot(expired, nowMs)).toBe("/workspace");
    });

    it("uses default density pref when record is missing or expired", () => {
      expect(shouldRedirectFromRoot(null, nowMs, "Board")).toBe("/research");
      expect(shouldRedirectFromRoot(null, nowMs, "Talk")).toBe("/copilot");
    });
  });

  describe("resolveRootRedirectTarget", () => {
    it("maps research module to /research", () => {
      const record = createLastModuleRecord("research", nowMs - 1000);
      expect(resolveRootRedirectTarget(record, nowMs)).toBe("/research");
    });

    it("maps copilot module to /copilot", () => {
      const record = createLastModuleRecord("copilot", nowMs - 1000);
      expect(resolveRootRedirectTarget(record, nowMs)).toBe("/copilot");
    });

    it("falls back to default density when record is null", () => {
      expect(resolveRootRedirectTarget(null, nowMs, "Board")).toBe("/research");
    });
  });

  describe("readLastModuleRecord", () => {
    it("parses copilot module", () => {
      const raw = JSON.stringify(createLastModuleRecord("copilot", nowMs));
      expect(readLastModuleRecord(raw)).toEqual({
        module: "copilot",
        updatedAt: "2026-07-05T12:00:00.000Z",
      });
    });
  });
});
