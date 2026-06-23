import { describe, expect, it } from "vitest";

import {
  marketResearchNoteCreateSchema,
  marketResearchNotePatchSchema,
} from "@/lib/persistence/schemas/marketResearchNote";

describe("marketResearchNote schemas", () => {
  it("accepts a valid create payload", () => {
    const parsed = marketResearchNoteCreateSchema.safeParse({
      symbol: "AAPL",
      chartInterval: "1d",
      researchNoteType: "thesis",
      researchThesis: {
        title: "Breakout setup",
        body: "Price holding above prior resistance.",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty patch payloads", () => {
    const parsed = marketResearchNotePatchSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("rejects thesis without title or body", () => {
    const parsed = marketResearchNoteCreateSchema.safeParse({
      symbol: "AAPL",
      chartInterval: "1d",
      researchNoteType: "note",
      researchThesis: {},
    });
    expect(parsed.success).toBe(false);
  });
});
