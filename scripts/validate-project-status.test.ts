import { describe, expect, it } from "vitest";
import {
  hasConcreteVerificationEvidence,
  hasParaphraseOnlyPass,
  hasPendingVerification,
  validateProjectStatusContent,
  validateSessionExitContent,
} from "./validate-project-status.mts";

const MINIMAL_HEADER = `
**Last updated:** 2026-06-30

## Current Verified State

- **Current task:** Example task
- **State:** **Passing**
- **Latest verification:** **Focused:** 10 tests passed
- **Evidence:** \`src/example.ts\`
- **Current blocker:** none
- **Next best step:** Ship

## Active Work

| Feature | Behavior | State | Completion evidence / latest result | Files |
|---------|----------|-------|-------------------------------------|-------|
| Example | Does thing | **Passing** | **Focused:** 10 tests passed | \`src/example.ts\` |

## Session Log

### 2026-06-30 — Example

- **Verification run:** **Focused:** 10 tests passed
`;

describe("validate-project-status helpers", () => {
  it("detects pending verification text", () => {
    expect(hasPendingVerification("App-level: pending walkthrough")).toBe(true);
    expect(hasPendingVerification("67 tests passed")).toBe(false);
  });

  it("accepts concrete verification evidence", () => {
    expect(hasConcreteVerificationEvidence("**Focused:** 67 tests passed")).toBe(true);
    expect(hasConcreteVerificationEvidence("npm run build passed")).toBe(true);
    expect(hasConcreteVerificationEvidence("check:startup passed (26 tests)")).toBe(true);
    expect(
      hasConcreteVerificationEvidence("**App-level:** cold candles 515ms, meta.source: yahoo"),
    ).toBe(true);
  });

  it("rejects app-level pending as concrete evidence", () => {
    expect(hasConcreteVerificationEvidence("**App-level:** pending manual walkthrough")).toBe(
      false,
    );
  });

  it("flags paraphrase-only pass wording", () => {
    expect(hasParaphraseOnlyPass("tests pass")).toBe(true);
    expect(hasParaphraseOnlyPass("67 tests passed")).toBe(false);
  });
});

describe("validateProjectStatusContent", () => {
  it("passes minimal honest Passing state", () => {
    const issues = validateProjectStatusContent(MINIMAL_HEADER, "test.md", "2026-06-30");
    expect(issues).toEqual([]);
  });

  it("fails Passing when Latest verification contains pending", () => {
    const content = MINIMAL_HEADER.replace(
      "**Latest verification:** **Focused:** 10 tests passed",
      "**Latest verification:** **Focused:** 10 tests passed; **App-level:** pending walkthrough",
    );
    const issues = validateProjectStatusContent(content, "test.md", "2026-06-30");
    expect(
      issues.some((issue) => issue.message.includes("contains pending")),
    ).toBe(true);
  });

  it("fails Active Work Passing row when evidence contains pending", () => {
    const content = MINIMAL_HEADER.replace(
      "| Example | Does thing | **Passing** | **Focused:** 10 tests passed |",
      "| Example | Does thing | **Passing** | **Focused:** 10 tests passed; **App-level:** pending |",
    );
    const issues = validateProjectStatusContent(content, "test.md", "2026-06-30");
    expect(
      issues.some((issue) => issue.message.includes('Active Work row "Example"')),
    ).toBe(true);
  });

  it("fails Passing row with paraphrase-only evidence", () => {
    const content = MINIMAL_HEADER.replace(
      "**Latest verification:** **Focused:** 10 tests passed",
      "**Latest verification:** tests pass",
    ).replace(
      "| Example | Does thing | **Passing** | **Focused:** 10 tests passed |",
      "| Example | Does thing | **Passing** | tests pass |",
    );
    const issues = validateProjectStatusContent(content, "test.md", "2026-06-30");
    expect(
      issues.some((issue) => issue.message.includes("concrete verification result")),
    ).toBe(true);
  });
});

describe("validateSessionExitContent", () => {
  it("requires a Session Log entry for today when state is Pending", () => {
    const content = MINIMAL_HEADER.replace("**Passing**", "**Pending**").replace(
      "## Session Log\n\n### 2026-06-30 — Example",
      "## Session Log\n\n### 2026-06-29 — Old entry",
    );
    const issues = validateSessionExitContent(content, "test.md", "2026-06-30");
    expect(
      issues.some((issue) => issue.message.includes("Session Log must include an entry dated")),
    ).toBe(true);
  });

  it("requires Task Contract for cross-component Active row", () => {
    const content = `
**Last updated:** 2026-06-30

## Current Verified State

- **Current task:** Cross feature
- **State:** **Pending**
- **Latest verification:** **Focused:** 5 tests passed
- **Evidence:** paths
- **Current blocker:** none
- **Next best step:** verify

## Active Work

| Feature | Behavior | State | Completion evidence / latest result | Files |
|---------|----------|-------|-------------------------------------|-------|
| Cross feature | Does thing | **Active** | **Focused:** 5 tests passed | \`src/lib/foo.ts\`, \`src/app/api/bar/route.ts\` |

## Session Log

### 2026-06-30 — Cross feature
`;
    const issues = validateSessionExitContent(content, "test.md", "2026-06-30");
    expect(
      issues.some((issue) => issue.message.includes("requires Task Contract heading")),
    ).toBe(true);
  });
});
