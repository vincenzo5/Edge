import { describe, expect, it, vi } from "vitest";
import {
  buildDocsPrompt,
  getPathsChangedSince,
  hookExitCodeForDocsChange,
  isEditableDocPath,
  parseArgs,
  parsePrePushInput,
  parsePrePushLine,
  runDocsUpdate,
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
        "scripts/docs-automation-framework.mts",
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

describe("parseArgs", () => {
  it("parses sdk-smoke mode", () => {
    expect(parseArgs(["--sdk-smoke"]).mode).toBe("sdk-smoke");
  });

  it("parses lane and evidence flags", () => {
    expect(parseArgs(["--lane", "drift-audit", "--evidence-file", "evidence.txt"])).toMatchObject({
      mode: "manual",
      lane: "drift-audit",
      evidenceFile: "evidence.txt",
    });
  });
});

describe("buildDocsPrompt", () => {
  it("includes architecture routing and excludes harness without evidence", () => {
    const prompt = buildDocsPrompt(
      [{ base: "abc", head: "def" }],
      ["src/lib/marketData/health.ts"],
    );
    expect(prompt).toContain("Lane: architecture");
    expect(prompt).toContain("src/lib/marketData/ARCHITECTURE.md");
    expect(prompt).toContain("Do NOT edit docs/PROJECT-STATUS.md");
  });
});

describe("getPathsChangedSince", () => {
  it("detects newly modified paths", () => {
    const before = [" M src/lib/marketData/health.ts"];
    const after = [
      " M src/lib/marketData/health.ts",
      " M src/lib/marketData/ARCHITECTURE.md",
    ];
    expect(getPathsChangedSince(before, after)).toEqual(["src/lib/marketData/ARCHITECTURE.md"]);
  });
});

describe("isEditableDocPath", () => {
  it("recognizes architecture docs as editable doc paths", () => {
    expect(isEditableDocPath("src/lib/marketData/ARCHITECTURE.md")).toBe(true);
    expect(isEditableDocPath("src/lib/marketData/health.ts")).toBe(false);
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

describe("runDocsUpdate guardrails", () => {
  it("blocks harness lane without evidence", async () => {
    vi.stubEnv("CURSOR_API_KEY", "cursor_test_key");

    const exitCode = await runDocsUpdate({
      ranges: [{ base: "abc", head: "def" }],
      lane: "harness",
      changedFiles: ["src/lib/marketData/health.ts"],
      runAgent: vi.fn(),
    });

    vi.unstubAllEnvs();
    expect(exitCode).toBe(2);
  });

  it("blocks when agent edits non-doc paths", async () => {
    vi.stubEnv("CURSOR_API_KEY", "cursor_test_key");

    let porcelainCall = 0;
    const getFullPorcelainFn = () => {
      porcelainCall += 1;
      return porcelainCall === 1 ? [] : [" M src/lib/marketData/health.ts"];
    };

    const exitCode = await runDocsUpdate({
      ranges: [{ base: "abc", head: "def" }],
      changedFiles: ["src/lib/marketData/health.ts"],
      runAgent: async () => ({
        status: "finished",
        result: "updated: src/lib/marketData/ARCHITECTURE.md",
        durationMs: 1,
      }),
      validateInstructions: () => ({ ok: true, output: "ok" }),
      getFullPorcelainFn,
      getDocsPorcelainFn: () => [],
    });

    vi.unstubAllEnvs();
    expect(exitCode).toBe(2);
  });

  it("blocks allowlist violations for doc edits", async () => {
    vi.stubEnv("CURSOR_API_KEY", "cursor_test_key");

    let porcelainCall = 0;
    const getFullPorcelainFn = () => {
      porcelainCall += 1;
      return porcelainCall === 1 ? [] : [" M docs/screener-roadmap.md"];
    };

    const exitCode = await runDocsUpdate({
      ranges: [{ base: "abc", head: "def" }],
      changedFiles: ["src/lib/marketData/health.ts"],
      runAgent: async () => ({
        status: "finished",
        result: "updated: docs/screener-roadmap.md",
        durationMs: 1,
      }),
      validateInstructions: () => ({ ok: true, output: "ok" }),
      getFullPorcelainFn,
      getDocsPorcelainFn: () => [" M docs/screener-roadmap.md"],
    });

    vi.unstubAllEnvs();
    expect(exitCode).toBe(2);
  });

  it("runs lint:instructions when harness doc changes", async () => {
    vi.stubEnv("CURSOR_API_KEY", "cursor_test_key");
    const validateInstructions = vi.fn(() => ({ ok: true, output: "passed" }));
    const runAgent = vi.fn(async () => ({
      status: "finished",
      result: "updated: docs/PROJECT-STATUS.md",
      durationMs: 5,
    }));

    let fullPorcelainCall = 0;
    const getFullPorcelainFn = () => {
      fullPorcelainCall += 1;
      return fullPorcelainCall === 1 ? [] : [" M docs/PROJECT-STATUS.md"];
    };

    let docsPorcelainCall = 0;
    const getDocsPorcelainFn = () => {
      docsPorcelainCall += 1;
      return docsPorcelainCall === 1 ? [] : [" M docs/PROJECT-STATUS.md"];
    };

    const exitCode = await runDocsUpdate({
      ranges: [{ base: "abc", head: "def" }],
      changedFiles: ["src/lib/marketData/health.ts"],
      evidenceText: "Tests 42 passed",
      runAgent,
      validateInstructions,
      getFullPorcelainFn,
      getDocsPorcelainFn,
    });

    vi.unstubAllEnvs();

    expect(exitCode).toBe(2);
    expect(runAgent.mock.calls[0]?.[0]).toContain("Lane: harness");
    expect(validateInstructions).toHaveBeenCalled();
  });
});
