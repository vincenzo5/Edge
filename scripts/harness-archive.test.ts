import { describe, expect, it } from "vitest";
import {
  extractPreviousVerifiedBlocks,
  prunePreviousVerifiedBlocks,
  pruneSessionLogEntries,
} from "./harness-archive.mts";

const FIXTURE = `# Project Status

## Current Verified State

- **Current task:** Example — Phase 2.

## Previous Verified State (Example — Phase 1)

- **State:** **Passing**

## Previous Verified State (Example — Phase 0)

- **State:** **Passing**

## Startup Readiness

Content here.

## Session Log

- **2026-07-24 — entry one**

### 2026-07-24 — subsection one

- Goal: test

### 2026-07-23 — subsection two

- Goal: old

## Next Priorities
`;

describe("harness-archive", () => {
  it("extracts Previous Verified blocks", () => {
    const blocks = extractPreviousVerifiedBlocks(FIXTURE);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain("Example — Phase 1");
  });

  it("prunes Previous Verified overflow", () => {
    let content = FIXTURE;
    for (let i = 3; i <= 12; i += 1) {
      content = content.replace(
        "## Previous Verified State (Example — Phase 1)",
        `## Previous Verified State (Example — Phase ${i})\n\n- **State:** **Passing**\n\n## Previous Verified State (Example — Phase 1)`,
      );
    }
    const result = prunePreviousVerifiedBlocks(content, {
      maxKeep: 10,
      archivePath: "/tmp/harness-archive-test.md",
      todayIso: "2026-07-24",
    });
    expect(result.archivedCount).toBeGreaterThan(0);
    expect(extractPreviousVerifiedBlocks(result.content).length).toBeLessThanOrEqual(10);
  });

  it("prunes Session Log overflow", () => {
    let content = FIXTURE;
    for (let i = 0; i < 20; i += 1) {
      content = content.replace(
        "### 2026-07-23 — subsection two",
        `### 2026-07-22 — old ${i}\n\n- Goal: archive\n\n### 2026-07-23 — subsection two`,
      );
    }
    const result = pruneSessionLogEntries(content, {
      maxKeep: 15,
      archivePath: "/tmp/harness-archive-session-test.md",
      todayIso: "2026-07-24",
    });
    expect(result.archivedCount).toBeGreaterThan(0);
    expect(result.content.match(/^### /gm)?.length ?? 0).toBeLessThanOrEqual(15);
  });
});
