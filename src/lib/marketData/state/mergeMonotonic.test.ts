import { describe, expect, it } from "vitest";
import { mergeMonotonicServerHealth } from "../health";
import { createSnapshotRevision } from "./revision";

describe("mergeMonotonicServerHealth", () => {
  const base = {
    providers: [],
    recentWarnings: [],
  };

  it("accepts newer revision within the same epoch", () => {
    const previous = {
      ...base,
      generatedAt: 1000,
      revision: createSnapshotRevision(2, 1000),
    };
    const incoming = {
      ...base,
      generatedAt: 1001,
      revision: createSnapshotRevision(3, 1001),
    };
    expect(mergeMonotonicServerHealth(previous, incoming)).toBe(incoming);
  });

  it("rejects older revision even when generatedAt is newer", () => {
    const previous = {
      ...base,
      generatedAt: 1000,
      revision: createSnapshotRevision(5, 1000),
    };
    const incoming = {
      ...base,
      generatedAt: 2000,
      revision: createSnapshotRevision(4, 2000),
    };
    expect(mergeMonotonicServerHealth(previous, incoming)).toBe(previous);
  });

  it("falls back to generatedAt when revision is missing", () => {
    const previous = { ...base, generatedAt: 1000 };
    const incoming = { ...base, generatedAt: 900 };
    expect(mergeMonotonicServerHealth(previous, incoming)).toBe(previous);
  });
});
