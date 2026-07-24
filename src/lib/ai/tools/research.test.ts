import { beforeEach, describe, expect, it } from "vitest";

import { executeTool } from "../adapters/execute";
import type { ToolContext } from "../context";
import { clearBoardFocusForTests, createResearchBoardPort } from "@/lib/research/researchBoardPort";
import { clearResearchBoardSessionForTests, getActiveBoardSession } from "@/lib/research/boardSessionStore";
import { getBoardFocusedCardId } from "@/lib/research/boardFocusStore";
import { clientToolRegistry } from "./clientTools";
import {
  addResearchCardTool,
  arrangeResearchCardsTool,
  focusResearchCardTool,
  getResearchBoardTool,
  linkResearchCardsTool,
  removeResearchCardTool,
} from "./research";

function baseMarketData(): ToolContext["marketData"] {
  return {
    searchSymbols: async () => [],
    getCandles: async () => ({ data: [], meta: { source: "test" } }),
    getQuotes: async () => ({ data: [], meta: { source: "test" } }),
    getFundamentals: async () => ({ symbol: "NVDA", updatedAt: Date.now() }),
    getOptionExpirations: async () => [],
    getOptionsChain: async () => ({
      underlying: "NVDA",
      expiration: "2025-06-20",
      contracts: [],
    }),
  };
}

function mockContext(research: ToolContext["research"]): ToolContext {
  return {
    clientSession: true,
    app: null,
    chart: null,
    watchlist: null,
    screener: null,
    risk: null,
    account: null,
    options: null,
    scriptLibrary: null,
    marketData: baseMarketData(),
    trading: null,
    journal: null,
    alerts: null,
    research,
  };
}

describe("research board tools", () => {
  beforeEach(() => {
    clearResearchBoardSessionForTests();
    clearBoardFocusForTests();
    window.localStorage.clear();
  });

  it("registers research tools in client registry", () => {
    const names = clientToolRegistry.list().map((tool) => tool.name);
    expect(names).toContain("get_research_board");
    expect(names).toContain("add_research_card");
    expect(names).toContain("link_research_cards");
    expect(names).toContain("focus_research_card");
    expect(names).toContain("arrange_research_cards");
    expect(names).toContain("remove_research_card");
  });

  it("get_research_board returns session and focus", async () => {
    const research = createResearchBoardPort();
    const result = await getResearchBoardTool.execute({}, mockContext(research));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.session.cards).toEqual([]);
      expect(result.data.focusedCardId).toBeNull();
    }
  });

  it("add_research_card marks source ai and persists", async () => {
    const research = createResearchBoardPort();
    const result = await addResearchCardTool.execute(
      { type: "chart", symbol: "NVDA", interval: "1d", threadId: "thread-1" },
      mockContext(research),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.card.source).toBe("ai");
      expect(result.data.card.type).toBe("chart");
      if (result.data.card.type === "chart") {
        expect(result.data.card.symbol).toBe("NVDA");
      }
    }
    const session = getActiveBoardSession();
    expect(session.cards).toHaveLength(1);
    expect(session.threadIds).toContain("thread-1");
  });

  it("link_research_cards connects two cards", async () => {
    const research = createResearchBoardPort();
    const first = research.addCard({ type: "note", body: "Thesis", source: "ai" });
    const second = research.addCard({
      type: "chart",
      symbol: "NVDA",
      interval: "1d",
      source: "ai",
    });

    const result = await linkResearchCardsTool.execute(
      { fromCardId: first.id, toCardId: second.id, label: "supports" },
      mockContext(research),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.link.fromCardId).toBe(first.id);
      expect(result.data.link.label).toBe("supports");
    }
  });

  it("focus_research_card updates focus store", async () => {
    const research = createResearchBoardPort();
    const card = research.addCard({
      type: "chart",
      symbol: "NVDA",
      interval: "1d",
      source: "ai",
    });

    const result = await focusResearchCardTool.execute(
      { cardId: card.id },
      mockContext(research),
    );
    expect(result.ok).toBe(true);
    expect(getBoardFocusedCardId()).toBe(card.id);
  });

  it("arrange_research_cards requires confirmation via executeTool", async () => {
    const research = createResearchBoardPort();
    const card = research.addCard({
      type: "note",
      body: "Move me",
      source: "ai",
    });

    const blocked = await executeTool(
      clientToolRegistry,
      "arrange_research_cards",
      { cards: [{ cardId: card.id, x: 200, y: 300 }] },
      mockContext(research),
      { permissionMode: "full", confirmed: false },
    );
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("confirmation_required");
  });

  it("arrange_research_cards updates positions when confirmed", async () => {
    const research = createResearchBoardPort();
    const card = research.addCard({
      type: "note",
      body: "Move me",
      source: "ai",
    });

    const result = await executeTool(
      clientToolRegistry,
      "arrange_research_cards",
      { cards: [{ cardId: card.id, x: 200, y: 300 }] },
      mockContext(research),
      { permissionMode: "full", confirmationValidatedByServer: true },
    );
    expect(result.ok).toBe(true);
    const updated = getActiveBoardSession().cards.find((entry) => entry.id === card.id);
    expect(updated?.position?.x).toBe(200);
    expect(updated?.position?.y).toBe(300);
  });

  it("remove_research_card requires confirmation", async () => {
    const research = createResearchBoardPort();
    const card = research.addCard({
      type: "note",
      body: "Delete me",
      source: "ai",
    });

    const blocked = await executeTool(
      clientToolRegistry,
      "remove_research_card",
      { cardId: card.id },
      mockContext(research),
      { permissionMode: "full", confirmed: false },
    );
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("confirmation_required");
  });

  it("remove_research_card removes card when confirmed", async () => {
    const research = createResearchBoardPort();
    const card = research.addCard({
      type: "note",
      body: "Delete me",
      source: "ai",
    });
    research.focusCard(card.id);

    const result = await executeTool(
      clientToolRegistry,
      "remove_research_card",
      { cardId: card.id },
      mockContext(research),
      { permissionMode: "full", confirmationValidatedByServer: true },
    );
    expect(result.ok).toBe(true);
    expect(getActiveBoardSession().cards).toHaveLength(0);
    expect(getBoardFocusedCardId()).toBeNull();
  });
});
