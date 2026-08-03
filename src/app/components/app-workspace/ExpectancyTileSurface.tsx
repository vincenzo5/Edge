"use client";

import { useCallback, useMemo } from "react";

import ExpectancyApp, { defaultSurfaceParams } from "@/app/components/expectancy/ExpectancyApp";
import { useAppWorkspace } from "@/app/components/app-workspace/AppWorkspaceContext";
import type { ExpectancyMode, ExpectancySurfaceParams, TileSurfaceState } from "@/lib/appWorkspace/types";

type Props = {
  tileId: string;
  surfaceState?: TileSurfaceState;
};

function resolveExpectancyState(surfaceState?: TileSurfaceState): {
  mode: ExpectancyMode;
  params: ExpectancySurfaceParams;
} {
  return {
    mode: surfaceState?.expectancyMode ?? "deterministic",
    params: surfaceState?.expectancyParams ?? defaultSurfaceParams(),
  };
}

export default function ExpectancyTileSurface({ tileId, surfaceState }: Props) {
  const { document, updateWorkspaceTileSurfaceState } = useAppWorkspace();

  const { mode, params } = useMemo(() => {
    const tileState = document.tiles[tileId]?.surfaceState;
    return resolveExpectancyState(tileState ?? surfaceState);
  }, [document.tiles, surfaceState, tileId]);

  const onModeChange = useCallback(
    (nextMode: ExpectancyMode) => {
      updateWorkspaceTileSurfaceState(tileId, { expectancyMode: nextMode });
    },
    [tileId, updateWorkspaceTileSurfaceState],
  );

  const onParamsChange = useCallback(
    (patch: Partial<ExpectancySurfaceParams>) => {
      updateWorkspaceTileSurfaceState(tileId, {
        expectancyParams: {
          ...params,
          ...patch,
        },
      });
    },
    [params, tileId, updateWorkspaceTileSurfaceState],
  );

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
      data-testid="expectancy-tile-surface"
      data-workspace-expectancy-tile={tileId}
    >
      <ExpectancyApp
        mode={mode}
        params={params}
        onModeChange={onModeChange}
        onParamsChange={onParamsChange}
      />
    </div>
  );
}
