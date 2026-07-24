import { describe, expect, it } from "vitest";
import {
  checkRoadmapStatus,
  parseReadmeRows,
  statusTokens,
} from "./check-roadmap-status.mts";

describe("statusTokens", () => {
  it("parses primary phase claims and ignores cross-refs", () => {
    const tokens = statusTokens(
      "Phase 0–3 **Passing**; Phase 4 **Pending**; Memory efficiency Phase 12 **Passing** — track complete",
    );
    expect(tokens.has("phase:0-3:passing")).toBe(true);
    expect(tokens.has("phase:4:pending")).toBe(true);
    expect(tokens.has("phase:12:passing")).toBe(false);
    expect(tokens.has("track-complete")).toBe(true);
  });
});

describe("parseReadmeRows", () => {
  it("extracts file links from the status table", () => {
    const rows = parseReadmeRows(`
| Track | File | Status |
|-------|------|--------|
| Foo | [foo-roadmap.md](./foo-roadmap.md) | Phase 0 **Passing** |
`);
    expect(rows).toEqual([{ file: "foo-roadmap.md", status: "Phase 0 **Passing**" }]);
  });
});

describe("checkRoadmapStatus", () => {
  it("flags README Pending when track is Passing", () => {
    const issues = checkRoadmapStatus({
      readmeContent: `
| Track | File | Status |
|-------|------|--------|
| Example | [example-roadmap.md](./example-roadmap.md) | Phase 0 **Pending** |
`,
      readTrack: () => "**Status:** Phase 0 **Passing** (2026-07-24).\n",
    });
    expect(issues.some((i) => i.message.includes("README says Pending"))).toBe(true);
  });

  it("passes when README matches track", () => {
    const issues = checkRoadmapStatus({
      readmeContent: `
| Track | File | Status |
|-------|------|--------|
| Example | [example-roadmap.md](./example-roadmap.md) | Phase 0 **Passing**; Phase 1 **Pending** |
`,
      readTrack: () =>
        "**Status:** Phase 0 **Passing** (2026-07-24). Phase 1 **Pending**.\n",
    });
    expect(issues.filter((i) => i.track === "example-roadmap.md")).toEqual([]);
  });
});
