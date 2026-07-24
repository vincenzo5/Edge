import { describe, expect, it, vi, beforeEach } from "vitest";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import {
  fnv1aHash,
  layoutContentFingerprint,
  layoutsContentEqual,
  resetLayoutContentFingerprintCacheForTests,
} from "./layoutContentFingerprint";

describe("layoutContentFingerprint", () => {
  beforeEach(() => {
    resetLayoutContentFingerprintCacheForTests();
  });

  it("returns the same fingerprint for equal layout content", () => {
    const a = { ...DEFAULT_LAYOUT, linkSymbol: true };
    const b = { ...DEFAULT_LAYOUT, linkSymbol: true };
    expect(layoutContentFingerprint(a)).toBe(layoutContentFingerprint(b));
    expect(layoutsContentEqual(a, b)).toBe(true);
  });

  it("changes fingerprint when layout content changes", () => {
    const before = layoutContentFingerprint(DEFAULT_LAYOUT);
    const after = layoutContentFingerprint({
      ...DEFAULT_LAYOUT,
      cells: [{ ...DEFAULT_LAYOUT.cells[0]!, symbol: "MSFT" }],
    });
    expect(before).not.toBe(after);
  });

  it("reuses fingerprint for the same object identity without re-stringifying", () => {
    const layout = { ...DEFAULT_LAYOUT, linkInterval: true };
    const stringifySpy = vi.spyOn(JSON, "stringify");

    const first = layoutContentFingerprint(layout);
    const second = layoutContentFingerprint(layout);

    expect(first).toBe(second);
    expect(stringifySpy).toHaveBeenCalledTimes(1);

    stringifySpy.mockRestore();
  });

  it("fnv1aHash is stable for the same input", () => {
    expect(fnv1aHash("hello")).toBe(fnv1aHash("hello"));
    expect(fnv1aHash("hello")).not.toBe(fnv1aHash("world"));
  });
});
