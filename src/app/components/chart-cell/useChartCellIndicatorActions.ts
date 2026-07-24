"use client";

import { useCallback } from "react";
import {
  createIndicatorInstance,
  createScriptIndicatorInstance,
  type CellConfig,
  type IndicatorConfig,
} from "@/lib/chartConfig";
import { defaultInputsFromSchema } from "@/lib/chart/indicatorInputs";
import type { IndicatorPlugin } from "@/lib/chart/plugin-api";
import type { useScriptLibraryOptional } from "@/lib/scriptLibrary/ScriptLibraryContext";
import type { useOptionalAppWorkspace } from "../app-workspace/AppWorkspaceContext";

type Params = {
  config: CellConfig;
  update: (patch: Partial<CellConfig>) => void;
  scriptLibrary: ReturnType<typeof useScriptLibraryOptional>;
  workspace: ReturnType<typeof useOptionalAppWorkspace>;
  requestScriptLibrary: () => void;
  setPickerOpen: (open: boolean) => void;
};

export function useChartCellIndicatorActions({
  config,
  update,
  scriptLibrary,
  workspace,
  requestScriptLibrary,
  setPickerOpen,
}: Params) {
  const addIndicator = useCallback(
    (ind: Pick<IndicatorConfig, "name" | "pane">) => {
      update({
        indicators: [...config.indicators, createIndicatorInstance(ind.name, ind.pane)],
      });
    },
    [config.indicators, update],
  );

  const addScriptIndicator = useCallback(
    (params: {
      scriptId: string;
      revision: string;
      name: string;
      pane: "main" | "sub";
    }) => {
      const manifest = scriptLibrary?.getRevisionManifest(params.scriptId, params.revision);
      const inputs = manifest
        ? defaultInputsFromSchema({ inputSchema: manifest.inputs } as IndicatorPlugin)
        : undefined;
      update({
        indicators: [
          ...config.indicators,
          createScriptIndicatorInstance({ ...params, inputs }),
        ],
      });
      setPickerOpen(false);
    },
    [config.indicators, scriptLibrary, update, setPickerOpen],
  );

  const openScriptsTile = useCallback(
    (scriptId?: string) => {
      workspace?.focusOrOpenSurface("scripts", {
        region: "right",
        surfaceState: scriptId ? { selectedScriptId: scriptId } : undefined,
      });
    },
    [workspace],
  );

  const handleNewScript = useCallback(() => {
    requestScriptLibrary();
    if (!scriptLibrary) return;
    void scriptLibrary.createScript().then((entry) => {
      setPickerOpen(false);
      openScriptsTile(entry.scriptId);
    });
  }, [openScriptsTile, requestScriptLibrary, scriptLibrary, setPickerOpen]);

  const handleEditScript = useCallback(
    (scriptId: string) => {
      setPickerOpen(false);
      openScriptsTile(scriptId);
    },
    [openScriptsTile, setPickerOpen],
  );

  const removeIndicator = useCallback(
    (id: string) => {
      update({
        indicators: config.indicators.filter((i) => i.id !== id),
      });
    },
    [config.indicators, update],
  );

  return {
    addIndicator,
    addScriptIndicator,
    removeIndicator,
    handleNewScript,
    handleEditScript,
  };
}
