import { describe, expect, it } from "vitest";
import {
  countPreviousVerifiedSections,
  validateHarnessRetention,
} from "./validate-harness-retention.mts";

describe("validateHarnessRetention", () => {
  it("flags Previous Verified sections in hot file", () => {
    const content = `# Project Status

## Current Verified State

- **Current task:** x

## Previous Verified State (Old)

- stale

## Active Work

| Feature | Behavior | State | Completion evidence / latest result | Files |
|---------|----------|-------|-------------------------------------|-------|
| x | y | **Active** | pending | a.ts |

## Session Log

- **2026-07-24 — entry**
`;
    expect(countPreviousVerifiedSections(content)).toBe(1);
    const issues = validateHarnessRetention(content, { maxLines: 10000 });
    expect(issues.some((issue) => issue.message.includes("Previous Verified"))).toBe(
      true,
    );
  });

  it("passes a compact hot dashboard", () => {
    const content = `# Project Status

## Current Verified State

- **Current task:** x

## Active Work

| Feature | Behavior | State | Completion evidence / latest result | Files |
|---------|----------|-------|-------------------------------------|-------|
| x | y | **Active** | pending | a.ts |

## Session Log

- **2026-07-24 — entry**
`;
    expect(validateHarnessRetention(content)).toEqual([]);
  });
});
