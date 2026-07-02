import { describe, expect, it } from "vitest";
import {
  getDocsStatusLines,
  hookExitCodeForDocsChange,
  parsePrePushInput,
  parsePrePushLine,
  shouldSkipDiff,
} from "./update-docs-for-diff.mts";

describe("parsePrePushLine", () => {
  it("parses a standard pre-push stdin line", () => {
    const parsed = parsePrePushLine(
      "refs/heads/main abc123 refs/heads/main def456",
    );
    expect(parsed).toEqual({
      localRef: "refs/heads/main",
      localSha: "abc123",
      remoteRef: "refs/heads/main",
      remoteSha: "def456",
    });
  });

  it("returns null for blank or malformed lines", () => {
    expect(parsePrePushLine("")).toBeNull();
    expect(parsePrePushLine("only two parts")).toBeNull();
  });
});

describe("parsePrePushInput", () => {
  it("builds diff ranges from pre-push stdin", () => {
    const input = [
      "refs/heads/feature aaa111 refs/heads/feature bbb222",
      "",
    ].join("\n");

    const ranges = parsePrePushInput(input);
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({
      base: "bbb222",
      head: "aaa111",
      remoteRef: "refs/heads/feature",
    });
  });
});

describe("shouldSkipDiff", () => {
  it("skips empty diffs", () => {
    expect(shouldSkipDiff([])).toBe(true);
  });

  it("skips docs-only diffs", () => {
    expect(shouldSkipDiff(["docs/PROJECT-STATUS.md", "AGENTS.md"])).toBe(true);
  });

  it("skips hook/script metadata only", () => {
    expect(
      shouldSkipDiff([
        ".githooks/pre-push",
        "scripts/update-docs-for-diff.mts",
        "package.json",
      ]),
    ).toBe(true);
  });

  it("does not skip when source code changed", () => {
    expect(shouldSkipDiff(["src/lib/marketData/health.ts"])).toBe(false);
    expect(
      shouldSkipDiff(["docs/PROJECT-STATUS.md", "src/lib/marketData/health.ts"]),
    ).toBe(false);
  });
});

describe("getDocsStatusLines", () => {
  it("filters porcelain output to docs paths", () => {
    const lines = [
      " M docs/PROJECT-STATUS.md",
      " M src/lib/marketData/health.ts",
      "?? AGENTS.md",
      " M .cursor/rules/plan-harness-awareness.mdc",
    ];

    expect(getDocsStatusLines(lines)).toEqual([
      " M docs/PROJECT-STATUS.md",
      "?? AGENTS.md",
      " M .cursor/rules/plan-harness-awareness.mdc",
    ]);
  });
});

describe("hookExitCodeForDocsChange", () => {
  it("allows push when no docs changed", () => {
    expect(hookExitCodeForDocsChange([])).toBe(0);
  });

  it("blocks push when docs changed", () => {
    expect(hookExitCodeForDocsChange([" M docs/PROJECT-STATUS.md"])).toBe(2);
  });
});
