"use client";

import { useEffect, useState } from "react";
import { loadWorkspaceTabs } from "@/lib/app/workspaceTabsStorage";
import {
  buildActiveWorkspaceSummary,
  buildHomeWorkspaceSummaries,
  type HomeWorkspaceSummary,
} from "@/lib/app/buildHomeWorkspaceSummaries";

export function useHomeWorkspaceSummaries() {
  const [summaries, setSummaries] = useState<HomeWorkspaceSummary[]>([]);
  const [activeSummary, setActiveSummary] = useState<HomeWorkspaceSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const state = loadWorkspaceTabs();
    setSummaries(buildHomeWorkspaceSummaries(state));
    setActiveSummary(buildActiveWorkspaceSummary(state));
    setLoaded(true);
  }, []);

  return { summaries, activeSummary, loaded };
}
