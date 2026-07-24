import { getActiveLayout } from "@/lib/app/workspaceTabs";
import { loadWorkspaceTabs } from "@/lib/app/workspaceTabsStorage";
import {
  applySurfaceFocusOrOpen,
  getActiveDocument,
  saveDocument,
  setActiveTile,
} from "@/lib/appWorkspace/commands";
import { buildWorkspaceDeepLink } from "@/lib/appWorkspace/deepLinks";
import {
  loadAppWorkspacesState,
  saveAppWorkspacesState,
} from "@/lib/appWorkspace/storage";
import type { TileSurfaceState } from "@/lib/appWorkspace/types";

import { addBoardCard, updateBoardCardBinding } from "./boardSessionStore";
import { researchCardSketchSchema, type ResearchCardSketch } from "./sessionSketch";

function createBoardCardId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type PromoteResult = {
  href: string;
  tileId: string;
  appWorkspaceId: string;
};

function persistWorkspaceMutation(
  mutate: (doc: ReturnType<typeof getActiveDocument>) => ReturnType<typeof applySurfaceFocusOrOpen>["doc"],
): { tileId: string; appWorkspaceId: string } | null {
  const state = loadAppWorkspacesState();
  const doc = getActiveDocument(state);
  const nextDoc = mutate(doc);
  const nextState = saveDocument(state, nextDoc);
  saveAppWorkspacesState(nextState);
  const tileId = nextDoc.activeTileId;
  if (!tileId) return null;
  return { tileId, appWorkspaceId: nextDoc.id };
}

/** Promote a board card to a Desk tile and return navigation target + binding ids. */
export function promoteResearchCardToDesk(card: ResearchCardSketch): PromoteResult | null {
  switch (card.type) {
    case "chart": {
      const persisted = persistWorkspaceMutation((doc) =>
        applySurfaceFocusOrOpen(doc, "chart", { region: "right" }).doc,
      );
      if (!persisted) return null;

      const params = new URLSearchParams();
      params.set("surface", "chart");
      params.set("symbol", card.symbol.trim().toUpperCase());
      params.set("interval", card.interval);

      updateBoardCardBinding(card.id, {
        deskTileId: persisted.tileId,
        appWorkspaceId: persisted.appWorkspaceId,
        chartWorkspaceId: card.chartWorkspaceId,
      });

      return {
        href: `/workspace?${params.toString()}`,
        tileId: persisted.tileId,
        appWorkspaceId: persisted.appWorkspaceId,
      };
    }
    case "screener": {
      const surfaceState: TileSurfaceState = { screenerView: "screens" };
      const persisted = persistWorkspaceMutation((doc) =>
        applySurfaceFocusOrOpen(doc, "screener", { region: "right", surfaceState }).doc,
      );
      if (!persisted) return null;

      updateBoardCardBinding(card.id, {
        deskTileId: persisted.tileId,
        appWorkspaceId: persisted.appWorkspaceId,
      });

      return {
        href: buildWorkspaceDeepLink({ surface: "screener", screenerView: "screens" }),
        tileId: persisted.tileId,
        appWorkspaceId: persisted.appWorkspaceId,
      };
    }
    case "journalDraft": {
      const surfaceState: TileSurfaceState = { journalView: "trades" };
      const persisted = persistWorkspaceMutation((doc) =>
        applySurfaceFocusOrOpen(doc, "journal", { region: "right", surfaceState }).doc,
      );
      if (!persisted) return null;

      updateBoardCardBinding(card.id, {
        deskTileId: persisted.tileId,
        appWorkspaceId: persisted.appWorkspaceId,
      });

      return {
        href: buildWorkspaceDeepLink({ surface: "journal", journalView: "trades" }),
        tileId: persisted.tileId,
        appWorkspaceId: persisted.appWorkspaceId,
      };
    }
    case "deskLink": {
      const persisted = persistWorkspaceMutation((doc) => {
        if (card.tileId && doc.tiles[card.tileId]) {
          return setActiveTile(doc, card.tileId);
        }
        return applySurfaceFocusOrOpen(doc, "chart", { region: "right" }).doc;
      });
      if (!persisted) return null;

      const doc = getActiveDocument(loadAppWorkspacesState());
      const tileId = card.tileId && doc.tiles[card.tileId] ? card.tileId : persisted.tileId;
      const tile = doc.tiles[tileId];
      const href =
        tile?.surfaceId === "screener"
          ? buildWorkspaceDeepLink({
              surface: "screener",
              screenerView: tile.surfaceState?.screenerView ?? "screens",
            })
          : tile?.surfaceId === "journal"
            ? buildWorkspaceDeepLink({
                surface: "journal",
                journalView: tile.surfaceState?.journalView ?? "trades",
              })
            : buildWorkspaceDeepLink({ surface: tile?.surfaceId ?? "chart" });

      updateBoardCardBinding(card.id, {
        deskTileId: tileId,
        appWorkspaceId: persisted.appWorkspaceId,
      });

      return {
        href,
        tileId,
        appWorkspaceId: persisted.appWorkspaceId,
      };
    }
    default:
      return null;
  }
}

export function canPromoteResearchCard(card: ResearchCardSketch): boolean {
  switch (card.type) {
    case "chart":
    case "screener":
    case "journalDraft":
    case "deskLink":
      return true;
    default:
      return false;
  }
}

export type DemoteChartTileOptions = {
  tileId: string;
  isPrimaryChartTile: boolean;
  chartWorkspaceId?: string;
  appWorkspaceId?: string;
};

/** Create a board chart card from an active Desk chart tile (demote / Send to board). */
export function demoteChartTileToBoard(options: DemoteChartTileOptions): ResearchCardSketch {
  const tabs = loadWorkspaceTabs({
    tileId: options.tileId,
    isPrimaryChartTile: options.isPrimaryChartTile,
  });
  const layout = getActiveLayout(tabs);
  const cell = layout.cells[layout.activeCellIndex] ?? layout.cells[0];
  const symbol = cell?.symbol?.trim().toUpperCase() ?? "AAPL";
  const interval = cell?.interval ?? "1d";

  return addBoardCard(
    researchCardSketchSchema.parse({
      id: createBoardCardId(),
      source: "user",
      type: "chart",
      symbol,
      interval,
      deskTileId: options.tileId,
      appWorkspaceId: options.appWorkspaceId,
      chartWorkspaceId: options.chartWorkspaceId,
    }),
  );
}

/** Patch demoted chart card with Desk tile binding after addBoardCard. */
export function bindDemotedChartCard(
  card: ResearchCardSketch,
  options: DemoteChartTileOptions,
): void {
  updateBoardCardBinding(card.id, {
    deskTileId: options.tileId,
    appWorkspaceId: options.appWorkspaceId,
    chartWorkspaceId: options.chartWorkspaceId,
  });
}

export function demoteAndBindChartTileToBoard(options: DemoteChartTileOptions): ResearchCardSketch {
  const card = demoteChartTileToBoard(options);
  bindDemotedChartCard(card, options);
  return card;
}
