"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveHomeLayoutMode, type HomeLayoutMode } from "@/lib/app/homeLayout";
import { useElementSize } from "@/lib/responsive/useElementSize";
import { EdgeSegmentedTabs } from "../design-system";
import AppModuleShell from "./AppModuleShell";
import HomeContinueCard from "./HomeContinueCard";
import HomeHubCards from "./HomeHubCards";
import HomeJournalPanel from "./HomeJournalPanel";
import HomeModuleDrawer, { type HomeSidePanel } from "./HomeModuleDrawer";
import HomeResearchPanel from "./HomeResearchPanel";
import HomeWorkspaceCards from "./HomeWorkspaceCards";
import ModuleRouteTracker from "./ModuleRouteTracker";
import { useHomeWorkspaceSummaries } from "./useHomeWorkspaceSummaries";

function ChartsZone({
  layoutMode,
  summaries,
  activeSummary,
  loaded,
  onOpenDrawer,
}: {
  layoutMode: HomeLayoutMode;
  summaries: ReturnType<typeof useHomeWorkspaceSummaries>["summaries"];
  activeSummary: ReturnType<typeof useHomeWorkspaceSummaries>["activeSummary"];
  loaded: boolean;
  onOpenDrawer?: (panel: HomeSidePanel) => void;
}) {
  return (
    <div data-testid="home-charts-zone" className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto p-4">
      <HomeContinueCard summary={activeSummary} loaded={loaded} />
      <HomeWorkspaceCards summaries={summaries} layoutMode={layoutMode} />
      {layoutMode === "main-drawer" && onOpenDrawer ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="home-module-chip-journal"
            onClick={() => onOpenDrawer("journal")}
            className="rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-3 py-1.5 text-sm text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)]"
          >
            Journal
          </button>
          <button
            type="button"
            data-testid="home-module-chip-research"
            onClick={() => onOpenDrawer("research")}
            className="rounded-[var(--edge-radius-sm)] border border-[var(--edge-border)] bg-[var(--edge-surface-panel)] px-3 py-1.5 text-sm text-[var(--edge-text-primary)] hover:bg-[var(--edge-surface-hover)]"
          >
            Research
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function HomeShell() {
  const [shellRef, shellSize] = useElementSize<HTMLDivElement>();
  const [previousMode, setPreviousMode] = useState<HomeLayoutMode | undefined>(undefined);
  const [sideTab, setSideTab] = useState<HomeSidePanel>("journal");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPanel, setDrawerPanel] = useState<HomeSidePanel>("journal");
  const { summaries, activeSummary, loaded } = useHomeWorkspaceSummaries();

  const layoutMode = useMemo(
    () => resolveHomeLayoutMode(shellSize.width || 1440, previousMode),
    [shellSize.width, previousMode],
  );

  useEffect(() => {
    setPreviousMode(layoutMode);
  }, [layoutMode]);

  const openDrawer = (panel: HomeSidePanel) => {
    setDrawerPanel(panel);
    setDrawerOpen(true);
  };

  return (
    <AppModuleShell
      shellRef={shellRef}
      testId="home-shell"
      data-home-layout-mode={layoutMode}
    >
      <ModuleRouteTracker module="home" />

      {layoutMode === "tri-pane" ? (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)_minmax(280px,1fr)]">
          <ChartsZone
            layoutMode={layoutMode}
            summaries={summaries}
            activeSummary={activeSummary}
            loaded={loaded}
          />
          <div className="flex h-full min-h-0 flex-col border-l border-[var(--edge-border)] p-3">
            <HomeJournalPanel />
          </div>
          <div className="flex h-full min-h-0 flex-col border-l border-[var(--edge-border)] p-3">
            <HomeResearchPanel />
          </div>
        </div>
      ) : null}

      {layoutMode === "dual-stack" ? (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
          <ChartsZone
            layoutMode={layoutMode}
            summaries={summaries}
            activeSummary={activeSummary}
            loaded={loaded}
          />
          <div className="grid min-h-0 grid-rows-2 border-l border-[var(--edge-border)]">
            <div className="flex h-full min-h-0 flex-col border-b border-[var(--edge-border)] p-3">
              <HomeJournalPanel />
            </div>
            <div className="flex h-full min-h-0 flex-col p-3">
              <HomeResearchPanel />
            </div>
          </div>
        </div>
      ) : null}

      {layoutMode === "dual-tabbed" ? (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
          <ChartsZone
            layoutMode={layoutMode}
            summaries={summaries}
            activeSummary={activeSummary}
            loaded={loaded}
          />
          <div className="flex min-h-0 flex-col border-l border-[var(--edge-border)] p-3">
            <EdgeSegmentedTabs
              className="mb-3 shrink-0"
              segments={[
                { id: "journal", label: "Journal" },
                { id: "research", label: "Research" },
              ]}
              value={sideTab}
              onChange={(id) => setSideTab(id as HomeSidePanel)}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              {sideTab === "journal" ? <HomeJournalPanel /> : <HomeResearchPanel />}
            </div>
          </div>
        </div>
      ) : null}

      {layoutMode === "main-drawer" ? (
        <>
          <ChartsZone
            layoutMode={layoutMode}
            summaries={summaries}
            activeSummary={activeSummary}
            loaded={loaded}
            onOpenDrawer={openDrawer}
          />
          <HomeModuleDrawer
            open={drawerOpen}
            panel={drawerPanel}
            onPanelChange={setDrawerPanel}
            onClose={() => setDrawerOpen(false)}
          />
        </>
      ) : null}

      {layoutMode === "hub" ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <HomeContinueCard summary={activeSummary} loaded={loaded} />
            <HomeHubCards />
            <HomeWorkspaceCards summaries={summaries} layoutMode={layoutMode} />
          </div>
        </div>
      ) : null}
    </AppModuleShell>
  );
}
