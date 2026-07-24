"use client";

import { useCallback, useState } from "react";

import { fetchMarketMoverResults, fetchScreenerResults } from "@/lib/chartDataFeed/apiScreenerFeed";
import { loadScreenerState } from "@/lib/screener/screenStorage";
import {
  isSavedMoversScreen,
  isSavedScreenerScreen,
  type ScreenQuery,
} from "@/lib/screener/types";
import type { ResearchCardSketch } from "@/lib/research/sessionSketch";

type ScreenerResearchCardSketch = Extract<ResearchCardSketch, { type: "screener" }>;

import { EdgeButton } from "../design-system";

type Props = {
  card: ScreenerResearchCardSketch;
};

function resolveSavedScreen(card: ScreenerResearchCardSketch) {
  const state = loadScreenerState();
  if (!card.savedScreenId) return null;
  return state.savedScreens.find((screen) => screen.id === card.savedScreenId) ?? null;
}

function resolveScreenerQuery(card: ScreenerResearchCardSketch): ScreenQuery {
  const state = loadScreenerState();
  const saved = resolveSavedScreen(card);
  if (saved && isSavedScreenerScreen(saved)) return saved.query;
  return state.query ?? { limit: 50 };
}

export default function BoardScreenerCardHost({ card }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [summary, setSummary] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const saved = resolveSavedScreen(card);
      const result =
        saved && isSavedMoversScreen(saved)
          ? await fetchMarketMoverResults({
              kind: saved.moverKind,
              limit: saved.limit ?? 50,
            })
          : await fetchScreenerResults(resolveScreenerQuery(card));
      const top = result.rows.slice(0, 3).map((row) => row.symbol);
      const label = card.queryLabel ?? "Screener";
      setSummary(
        top.length > 0
          ? `${result.rows.length} hits · ${top.join(", ")}${result.rows.length > 3 ? "…" : ""}`
          : `${label}: no matches`,
      );
      setStatus("ready");
    } catch {
      setStatus("error");
      setSummary("Refresh failed");
    }
  }, [card]);

  return (
    <div className="flex flex-col gap-2" data-testid={`board-screener-host-${card.id}`}>
      <p className="text-xs text-[var(--edge-text-secondary)]">
        {summary ?? card.queryLabel ?? "Screener pin"}
      </p>
      <EdgeButton
        type="button"
        variant="secondary"
        data-testid={`board-screener-refresh-${card.id}`}
        disabled={status === "loading"}
        onClick={() => void refresh()}
      >
        {status === "loading" ? "Refreshing…" : "Refresh"}
      </EdgeButton>
    </div>
  );
}
