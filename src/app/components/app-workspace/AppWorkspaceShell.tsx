"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import ModuleRouteTracker from "@/app/components/home/ModuleRouteTracker";
import { useRegisterHeaderCenterSlot } from "@/app/components/home/HeaderCenterSlot";
import { ActiveChartProvider } from "@/app/components/ActiveChartContext";
import { ScriptLibraryMountGate } from "./ScriptLibraryMountGate";
import { AppWorkspaceProvider, useAppWorkspace } from "./AppWorkspaceContext";
import LayoutTreeView from "./LayoutTreeView";
import WorkspaceBrowserTabQuote from "./WorkspaceBrowserTabQuote";
import WorkspaceHeaderControls from "./WorkspaceHeaderControls";
import WorkspacePanelContextMenu from "./WorkspacePanelContextMenu";
import { WorkspaceDriveProvider } from "./WorkspaceDriveContext";

type Props = {
  children?: ReactNode;
};

function WorkspaceHeaderRegistration() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const headerSlot = useMemo(
    () => (
      <div
        ref={setPortalTarget}
        data-testid="workspace-header-controls-portal"
        className="flex min-w-0 flex-1 items-center justify-center"
      />
    ),
    [],
  );
  useRegisterHeaderCenterSlot(headerSlot);

  if (!portalTarget) return null;
  return createPortal(<WorkspaceHeaderControls />, portalTarget);
}

function WorkspaceBody() {
  const { hydrated } = useAppWorkspace();

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--edge-text-muted)]">
        Loading workspace…
      </div>
    );
  }

  return (
    <ActiveChartProvider>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <LayoutTreeView />
      </div>
    </ActiveChartProvider>
  );
}

function WorkspaceEscListener() {
  const { layoutEditMode, requestExitLayoutEdit } = useAppWorkspace();

  useEffect(() => {
    if (layoutEditMode !== "edit") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestExitLayoutEdit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [layoutEditMode, requestExitLayoutEdit]);

  return null;
}

export default function AppWorkspaceShell({ children }: Props) {
  return (
    <AppWorkspaceProvider>
      <ScriptLibraryMountGate>
        <WorkspaceDriveProvider>
          <div
            data-testid="workspace-page"
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          >
            <WorkspaceHeaderRegistration />
            <ModuleRouteTracker module="workspace" />
            <WorkspaceEscListener />
            <WorkspaceBrowserTabQuote />
            <WorkspacePanelContextMenu />
            <WorkspaceBody />
            {children}
          </div>
        </WorkspaceDriveProvider>
      </ScriptLibraryMountGate>
    </AppWorkspaceProvider>
  );
}
