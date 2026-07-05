"use client";

import { useEffect } from "react";
import { EdgeSegmentedTabs } from "../design-system";
import HomeJournalPanel from "./HomeJournalPanel";
import HomeResearchPanel from "./HomeResearchPanel";

export type HomeSidePanel = "journal" | "research";

type Props = {
  open: boolean;
  panel: HomeSidePanel;
  onPanelChange: (panel: HomeSidePanel) => void;
  onClose: () => void;
};

export default function HomeModuleDrawer({ open, panel, onPanelChange, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div data-testid="home-module-drawer" className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close module panel"
        data-testid="home-module-drawer-backdrop"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-[min(100%,24rem)] flex-col border-l border-[var(--edge-border)] bg-[var(--edge-surface-panel)] shadow-xl">
        <div className="border-b border-[var(--edge-border)] p-3">
          <EdgeSegmentedTabs
            segments={[
              { id: "journal", label: "Journal" },
              { id: "research", label: "Research" },
            ]}
            value={panel}
            onChange={(id) => onPanelChange(id as HomeSidePanel)}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {panel === "journal" ? <HomeJournalPanel /> : <HomeResearchPanel />}
        </div>
      </aside>
    </div>
  );
}
