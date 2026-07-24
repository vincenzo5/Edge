import { describe, expect, it, beforeEach } from "vitest";

import { toArtifactHint, artifactHintFromSummary } from "./artifactHint";
import { researchCardFromHint } from "./cardFromHint";
import {
  clearResearchEvidenceForTests,
  isEvidencePinned,
  listEvidenceCards,
  pinEvidenceCard,
  reorderEvidenceCards,
  unpinEvidenceCard,
} from "./evidenceStore";
import { openResearchCardHref } from "./openResearchCard";

describe("toArtifactHint", () => {
  it("maps get_chart_state to chart hint", () => {
    const hint = toArtifactHint("get_chart_state", {
      ok: true,
      data: {
        config: { symbol: "NVDA", interval: "5", range: "1D", chartType: "candle" },
      },
    });
    expect(hint).toEqual({
      type: "chart",
      symbol: "NVDA",
      interval: "5",
      title: "NVDA · 5",
    });
  });

  it("maps summarize_screen to screener hint", () => {
    const hint = toArtifactHint("summarize_screen", {
      ok: true,
      data: {
        screenName: "OR high",
        thesisSummary: "Momentum names holding highs",
        resultCount: 12,
        ranked: [],
      },
    });
    expect(hint?.type).toBe("screener");
    expect(hint).toMatchObject({ screenName: "OR high", title: "OR high" });
  });

  it("maps list_journal_trades to journalDraft hint", () => {
    const hint = toArtifactHint("list_journal_trades", {
      ok: true,
      data: {
        count: 1,
        trades: [{ id: "550e8400-e29b-41d4-a716-446655440099", symbol: "AAPL" }],
      },
    });
    expect(hint?.type).toBe("journalDraft");
    expect(hint).toMatchObject({
      draftTradeId: "550e8400-e29b-41d4-a716-446655440099",
      summary: "1 trade(s) · AAPL",
    });
  });

  it("returns null for failed tools", () => {
    expect(
      toArtifactHint("get_chart_state", { ok: false, error: "nope", code: "error" }),
    ).toBeNull();
  });
});

describe("artifactHintFromSummary", () => {
  it("falls back to aiCallout for generic summaries", () => {
    const hint = artifactHintFromSummary("search_symbols", "search_symbols ok: 1 symbol", true);
    expect(hint?.type).toBe("aiCallout");
  });
});

describe("research evidence store", () => {
  beforeEach(() => {
    clearResearchEvidenceForTests();
  });

  it("pins, lists, reorders, and unpins cards", () => {
    const cardA = researchCardFromHint(
      { type: "chart", symbol: "NVDA", interval: "5", title: "NVDA · 5" },
      { threadId: "t1", messageId: "m1", toolCallId: "c1" },
    );
    const cardB = researchCardFromHint(
      { type: "screener", title: "OR high", queryLabel: "OR high" },
      { threadId: "t1", messageId: "m2", toolCallId: "c2" },
    );

    pinEvidenceCard(cardA, { toolCallId: "c1", threadId: "t1" });
    pinEvidenceCard(cardB, { toolCallId: "c2", threadId: "t1" });

    expect(listEvidenceCards()).toHaveLength(2);
    expect(isEvidencePinned("c1")).toBe(true);

    reorderEvidenceCards(1, 0);
    expect(listEvidenceCards()[0]?.type).toBe("screener");

    unpinEvidenceCard(cardB.id);
    expect(listEvidenceCards()).toHaveLength(1);
    expect(isEvidencePinned("c2")).toBe(false);
  });

  it("dedupes pin by toolCallId", () => {
    const card = researchCardFromHint(
      { type: "chart", symbol: "AAPL", interval: "D", title: "AAPL · D" },
      { threadId: "t1", messageId: "m1", toolCallId: "c1" },
    );
    pinEvidenceCard(card, { toolCallId: "c1" });
    pinEvidenceCard(
      researchCardFromHint(
        { type: "chart", symbol: "AAPL", interval: "D", title: "AAPL · D" },
        { threadId: "t1", messageId: "m1", toolCallId: "c1" },
      ),
      { toolCallId: "c1" },
    );
    expect(listEvidenceCards()).toHaveLength(1);
  });
});

describe("openResearchCardHref", () => {
  it("builds chart and screener deep links", () => {
    expect(
      openResearchCardHref({
        id: "550e8400-e29b-41d4-a716-446655440001",
        source: "ai",
        type: "chart",
        symbol: "NVDA",
        interval: "5",
      }),
    ).toBe("/chart?symbol=NVDA&interval=5");

    expect(
      openResearchCardHref({
        id: "550e8400-e29b-41d4-a716-446655440002",
        source: "ai",
        type: "screener",
        queryLabel: "OR high",
      }),
    ).toBe("/workspace?surface=screener&screenerView=screens");
  });
});
