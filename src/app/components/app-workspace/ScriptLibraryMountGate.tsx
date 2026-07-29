"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAppWorkspace } from "./AppWorkspaceContext";
import type { AppWorkspaceDocument } from "@/lib/appWorkspace/types";
import { ScriptLibraryProvider } from "@/lib/scriptLibrary/ScriptLibraryContext";

type ScriptLibraryMountContextValue = {
  requestScriptLibrary: () => void;
  scriptLibraryMounted: boolean;
};

const ScriptLibraryMountContext = createContext<ScriptLibraryMountContextValue | null>(null);

function layoutHasScriptsTile(document: AppWorkspaceDocument): boolean {
  return Object.values(document.tiles).some((tile) => tile.surfaceId === "scripts");
}

export function useScriptLibraryMountRequest(): () => void {
  const ctx = useContext(ScriptLibraryMountContext);
  return ctx?.requestScriptLibrary ?? (() => {});
}

export function useScriptLibraryAutoMountFromLayout(
  hydrated: boolean,
  hasScriptIndicators: boolean,
): void {
  const requestScriptLibrary = useScriptLibraryMountRequest();

  useEffect(() => {
    if (!hydrated || !hasScriptIndicators) return;
    requestScriptLibrary();
  }, [hasScriptIndicators, hydrated, requestScriptLibrary]);
}

export function ScriptLibraryMountGate({ children }: { children: ReactNode }) {
  const { document, hydrated } = useAppWorkspace();
  const [requested, setRequested] = useState(false);

  const requestScriptLibrary = useCallback(() => {
    setRequested((prev) => prev || true);
  }, []);

  const shouldMount =
    requested || (hydrated && layoutHasScriptsTile(document));

  const mountContext = useMemo<ScriptLibraryMountContextValue>(
    () => ({
      requestScriptLibrary,
      scriptLibraryMounted: shouldMount,
    }),
    [requestScriptLibrary, shouldMount],
  );

  return (
    <ScriptLibraryMountContext.Provider value={mountContext}>
      <ScriptLibraryProvider active={shouldMount}>{children}</ScriptLibraryProvider>
    </ScriptLibraryMountContext.Provider>
  );
}
