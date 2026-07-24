"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

export type WorkspaceDriveSymbol = {
  symbol: string;
  name?: string;
  exchange?: string;
};

export type WorkspaceScriptApplyParams = {
  scriptId: string;
  revision: string;
  name: string;
  pane: "main" | "sub";
};

type WorkspaceDriveContextValue = {
  driveSymbol: (params: WorkspaceDriveSymbol) => void;
  registerDriveHandler: (handler: ((params: WorkspaceDriveSymbol) => void) | null) => void;
  applyScriptToActiveChart: (params: WorkspaceScriptApplyParams) => void;
  registerScriptApplyHandler: (
    handler: ((params: WorkspaceScriptApplyParams) => void) | null,
  ) => void;
};

const WorkspaceDriveContext = createContext<WorkspaceDriveContextValue | null>(null);

export function WorkspaceDriveProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<((params: WorkspaceDriveSymbol) => void) | null>(null);
  const scriptApplyRef = useRef<((params: WorkspaceScriptApplyParams) => void) | null>(null);

  const registerDriveHandler = useCallback(
    (handler: ((params: WorkspaceDriveSymbol) => void) | null) => {
      handlerRef.current = handler;
    },
    [],
  );

  const registerScriptApplyHandler = useCallback(
    (handler: ((params: WorkspaceScriptApplyParams) => void) | null) => {
      scriptApplyRef.current = handler;
    },
    [],
  );

  const driveSymbol = useCallback((params: WorkspaceDriveSymbol) => {
    handlerRef.current?.(params);
  }, []);

  const applyScriptToActiveChart = useCallback((params: WorkspaceScriptApplyParams) => {
    scriptApplyRef.current?.(params);
  }, []);

  const value = useMemo(
    () => ({
      driveSymbol,
      registerDriveHandler,
      applyScriptToActiveChart,
      registerScriptApplyHandler,
    }),
    [applyScriptToActiveChart, driveSymbol, registerDriveHandler, registerScriptApplyHandler],
  );

  return (
    <WorkspaceDriveContext.Provider value={value}>{children}</WorkspaceDriveContext.Provider>
  );
}

export function useWorkspaceDrive(): WorkspaceDriveContextValue {
  const ctx = useContext(WorkspaceDriveContext);
  if (!ctx) {
    throw new Error("useWorkspaceDrive must be used within WorkspaceDriveProvider");
  }
  return ctx;
}

export function useOptionalWorkspaceDrive(): WorkspaceDriveContextValue | null {
  return useContext(WorkspaceDriveContext);
}
