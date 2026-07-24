import { describe, expect, it } from "vitest";

import {
  isAllowedHref,
  normalizeExternalHref,
  sanitizeHref,
} from "./safeHref";

describe("safeHref", () => {
  it("allows https and http absolute URLs", () => {
    expect(isAllowedHref("https://example.com/path")).toBe(true);
    expect(isAllowedHref("http://example.com")).toBe(true);
    expect(sanitizeHref("https://example.com")).toBe("https://example.com");
  });

  it("allows app-relative paths", () => {
    expect(isAllowedHref("/workspace?surface=alerts")).toBe(true);
    expect(sanitizeHref("/workspace?surface=alerts")).toBe("/workspace?surface=alerts");
  });

  it("rejects javascript, data, and protocol-relative URLs", () => {
    expect(isAllowedHref("javascript:alert(1)")).toBe(false);
    expect(isAllowedHref("data:text/html,hello")).toBe(false);
    expect(isAllowedHref("//evil.example.com")).toBe(false);
    expect(sanitizeHref("javascript:alert(1)")).toBeNull();
  });

  it("normalizes upstream website values to https", () => {
    expect(normalizeExternalHref("apple.com")).toBe("https://apple.com");
    expect(normalizeExternalHref("https://apple.com")).toBe("https://apple.com");
    expect(normalizeExternalHref("javascript:alert(1)")).toBeNull();
  });
});
