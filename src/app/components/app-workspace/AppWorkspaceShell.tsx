"use client";

import { useEffect, type ReactNode } from "react";

import AppModuleShell from "@/app/components/home/AppModuleShell";
import ModuleRouteTracker from "@/app/components/home/ModuleRouteTracker";
import { AppWorkspaceProvider, useAppWorkspace } from "./AppWorkspaceContext";
import LayoutTreeView from "./LayoutTreeView";
import WorkspaceBrowserTabQuote from "./WorkspaceBrowserTabQuote";
import WorkspaceHeaderControls from "./WorkspaceHeaderControls";
import { WorkspaceDriveProvider } from "./WorkspaceDriveContext";

type Props = {
  children?: ReactNode;
};

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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-2">
      <LayoutTreeView />
    </div>
  );
}

function WorkspaceEscListener() {
  const { layoutEditMode, setLayoutEditMode } = useAppWorkspace();

  useEffect(() => {
    if (layoutEditMode !== "edit") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLayoutEditMode("use");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [layoutEditMode, setLayoutEditMode]);

  return null;
}

function WorkspaceChrome({ children }: { children?: ReactNode }) {
  return (
    <AppModuleShell
      testId="workspace-page"
      headerCenter={<WorkspaceHeaderControls />}
    >
      <ModuleRouteTracker module="workspace" />
      <WorkspaceEscListener />
      <WorkspaceBrowserTabQuote />
      <WorkspaceBody />
      {children}
    </AppModuleShell>
  );
}

export default function AppWorkspaceShell({ children }: Props) {
  return (
    <AppWorkspaceProvider>
      <WorkspaceDriveProvider>
        <WorkspaceChrome>{children}</WorkspaceChrome>
      </WorkspaceDriveProvider>
    </AppWorkspaceProvider>
  );
}
