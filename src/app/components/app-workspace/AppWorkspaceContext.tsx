"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  applySurfaceFocusOrOpen,
  applyLayoutPreset,
  assignTileSurface,
  closeTile,
  createDefaultWorkspacesState,
  createWorkspaceDocument,
  duplicateDocument,
  getActiveDocument,
  loadDocument,
  moveTile,
  openSurface,
  renameDocument,
  resizeSplit,
  saveDocument,
  setActiveTile,
  updateTileSurfaceState,
} from "@/lib/appWorkspace/commands";
import {
  loadAppWorkspacesState,
  saveAppWorkspacesState,
} from "@/lib/appWorkspace/storage";
import type {
  AppWorkspaceDocument,
  AppWorkspacesState,
  DropEdge,
  SurfaceId,
  TileSurfaceState,
} from "@/lib/appWorkspace/types";
import type { AssignableSurfaceId } from "@/lib/appWorkspace/commands";
import type { WorkspaceLayoutPresetId } from "@/lib/appWorkspace/layoutPresets";

export type LayoutEditMode = "use" | "edit";

type AppWorkspaceContextValue = {
  state: AppWorkspacesState;
  document: AppWorkspaceDocument;
  hydrated: boolean;
  layoutEditMode: LayoutEditMode;
  setLayoutEditMode: (mode: LayoutEditMode) => void;
  toggleLayoutEditMode: () => void;
  openSurfaceInWorkspace: (
    surfaceId: SurfaceId,
    options?: { region?: DropEdge; surfaceState?: TileSurfaceState; targetTileId?: string },
  ) => void;
  focusOrOpenSurface: (
    surfaceId: SurfaceId,
    options?: { region?: DropEdge; surfaceState?: TileSurfaceState },
  ) => void;
  handleSurfaceIngress: (
    surfaceId: SurfaceId,
    options?: { region?: DropEdge; surfaceState?: TileSurfaceState },
  ) => void;
  closeWorkspaceTile: (tileId: string) => void;
  setWorkspaceActiveTile: (tileId: string) => void;
  resizeWorkspaceSplit: (splitId: string, sizes: [number, number]) => void;
  moveWorkspaceTile: (sourceTileId: string, targetTileId: string, edge: DropEdge) => void;
  switchWorkspaceDocument: (documentId: string) => void;
  createWorkspaceDocument: (name?: string) => void;
  duplicateWorkspaceDocument: (name?: string) => void;
  renameWorkspaceDocument: (name: string) => void;
  updateWorkspaceTileSurfaceState: (tileId: string, surfaceState: TileSurfaceState) => void;
  applyWorkspaceLayoutPreset: (presetId: WorkspaceLayoutPresetId) => void;
  assignWorkspaceTileSurface: (tileId: string, surfaceId: AssignableSurfaceId) => void;
};

const AppWorkspaceContext = createContext<AppWorkspaceContextValue | null>(null);

export function AppWorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppWorkspacesState>(() => createDefaultWorkspacesState());
  const [hydrated, setHydrated] = useState(false);
  const [layoutEditMode, setLayoutEditMode] = useState<LayoutEditMode>("use");
  const hydratedRef = useRef(false);

  useEffect(() => {
    setState(loadAppWorkspacesState());
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => saveAppWorkspacesState(state), 400);
    return () => clearTimeout(t);
  }, [state]);

  const document = useMemo(() => getActiveDocument(state), [state]);

  const updateDocument = useCallback((updater: (doc: AppWorkspaceDocument) => AppWorkspaceDocument) => {
    setState((prev) => saveDocument(prev, updater(getActiveDocument(prev))));
  }, []);

  const openSurfaceInWorkspace = useCallback(
    (
      surfaceId: SurfaceId,
      options?: { region?: DropEdge; surfaceState?: TileSurfaceState; targetTileId?: string },
    ) => {
      updateDocument((doc) =>
        openSurface(doc, surfaceId, {
          region: options?.region,
          surfaceState: options?.surfaceState,
          targetTileId: options?.targetTileId ?? doc.activeTileId,
        }),
      );
    },
    [updateDocument],
  );

  const focusOrOpenSurface = useCallback(
    (
      surfaceId: SurfaceId,
      options?: { region?: DropEdge; surfaceState?: TileSurfaceState },
    ) => {
      setState((prev) => {
        const current = getActiveDocument(prev);
        const result = applySurfaceFocusOrOpen(current, surfaceId, options);
        if (result.openedNew) {
          setLayoutEditMode((mode) => (mode === "use" ? "edit" : mode));
        }
        if (!result.changed) return prev;
        return saveDocument(prev, result.doc);
      });
    },
    [],
  );

  const handleSurfaceIngress = useCallback(
    (
      surfaceId: SurfaceId,
      options?: { region?: DropEdge; surfaceState?: TileSurfaceState },
    ) => {
      setState((prev) => {
        const current = getActiveDocument(prev);
        const result = applySurfaceFocusOrOpen(current, surfaceId, options);
        if (result.openedNew) {
          setLayoutEditMode("edit");
        }
        if (!result.changed) return prev;
        return saveDocument(prev, result.doc);
      });
    },
    [],
  );

  const toggleLayoutEditMode = useCallback(() => {
    setLayoutEditMode((prev) => (prev === "use" ? "edit" : "use"));
  }, []);

  const closeWorkspaceTile = useCallback(
    (tileId: string) => {
      updateDocument((doc) => closeTile(doc, tileId));
    },
    [updateDocument],
  );

  const setWorkspaceActiveTile = useCallback(
    (tileId: string) => {
      updateDocument((doc) => setActiveTile(doc, tileId));
    },
    [updateDocument],
  );

  const resizeWorkspaceSplit = useCallback(
    (splitId: string, sizes: [number, number]) => {
      updateDocument((doc) => resizeSplit(doc, splitId, sizes));
    },
    [updateDocument],
  );

  const moveWorkspaceTile = useCallback(
    (sourceTileId: string, targetTileId: string, edge: DropEdge) => {
      updateDocument((doc) => moveTile(doc, sourceTileId, targetTileId, edge));
    },
    [updateDocument],
  );

  const switchWorkspaceDocument = useCallback((documentId: string) => {
    setState((prev) => loadDocument(prev, documentId));
  }, []);

  const createWorkspaceDocumentHandler = useCallback((name?: string) => {
    setState((prev) => createWorkspaceDocument(prev, name));
  }, []);

  const duplicateWorkspaceDocument = useCallback((name?: string) => {
    setState((prev) => duplicateDocument(prev, prev.activeDocumentId, name));
  }, []);

  const renameWorkspaceDocument = useCallback(
    (name: string) => {
      setState((prev) => renameDocument(prev, prev.activeDocumentId, name));
    },
    [renameDocument],
  );

  const updateWorkspaceTileSurfaceState = useCallback(
    (tileId: string, surfaceState: TileSurfaceState) => {
      updateDocument((doc) => updateTileSurfaceState(doc, tileId, surfaceState));
    },
    [updateDocument],
  );

  const applyWorkspaceLayoutPreset = useCallback(
    (presetId: WorkspaceLayoutPresetId) => {
      updateDocument((doc) => applyLayoutPreset(doc, presetId));
    },
    [updateDocument],
  );

  const assignWorkspaceTileSurface = useCallback(
    (tileId: string, surfaceId: AssignableSurfaceId) => {
      updateDocument((doc) => assignTileSurface(doc, tileId, surfaceId));
    },
    [updateDocument],
  );

  const value = useMemo(
    (): AppWorkspaceContextValue => ({
      state,
      document,
      hydrated,
      layoutEditMode,
      setLayoutEditMode,
      toggleLayoutEditMode,
      openSurfaceInWorkspace,
      focusOrOpenSurface,
      handleSurfaceIngress,
      closeWorkspaceTile,
      setWorkspaceActiveTile,
      resizeWorkspaceSplit,
      moveWorkspaceTile,
      switchWorkspaceDocument,
      createWorkspaceDocument: createWorkspaceDocumentHandler,
      duplicateWorkspaceDocument,
      renameWorkspaceDocument,
      updateWorkspaceTileSurfaceState,
      applyWorkspaceLayoutPreset,
      assignWorkspaceTileSurface,
    }),
    [
      state,
      document,
      hydrated,
      layoutEditMode,
      setLayoutEditMode,
      toggleLayoutEditMode,
      openSurfaceInWorkspace,
      focusOrOpenSurface,
      handleSurfaceIngress,
      closeWorkspaceTile,
      setWorkspaceActiveTile,
      resizeWorkspaceSplit,
      moveWorkspaceTile,
      switchWorkspaceDocument,
      createWorkspaceDocumentHandler,
      duplicateWorkspaceDocument,
      renameWorkspaceDocument,
      updateWorkspaceTileSurfaceState,
      applyWorkspaceLayoutPreset,
      assignWorkspaceTileSurface,
    ],
  );

  return <AppWorkspaceContext.Provider value={value}>{children}</AppWorkspaceContext.Provider>;
}

export function useAppWorkspace(): AppWorkspaceContextValue {
  const ctx = useContext(AppWorkspaceContext);
  if (!ctx) {
    throw new Error("useAppWorkspace must be used within AppWorkspaceProvider");
  }
  return ctx;
}
