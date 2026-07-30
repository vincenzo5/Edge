import { buildWorkspaceDeepLink } from "@/lib/appWorkspace/deepLinks";

import type { ResearchCardSketch } from "./sessionSketch";

/** Resolve an Open target for a pinned evidence card. Returns null when no deep link applies. */
export function openResearchCardHref(card: ResearchCardSketch): string | null {
  switch (card.type) {
    case "chart": {
      const params = new URLSearchParams({
        symbol: card.symbol,
        interval: card.interval,
      });
      return `/chart?${params.toString()}`;
    }
    case "screener":
      return buildWorkspaceDeepLink({ surface: "screener", screenerView: "screens" });
    case "journalDraft":
      return buildWorkspaceDeepLink({ surface: "journal", journalView: "trades" });
    case "deskLink": {
      const params = new URLSearchParams();
      params.set("surface", "chart");
      if (card.tileId) {
        // Tile-scoped open when bound
        return `/workspace?${params.toString()}`;
      }
      return buildWorkspaceDeepLink({ surface: "chart" });
    }
    case "note":
    case "aiCallout":
    case "researchRun":
      return null;
    default: {
      const _exhaustive: never = card;
      return _exhaustive;
    }
  }
}

export function canOpenResearchCard(card: ResearchCardSketch): boolean {
  return openResearchCardHref(card) != null;
}
