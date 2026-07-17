"use client";

import { useEffect, useMemo } from "react";

import { clearBrowserTabQuote } from "@/lib/app/browserTabQuote";
import { primaryChartTileId } from "@/lib/appWorkspace";
import { useAppWorkspace } from "./AppWorkspaceContext";

/** Clears browser tab quote when the workspace has no chart tile. */
export default function WorkspaceBrowserTabQuote() {
  const { document, hydrated } = useAppWorkspace();
  const primaryChartId = useMemo(() => primaryChartTileId(document), [document]);

  useEffect(() => {
    if (!hydrated) return;
    if (!primaryChartId) {
      clearBrowserTabQuote();
    }
  }, [hydrated, primaryChartId]);

  return null;
}
