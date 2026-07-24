"use client";

import { useCallback, useMemo } from "react";

import ScriptEditorPane from "@/app/components/scripts/ScriptEditorPane";
import ScriptsLibraryRail from "@/app/components/scripts/ScriptsLibraryRail";
import ScriptsTileNav from "@/app/components/scripts/ScriptsTileNav";
import { useTileDensityOptional } from "@/app/components/app-workspace/TileDensityContext";
import { useOptionalWorkspaceDrive } from "@/app/components/app-workspace/WorkspaceDriveContext";
import { useAppWorkspace } from "@/app/components/app-workspace/AppWorkspaceContext";
import { useScriptLibraryOptional } from "@/lib/scriptLibrary/ScriptLibraryContext";
import { primaryChartTileId } from "@/lib/appWorkspace/primaryChartTile";
import type { TileSurfaceState } from "@/lib/appWorkspace/types";

type Props = {
  tileId: string;
  surfaceState?: TileSurfaceState;
};

export default function ScriptsTileSurface({ tileId, surfaceState }: Props) {
  const { document, updateWorkspaceTileSurfaceState } = useAppWorkspace();
  const library = useScriptLibraryOptional();
  const workspaceDrive = useOptionalWorkspaceDrive();
  const density = useTileDensityOptional()?.mode ?? "standard";

  const selectedScriptId =
    document.tiles[tileId]?.surfaceState?.selectedScriptId ??
    surfaceState?.selectedScriptId ??
    null;

  const hasChartTile = useMemo(() => primaryChartTileId(document) != null, [document]);

  const setSelectedScriptId = useCallback(
    (scriptId: string | null) => {
      updateWorkspaceTileSurfaceState(tileId, {
        selectedScriptId: scriptId || undefined,
      });
    },
    [tileId, updateWorkspaceTileSurfaceState],
  );

  const handleCreateScript = useCallback(() => {
    if (!library) return;
    void library.createScript().then((entry) => {
      setSelectedScriptId(entry.scriptId);
    });
  }, [library, setSelectedScriptId]);

  const handleApplyToChart = useCallback(
    (params: {
      scriptId: string;
      revision: string;
      name: string;
      pane: "main" | "sub";
    }) => {
      workspaceDrive?.applyScriptToActiveChart(params);
    },
    [workspaceDrive],
  );

  const stackLayout = density === "compact";

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
      data-testid="scripts-tile-surface"
    >
      <ScriptsTileNav onNewScript={handleCreateScript} />
      <div
        className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${
          stackLayout ? "flex-col" : "flex-row"
        }`}
      >
        <ScriptsLibraryRail
          selectedScriptId={selectedScriptId}
          onSelectScript={(scriptId) => setSelectedScriptId(scriptId || null)}
          onCreateScript={handleCreateScript}
          stacked={stackLayout}
        />
        <ScriptEditorPane
          scriptId={selectedScriptId}
          onApplyToChart={handleApplyToChart}
          applyDisabled={!hasChartTile}
          applyDisabledReason={hasChartTile ? undefined : "Add a Chart tile to apply scripts"}
        />
      </div>
    </div>
  );
}
