"use client";

import { useEffect, useState } from "react";
import { resolveHomeWorkspaceTabs } from "@/lib/app/bootstrap/resolveHomeWorkspaceTabs";
import {
  buildActiveWorkspaceSummary,
  buildHomeWorkspaceSummaries,
  type HomeWorkspaceSummary,
} from "@/lib/app/buildHomeWorkspaceSummaries";
import {
  loadWorkspaceTabs,
  saveWorkspaceTabs,
} from "@/lib/app/workspaceTabsStorage";
import { fetchChartWorkspaces } from "@/lib/persistence/client/chartWorkspaceClient";

function applyTabsToSummaries(tabs: ReturnType<typeof loadWorkspaceTabs>) {
  return {
    summaries: buildHomeWorkspaceSummaries(tabs),
    activeSummary: buildActiveWorkspaceSummary(tabs),
  };
}

export function useHomeWorkspaceSummaries() {
  const [summaries, setSummaries] = useState<HomeWorkspaceSummary[]>([]);
  const [activeSummary, setActiveSummary] = useState<HomeWorkspaceSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const localTabs = loadWorkspaceTabs();
    const localSummaries = applyTabsToSummaries(localTabs);
    setSummaries(localSummaries.summaries);
    setActiveSummary(localSummaries.activeSummary);
    setLoaded(true);

    void (async () => {
      const result = await resolveHomeWorkspaceTabs({
        loadLocal: loadWorkspaceTabs,
        fetchRemoteList: fetchChartWorkspaces,
      });

      if (cancelled) return;

      if (result.remoteApplied) {
        saveWorkspaceTabs(result.tabs);
      }

      const mergedSummaries = applyTabsToSummaries(result.tabs);
      setSummaries(mergedSummaries.summaries);
      setActiveSummary(mergedSummaries.activeSummary);

      if (result.finishRemoteWorkspaceMerge) {
        const lateTabs = await result.finishRemoteWorkspaceMerge();
        if (cancelled || !lateTabs) return;
        saveWorkspaceTabs(lateTabs);
        const lateSummaries = applyTabsToSummaries(lateTabs);
        setSummaries(lateSummaries.summaries);
        setActiveSummary(lateSummaries.activeSummary);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { summaries, activeSummary, loaded };
}
