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

type WorkspaceDriveContextValue = {
  driveSymbol: (params: WorkspaceDriveSymbol) => void;
  registerDriveHandler: (handler: ((params: WorkspaceDriveSymbol) => void) | null) => void;
};

const WorkspaceDriveContext = createContext<WorkspaceDriveContextValue | null>(null);

export function WorkspaceDriveProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<((params: WorkspaceDriveSymbol) => void) | null>(null);

  const registerDriveHandler = useCallback(
    (handler: ((params: WorkspaceDriveSymbol) => void) | null) => {
      handlerRef.current = handler;
    },
    [],
  );

  const driveSymbol = useCallback((params: WorkspaceDriveSymbol) => {
    handlerRef.current?.(params);
  }, []);

  const value = useMemo(
    () => ({ driveSymbol, registerDriveHandler }),
    [driveSymbol, registerDriveHandler],
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
