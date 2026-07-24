import { describe, expect, it } from "vitest";

import {
  DESK_DENSITY_PERMANENCE,
  DESK_DENSITY_ROUTE,
  isPermanentDensity,
  PERMANENT_DENSITIES,
  RESEARCH_DENSITIES,
} from "./density";
import { entryPolicyForPath, RESEARCH_ENTRY_POLICY, RESEARCH_ENTRY_ROUTES } from "./entryPolicy";
import {
  COPILOT_OWNS,
  DESK_OWNS,
  RESEARCH_NON_OWNS,
  RESEARCH_SESSION_OWNS,
} from "./ownership";
import {
  parseResearchSessionSketch,
  RESEARCH_SESSIONS_STORAGE_KEY,
  RESEARCH_SESSION_SKETCH_VERSION,
  researchCardSketchSchema,
  researchSessionSketchSchema,
} from "./sessionSketch";

const baseCard = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  source: "user" as const,
};

describe("research density", () => {
  it("includes Desk as a permanent density", () => {
    expect(DESK_DENSITY_PERMANENCE).toBe(true);
    expect(PERMANENT_DENSITIES).toContain("Desk");
    expect(isPermanentDensity("Desk")).toBe(true);
    expect(DESK_DENSITY_ROUTE).toBe("/workspace");
  });

  it("defines Talk, Board, Desk, and Stage", () => {
    expect(RESEARCH_DENSITIES).toEqual(["Talk", "Board", "Desk", "Stage"]);
  });
});

describe("research ownership", () => {
  it("documents non-empty ownership for each store", () => {
    expect(DESK_OWNS.length).toBeGreaterThan(0);
    expect(RESEARCH_SESSION_OWNS.length).toBeGreaterThan(0);
    expect(COPILOT_OWNS.length).toBeGreaterThan(0);
    expect(RESEARCH_NON_OWNS.length).toBeGreaterThan(0);
  });

  it("keeps session and desk responsibilities distinct", () => {
    const deskSet = new Set(DESK_OWNS);
    for (const item of RESEARCH_SESSION_OWNS) {
      expect(deskSet.has(item)).toBe(false);
    }
  });
});

describe("research entry policy", () => {
  it("includes Desk and reserved /research routes", () => {
    expect(entryPolicyForPath("/workspace")?.density).toBe("Desk");
    expect(entryPolicyForPath("/research")?.path).toBe("/research");
    expect(RESEARCH_ENTRY_ROUTES.research).toBe("/research");
  });

  it("documents Phase 8 smart root redirect", () => {
    const root = entryPolicyForPath("/");
    expect(root?.redirectBehavior).toContain("lastModule");
    expect(root?.redirectBehavior).toContain("default density");
    expect(RESEARCH_ENTRY_POLICY.some((entry) => entry.path === "/copilot")).toBe(true);
  });
});

describe("research session sketch", () => {
  it("round-trips each card type", () => {
    const fixtures = [
      { ...baseCard, type: "chart" as const, symbol: "NVDA", interval: "D" },
      { ...baseCard, id: "550e8400-e29b-41d4-a716-446655440002", type: "screener" as const, queryLabel: "OR high" },
      { ...baseCard, id: "550e8400-e29b-41d4-a716-446655440003", type: "note" as const, body: "Thesis note" },
      {
        ...baseCard,
        id: "550e8400-e29b-41d4-a716-446655440004",
        type: "journalDraft" as const,
        summary: "Draft trade",
      },
      {
        ...baseCard,
        id: "550e8400-e29b-41d4-a716-446655440005",
        type: "aiCallout" as const,
        source: "ai" as const,
        summary: "AI summary",
        threadId: "thread-1",
      },
      {
        ...baseCard,
        id: "550e8400-e29b-41d4-a716-446655440006",
        type: "deskLink" as const,
        tileId: "tile-chart-1",
        label: "Primary chart",
      },
    ];

    for (const fixture of fixtures) {
      const parsed = researchCardSketchSchema.parse(fixture);
      expect(parsed.type).toBe(fixture.type);
    }
  });

  it("rejects unknown card types", () => {
    expect(() =>
      researchCardSketchSchema.parse({
        ...baseCard,
        type: "news",
        headline: "Headline",
      }),
    ).toThrow();
  });

  it("round-trips a full session with empty reel", () => {
    const session = {
      id: "660e8400-e29b-41d4-a716-446655440000",
      schemaVersion: RESEARCH_SESSION_SKETCH_VERSION,
      title: "NVDA OR-high thesis",
      question: "Is NVDA holding OR high?",
      cards: [{ ...baseCard, type: "chart" as const, symbol: "NVDA", interval: "5" }],
      links: [],
      threadIds: ["thread-abc"],
      reel: [],
      updatedAt: "2026-07-24T18:00:00.000Z",
    };

    const parsed = parseResearchSessionSketch(session);
    expect(parsed).toEqual(researchSessionSketchSchema.parse(session));
    expect(RESEARCH_SESSIONS_STORAGE_KEY).toBe("tv-ai:research-sessions:v1");
  });
});
