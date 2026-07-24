"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { TileSurfaceState } from "@/lib/appWorkspace/types";

export type JournalView = NonNullable<TileSurfaceState["journalView"]>;
export type JournalListView = Exclude<JournalView, "settings">;

export type JournalTileViewContextValue = {
  view: JournalView;
  /** Last Dashboard / Trades / Open view — kept while settings is open so chrome stays stable. */
  listView: JournalListView;
  setView: (view: JournalView) => void;
};

const JournalTileViewContext = createContext<JournalTileViewContextValue | null>(null);

export function JournalTileViewProvider({
  children,
  view,
  listView,
  setView,
}: {
  children: ReactNode;
  view: JournalView;
  listView: JournalListView;
  setView: (view: JournalView) => void;
}) {
  return (
    <JournalTileViewContext.Provider value={{ view, listView, setView }}>
      {children}
    </JournalTileViewContext.Provider>
  );
}

export function useJournalTileViewOptional(): JournalTileViewContextValue | null {
  return useContext(JournalTileViewContext);
}

export function useJournalTileView(): JournalTileViewContextValue {
  const ctx = useContext(JournalTileViewContext);
  if (!ctx) {
    throw new Error("useJournalTileView must be used within JournalTileViewProvider");
  }
  return ctx;
}

export function isJournalListView(view: string): view is JournalListView {
  return view === "dashboard" || view === "trades" || view === "open";
}
