import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applySurfaceFocusOrOpen,
  createDefaultWorkspacesState,
  getActiveDocument,
} from "@/lib/appWorkspace/commands";
import { APP_WORKSPACES_STORAGE_KEY } from "@/lib/appWorkspace/storage";
import { createDefaultWorkspaceTabs } from "@/lib/app/workspaceTabs";
import { resolveWorkspaceTabsStorageKey } from "@/lib/app/workspaceTabsStorage";

import {
  MAX_LIVE_BOARD_CHART_CARDS,
  shouldMountBoardChart,
} from "./boardChartMountPolicy";
import {
  addBoardCard,
  clearResearchBoardSessionForTests,
  getActiveBoardSession,
  updateBoardCardBinding,
} from "./boardSessionStore";
import { buildBoardChartCellConfig } from "./buildBoardChartCellConfig";
import { researchCardFromHint } from "./cardFromHint";
import { canOpenResearchCard, openResearchCardHref } from "./openResearchCard";
import {
  canPromoteResearchCard,
  demoteAndBindChartTileToBoard,
  promoteResearchCardToDesk,
} from "./promote";
import { RESEARCH_SESSIONS_STORAGE_KEY } from "./sessionSketch";

describe("board chart mount policy", () => {
  it("allows at most one live chart via focused + visible gate", () => {
    expect(MAX_LIVE_BOARD_CHART_CARDS).toBe(1);
    const visible = new Set(["a", "b"]);
    expect(shouldMountBoardChart("a", "a", visible)).toBe(true);
    expect(shouldMountBoardChart("b", "a", visible)).toBe(false);
    expect(shouldMountBoardChart("a", "a", new Set(["b"]))).toBe(false);
  });
});

describe("buildBoardChartCellConfig", () => {
  it("maps card symbol and interval to a cell config", () => {
    const card = researchCardFromHint(
      { type: "chart", symbol: "nvda", interval: "5", title: "NVDA · 5" },
      { threadId: "t1", messageId: "m1" },
    );
    const config = buildBoardChartCellConfig(card);
    expect(config.symbol).toBe("NVDA");
    expect(config.interval).toBe("5");
  });
});

describe("promote and demote", () => {
  beforeEach(() => {
    clearResearchBoardSessionForTests();
    window.localStorage.clear();
  });

  it("promotes chart card to desk and writes tile binding", () => {
    const card = addBoardCard(
      researchCardFromHint(
        { type: "chart", symbol: "AAPL", interval: "1d", title: "AAPL · 1d" },
        { threadId: "t1", messageId: "m1" },
      ),
    );

    const result = promoteResearchCardToDesk(card);
    expect(result).toMatchObject({
      href: expect.stringContaining("/workspace?"),
      tileId: expect.any(String),
      appWorkspaceId: expect.any(String),
    });
    expect(result?.href).toContain("symbol=AAPL");
    expect(result?.href).toContain("interval=1d");

    const session = getActiveBoardSession();
    const updated = session.cards.find((entry) => entry.id === card.id);
    expect(updated?.type).toBe("chart");
    if (updated?.type === "chart") {
      expect(updated.deskTileId).toBe(result?.tileId);
      expect(updated.appWorkspaceId).toBe(result?.appWorkspaceId);
    }

    expect(window.localStorage.getItem(APP_WORKSPACES_STORAGE_KEY)).toContain(result?.tileId);
  });

  it("demotes chart tile to board with symbol binding", () => {
    const state = createDefaultWorkspacesState();
    window.localStorage.setItem(APP_WORKSPACES_STORAGE_KEY, JSON.stringify(state));
    const doc = getActiveDocument(state);
    const tileId = doc.activeTileId!;
    const tabs = createDefaultWorkspaceTabs();
    tabs.tabs[0]!.layout.cells[0]!.symbol = "MSFT";
    tabs.tabs[0]!.layout.cells[0]!.interval = "5m";
    window.localStorage.setItem(
      resolveWorkspaceTabsStorageKey({ tileId, isPrimaryChartTile: true }),
      JSON.stringify(tabs),
    );

    const card = demoteAndBindChartTileToBoard({
      tileId,
      isPrimaryChartTile: true,
      appWorkspaceId: doc.id,
    });

    expect(card.type).toBe("chart");
    if (card.type === "chart") {
      expect(card.symbol).toBe("MSFT");
      expect(card.interval).toBe("5m");
      expect(card.deskTileId).toBe(tileId);
      expect(card.appWorkspaceId).toBe(doc.id);
    }
    expect(window.localStorage.getItem(RESEARCH_SESSIONS_STORAGE_KEY)).toContain("MSFT");
  });

  it("canPromoteResearchCard covers actionable card types", () => {
    expect(canPromoteResearchCard(researchCardFromHint(
      { type: "chart", symbol: "AAPL", interval: "1d", title: "AAPL · 1d" },
      { threadId: "t1", messageId: "m1" },
    ))).toBe(true);
    expect(canPromoteResearchCard(researchCardFromHint(
      { type: "note", body: "x", title: "x" },
      { threadId: "t1", messageId: "m1" },
    ))).toBe(false);
  });
});

describe("openResearchCard", () => {
  it("still resolves chart open href", () => {
    const card = researchCardFromHint(
      { type: "chart", symbol: "AAPL", interval: "1d", title: "AAPL · 1d" },
      { threadId: "t1", messageId: "m1" },
    );
    expect(canOpenResearchCard(card)).toBe(true);
    expect(openResearchCardHref(card)).toContain("/chart?symbol=AAPL");
  });
});

describe("updateBoardCardBinding", () => {
  beforeEach(() => {
    clearResearchBoardSessionForTests();
  });

  it("patches chart card desk binding fields", () => {
    const card = addBoardCard(
      researchCardFromHint(
        { type: "chart", symbol: "AAPL", interval: "1d", title: "AAPL · 1d" },
        { threadId: "t1", messageId: "m1" },
      ),
    );
    updateBoardCardBinding(card.id, {
      deskTileId: "tile-123",
      appWorkspaceId: "doc-test-1",
    });
    const updated = getActiveBoardSession().cards[0];
    expect(updated?.type).toBe("chart");
    if (updated?.type === "chart") {
      expect(updated.deskTileId).toBe("tile-123");
      expect(updated.appWorkspaceId).toBe("doc-test-1");
    }
  });
});

describe("applySurfaceFocusOrOpen promote helper path", () => {
  it("focuses existing chart tile on default workspace doc", () => {
    const doc = getActiveDocument(createDefaultWorkspacesState());
    const result = applySurfaceFocusOrOpen(doc, "chart", { region: "right" });
    expect(result.openedNew).toBe(false);
    expect(result.doc.activeTileId).toBeTruthy();
    expect(Object.values(result.doc.tiles).some((tile) => tile.surfaceId === "chart")).toBe(true);
  });
});
