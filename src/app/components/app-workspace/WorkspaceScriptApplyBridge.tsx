"use client";

import { useEffect } from "react";

import { useChartActions } from "@/app/components/ChartActionsContext";
import { useOptionalWorkspaceDrive } from "./WorkspaceDriveContext";

/** Registers active-chart script apply handler with in-process workspace drive. */
export function WorkspaceScriptApplyBridge() {
  const chartActions = useChartActions();
  const workspaceDrive = useOptionalWorkspaceDrive();

  useEffect(() => {
    if (!workspaceDrive) return;
    if (!chartActions?.addScriptIndicatorToActiveChart) {
      workspaceDrive.registerScriptApplyHandler(null);
      return;
    }
    workspaceDrive.registerScriptApplyHandler((params) => {
      chartActions.addScriptIndicatorToActiveChart?.(params);
    });
    return () => workspaceDrive.registerScriptApplyHandler(null);
  }, [chartActions, workspaceDrive]);

  return null;
}
