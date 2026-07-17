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

    it("redirects to home when module is home", () => {
      const raw = JSON.stringify(createLastModuleRecord("home", nowMs - 1000));
      expect(shouldRedirectFromRoot(raw, nowMs)).toBe("/home");
    });

    it("redirects to home when record is missing or expired", () => {
      expect(shouldRedirectFromRoot(null, nowMs)).toBe("/home");
      const expired = JSON.stringify(createLastModuleRecord("chart", nowMs - LAST_MODULE_TTL_MS - 1));
      expect(shouldRedirectFromRoot(expired, nowMs)).toBe("/home");
    });
  });

  describe("resolveRootRedirectTarget", () => {
    it("maps research module to home", () => {
      const record = createLastModuleRecord("research", nowMs - 1000);
      expect(resolveRootRedirectTarget(record, nowMs)).toBe("/home");
    });
  });
});
