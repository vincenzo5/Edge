import { describe, expect, it } from "vitest";
import {
  applyCloseout,
  buildCurrentVerifiedStateBlock,
  extractCurrentVerifiedBlock,
  extractPreviousVerifiedHeading,
  formatEvidenceForCell,
  parseArgs,
  parsePhaseFromName,
  prependSessionLogEntry,
  readEvidenceFile,
  replaceCurrentVerifiedState,
  runCloseout,
  updateActiveWorkRow,
  updateRoadmapPhaseStatus,
  validateEvidenceText,
} from "./harness-closeout.mts";
import { validateProjectStatusContent } from "./validate-project-status.mts";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const FIXTURE_STATUS = `# Project Status

**Last updated:** 2026-07-20

## Current Verified State

- **Current task:** Example — Phase 1.
- **State:** **Active** — in progress.
- **Latest verification:** none yet
- **Evidence:** \`src/example.ts\`
- **Current blocker:** none
- **Next best step:** finish

## Previous Verified State (Example — Phase 0)

- **Current task:** Example — Phase 0.
- **State:** **Passing**
- **Latest verification:** **Focused:** 5 tests passed
- **Evidence:** \`src/example.ts\`
- **Current blocker:** none
- **Next best step:** Superseded

## Active Work

| Feature | Behavior | State | Completion evidence / latest result | Files |
|---------|----------|-------|-------------------------------------|-------|
| Example — Phase 1 | Does thing | **Active** | pending | \`src/example.ts\` |
| Example track | Track row | **Pending** | Phase 0 Passing | \`docs/roadmap.md\` |

## Session Log

### 2026-07-20 — prior entry

- **Verification run:** **Focused:** 5 tests passed
`;

const FIXTURE_ROADMAP = `# Roadmap

**Status:** Phase 0 **Passing**. Phase 1 **Pending**.

### Phase 1 — Example phase

**Outcome:** ship example.
`;

describe("harness-closeout helpers", () => {
  it("parses CLI args", () => {
    expect(
      parseArgs([
        "--name",
        "Example — Phase 1",
        "--evidence-file",
        "evidence.txt",
        "--dry-run",
      ]),
    ).toMatchObject({
      name: "Example — Phase 1",
      evidenceFile: "evidence.txt",
      dryRun: true,
    });
  });

  it("parses phase number from feature name", () => {
    expect(parsePhaseFromName("Plan → execute token efficiency — Phase 6")).toBe(6);
    expect(parsePhaseFromName("No phase here")).toBeNull();
  });

  it("formats evidence for table cells", () => {
    expect(
      formatEvidenceForCell("**Focused:** 10 tests passed\n**Instructions:** lint passed"),
    ).toBe("**Focused:** 10 tests passed; **Instructions:** lint passed");
  });

  it("accepts concrete evidence and rejects pending", () => {
    expect(validateEvidenceText("**Focused:** Test Files 2 passed (2), Tests 10 passed (10)")).toEqual(
      [],
    );
    expect(validateEvidenceText("App-level: pending walkthrough").length).toBeGreaterThan(0);
    expect(validateEvidenceText("tests pass").length).toBeGreaterThan(0);
  });

  it("updates an Active Work row by feature name", () => {
    const { content, found } = updateActiveWorkRow(FIXTURE_STATUS, "Example — Phase 1", {
      state: "**Passing**",
      evidence: "**Focused:** 10 tests passed",
    });
    expect(found).toBe(true);
    expect(content).toContain("| Example — Phase 1 | Does thing | **Passing** | **Focused:** 10 tests passed |");
  });

  it("builds Current Verified State block", () => {
    const block = buildCurrentVerifiedStateBlock({
      name: "Example — Phase 1",
      stateSummary: "shipped example",
      evidenceText: "**Focused:** 10 tests passed",
      files: "src/example.ts",
      next: "none",
    });
    expect(block).toContain("**State:** **Passing** — shipped example");
    expect(block).toContain("**Latest verification:** **Focused:** 10 tests passed");
  });

  it("extracts previous verified heading from old current block", () => {
    const oldBlock = extractCurrentVerifiedBlock(FIXTURE_STATUS);
    expect(extractPreviousVerifiedHeading(oldBlock)).toBe("Example — Phase 1");
  });

  it("replaces Current Verified State and pushes previous block", () => {
    const newBlock = buildCurrentVerifiedStateBlock({
      name: "Example — Phase 1",
      stateSummary: "done",
      evidenceText: "**Focused:** 10 tests passed",
      files: "src/example.ts",
    });
    const updated = replaceCurrentVerifiedState(FIXTURE_STATUS, newBlock);
    expect(updated).toContain("## Previous Verified State (Example — Phase 1)");
    expect(updated).toContain("**Current task:** Example — Phase 1.");
    expect(updated).toContain("## Previous Verified State (Example — Phase 0)");
  });

  it("prepends Session Log entry", () => {
    const updated = prependSessionLogEntry(
      FIXTURE_STATUS,
      "Example — Phase 1 Passing: shipped",
      "2026-07-24",
    );
    expect(updated).toContain("- **2026-07-24 — Example — Phase 1 Passing: shipped**");
    expect(updated).toContain("## Session Log");
  });

  it("updates roadmap Phase status line", () => {
    const updated = updateRoadmapPhaseStatus(FIXTURE_ROADMAP, 1);
    expect(updated).toContain("Phase 1 **Passing**");
    expect(updated).not.toContain("Phase 1 **Pending**");
  });
});

describe("applyCloseout", () => {
  it("applies full closeout and passes validation", () => {
    const result = applyCloseout(
      FIXTURE_STATUS,
      {
        name: "Example — Phase 1",
        evidenceText: "**Focused:** Test Files 1 passed (1), Tests 10 passed (10)",
        behavior: "Example shipped",
        files: "src/example.ts",
        next: "Track complete",
        sessionLog: "Example — Phase 1 Passing: shipped",
        trackName: "Example track",
        todayIso: "2026-07-24",
      },
      FIXTURE_ROADMAP,
    );

    expect(result.changed).toContain("Active Work row");
    expect(result.changed).toContain("track Active Work row");
    expect(result.changed).toContain("Current Verified State");
    expect(result.statusContent).toContain("**Last updated:** 2026-07-24");
    expect(result.statusContent).toContain("| Example — Phase 1 | Example shipped | **Passing** |");
    expect(result.statusContent).toContain("| Example track | Track row | **Passing** |");
    expect(result.roadmapContent).toContain("Phase 1 **Passing**");

    const issues = validateProjectStatusContent(
      result.statusContent,
      "test.md",
      "2026-07-24",
    );
    expect(issues).toEqual([]);
  });

  it("rejects closeout when evidence is invalid", () => {
    expect(() =>
      applyCloseout(FIXTURE_STATUS, {
        name: "Example — Phase 1",
        evidenceText: "tests pass",
        todayIso: "2026-07-24",
      }),
    ).toThrow(/validation failed|concrete verification/);
  });

  it("throws when Active Work row is missing", () => {
    expect(() =>
      applyCloseout(FIXTURE_STATUS, {
        name: "Missing feature",
        evidenceText: "**Focused:** 10 tests passed",
        todayIso: "2026-07-24",
      }),
    ).toThrow(/not found/);
  });
});

describe("runCloseout dry-run", () => {
  it("does not write files in dry-run mode", () => {
    const dir = mkdtempSync(join(tmpdir(), "harness-closeout-"));
    const statusPath = join(dir, "PROJECT-STATUS.md");
    const roadmapPath = join(dir, "roadmap.md");
    writeFileSync(statusPath, FIXTURE_STATUS, "utf8");
    writeFileSync(roadmapPath, FIXTURE_ROADMAP, "utf8");

    const evidencePath = join(dir, "evidence.txt");
    writeFileSync(
      evidencePath,
      "**Focused:** Test Files 1 passed (1), Tests 10 passed (10)",
      "utf8",
    );

    runCloseout({
      statusPath,
      roadmapPath,
      dryRun: true,
      cwd: dir,
      closeout: {
        name: "Example — Phase 1",
        evidenceText: readEvidenceFile(evidencePath, dir),
        files: "src/example.ts",
        todayIso: "2026-07-24",
      },
    });

    const afterStatus = readEvidenceFile(statusPath, dir);
    expect(afterStatus.trimEnd()).toBe(FIXTURE_STATUS.trimEnd());
  });
});
