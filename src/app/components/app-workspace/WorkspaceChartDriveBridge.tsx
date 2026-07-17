"use client";

import { useEffect } from "react";

import { useChartActions } from "@/app/components/ChartActionsContext";
import { useOptionalWorkspaceDrive } from "./WorkspaceDriveContext";

/** Registers chart symbol loader with in-process workspace drive when embedded in App Workspace. */
export function WorkspaceChartDriveBridge() {
  const chartActions = useChartActions();
  const workspaceDrive = useOptionalWorkspaceDrive();

  useEffect(() => {
    if (!workspaceDrive) return;
    if (!chartActions) {
      workspaceDrive.registerDriveHandler(null);
      return;
    }
    workspaceDrive.registerDriveHandler(({ symbol, name, exchange }) => {
      chartActions.loadSymbolIntoActiveChart({
        symbol,
        name: name ?? symbol,
        exchange: exchange ?? "",
      });
    });
    return () => workspaceDrive.registerDriveHandler(null);
  }, [chartActions, workspaceDrive]);

  return null;
}
