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
  updateTileChartWorkspaceId,
  updateTileSurfaceState,
} from "@/lib/appWorkspace/commands";
import { resolveAppWorkspacesBootstrap } from "@/lib/app/bootstrap/resolveAppWorkspacesBootstrap";
import { primaryChartTileId } from "@/lib/appWorkspace/primaryChartTile";
import {
  loadAppWorkspacesState,
  saveAppWorkspacesState,
} from "@/lib/appWorkspace/storage";
import { clearWorkspaceIngressFromLocation } from "@/lib/appWorkspace/deepLinks";
import { clearWorkspaceTabs } from "@/lib/app/workspaceTabsStorage";
import { reconcileChartWorkspacesAfterTileClose } from "@/lib/persistence/sync/reconcileChartWorkspaces";
import { useAppWorkspacesRemoteSync } from "@/lib/persistence/sync/useAppWorkspacesRemoteSync";
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

function cloneDocument(doc: AppWorkspaceDocument): AppWorkspaceDocument {
  return JSON.parse(JSON.stringify(doc)) as AppWorkspaceDocument;
}

function documentsEqual(a: AppWorkspaceDocument, b: AppWorkspaceDocument): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

type AppWorkspaceContextValue = {
  state: AppWorkspacesState;
  document: AppWorkspaceDocument;
  hydrated: boolean;
  layoutEditMode: LayoutEditMode;
  isLayoutDirty: boolean;
  enterLayoutEdit: () => void;
  setLayoutEditMode: (mode: LayoutEditMode) => void;
  toggleLayoutEditMode: () => void;
  requestExitLayoutEdit: () => void;
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
  updateTileChartWorkspaceId: (tileId: string, chartWorkspaceId: string) => void;
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
  const [committedState, setCommittedState] = useState<AppWorkspacesState>(() =>
    createDefaultWorkspacesState(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [bootstrapRemoteApplied, setBootstrapRemoteApplied] = useState(false);
  const [bootstrapRemotePending, setBootstrapRemotePending] = useState(false);
  const [layoutEditMode, setLayoutEditModeState] = useState<LayoutEditMode>("use");
  const editBaselineRef = useRef<AppWorkspaceDocument | null>(null);
  const hydratedRef = useRef(false);
  const layoutEditModeRef = useRef<LayoutEditMode>("use");
  const stateRef = useRef(state);
  const committedStateRef = useRef(committedState);
  const pendingRemoteStateRef = useRef<AppWorkspacesState | null>(null);
  const finishRemoteAppWorkspacesMergeRef =
    useRef<(() => Promise<AppWorkspacesState | null>) | undefined>(undefined);

  stateRef.current = state;
  committedStateRef.current = committedState;

  useEffect(() => {
    layoutEditModeRef.current = layoutEditMode;
  }, [layoutEditMode]);

  const applyRemoteWorkspacesState = useCallback((remoteState: AppWorkspacesState) => {
    if (layoutEditModeRef.current === "edit") {
      pendingRemoteStateRef.current = remoteState;
      return;
    }
    setState(remoteState);
    setCommittedState(remoteState);
    saveAppWorkspacesState(remoteState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const local = loadAppWorkspacesState();
    setState(local);
    setCommittedState(local);

    void resolveAppWorkspacesBootstrap(local)
      .then((result) => {
        if (cancelled) return;
        if (result.remoteApplied) {
          setState(result.state);
          setCommittedState(result.state);
          saveAppWorkspacesState(result.state);
        }
        setBootstrapRemoteApplied(result.remoteApplied);
        setBootstrapRemotePending(result.remotePending);
        finishRemoteAppWorkspacesMergeRef.current = result.finishRemoteAppWorkspacesMerge;
        hydratedRef.current = true;
        setHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        hydratedRef.current = true;
        setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const finishRemoteAppWorkspacesMerge = useCallback(async () => {
    const finish = finishRemoteAppWorkspacesMergeRef.current;
    if (!finish) return null;
    return finish();
  }, []);

  useAppWorkspacesRemoteSync({
    state: committedState,
    hydrated,
    bootstrapRemoteApplied,
    bootstrapRemotePending,
    finishRemoteAppWorkspacesMerge: bootstrapRemotePending
      ? finishRemoteAppWorkspacesMerge
      : undefined,
    onApplyRemoteState: applyRemoteWorkspacesState,
  });

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (layoutEditMode === "edit") return;
    const t = setTimeout(() => {
      saveAppWorkspacesState(state);
      setCommittedState(state);
    }, 400);
    return () => clearTimeout(t);
  }, [state, layoutEditMode]);

  useEffect(() => {
    if (layoutEditMode !== "use") return;
    // Remote apply is deferred while editing; local Done/Esc commit always wins.
    pendingRemoteStateRef.current = null;
  }, [layoutEditMode]);

  const document = useMemo(() => getActiveDocument(state), [state]);

  const isLayoutDirty = useMemo(() => {
    if (layoutEditMode !== "edit" || !editBaselineRef.current) return false;
    return !documentsEqual(document, editBaselineRef.current);
  }, [layoutEditMode, document]);

  const updateDocument = useCallback((updater: (doc: AppWorkspaceDocument) => AppWorkspaceDocument) => {
    setState((prev) => saveDocument(prev, updater(getActiveDocument(prev))));
  }, []);

  const enterLayoutEdit = useCallback(() => {
    setState((prev) => {
      editBaselineRef.current = cloneDocument(getActiveDocument(prev));
      return prev;
    });
    setLayoutEditModeState("edit");
  }, []);

  const exitLayoutEdit = useCallback(() => {
    setLayoutEditModeState("use");
  }, []);

  const commitLayoutEdit = useCallback(() => {
    const current = stateRef.current;
    // Done/Esc commits the local draft. Discard any remote snapshot deferred during
    // edit — applying it would stomp closed/reassigned tiles and re-persist them.
    pendingRemoteStateRef.current = null;
    saveAppWorkspacesState(current);
    editBaselineRef.current = cloneDocument(getActiveDocument(current));
    setCommittedState(current);
    // Sticky ?surface=alerts (etc.) must not survive Done or refresh reopens the tile.
    clearWorkspaceIngressFromLocation();
  }, []);

  const requestExitLayoutEdit = useCallback(() => {
    if (layoutEditModeRef.current !== "edit") return;
    commitLayoutEdit();
    exitLayoutEdit();
  }, [commitLayoutEdit, exitLayoutEdit]);

  const setLayoutEditMode = useCallback(
    (mode: LayoutEditMode) => {
      if (mode === "edit") {
        enterLayoutEdit();
        return;
      }
      if (layoutEditModeRef.current === "edit") {
        requestExitLayoutEdit();
      }
    },
    [enterLayoutEdit, requestExitLayoutEdit],
  );

  const toggleLayoutEditMode = useCallback(() => {
    if (layoutEditModeRef.current === "use") {
      enterLayoutEdit();
      return;
    }
    requestExitLayoutEdit();
  }, [enterLayoutEdit, requestExitLayoutEdit]);

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
        if (result.openedNew && layoutEditModeRef.current === "use") {
          editBaselineRef.current = cloneDocument(result.doc);
          setLayoutEditModeState("edit");
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
          editBaselineRef.current = cloneDocument(result.doc);
          setLayoutEditModeState("edit");
        }
        if (!result.changed) return prev;
        return saveDocument(prev, result.doc);
      });
    },
    [],
  );

  const closeWorkspaceTile = useCallback(
    (tileId: string) => {
      const currentDoc = getActiveDocument(stateRef.current);
      const tile = currentDoc.tiles[tileId];
      const primaryId = primaryChartTileId(currentDoc);
      const isPrimaryChartTile = primaryId === tileId;

      updateDocument((doc) => closeTile(doc, tileId));

      if (typeof window !== "undefined" && tile?.surfaceId) {
        const surfaceParam = new URLSearchParams(window.location.search).get("surface");
        if (surfaceParam === tile.surfaceId) {
          clearWorkspaceIngressFromLocation();
        }
      }

      if (tile?.surfaceId === "chart") {
        clearWorkspaceTabs({ tileId, isPrimaryChartTile });
        const remoteId = tile.chartWorkspaceId;
        if (remoteId) {
          void reconcileChartWorkspacesAfterTileClose(remoteId);
        }
      }
    },
    [updateDocument],
  );

  const updateTileChartWorkspaceIdHandler = useCallback(
    (tileId: string, chartWorkspaceId: string) => {
      updateDocument((doc) => updateTileChartWorkspaceId(doc, tileId, chartWorkspaceId));
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
      isLayoutDirty,
      enterLayoutEdit,
      setLayoutEditMode,
      toggleLayoutEditMode,
      requestExitLayoutEdit,
      openSurfaceInWorkspace,
      focusOrOpenSurface,
      handleSurfaceIngress,
      closeWorkspaceTile,
      updateTileChartWorkspaceId: updateTileChartWorkspaceIdHandler,
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
      isLayoutDirty,
      enterLayoutEdit,
      setLayoutEditMode,
      toggleLayoutEditMode,
      requestExitLayoutEdit,
      openSurfaceInWorkspace,
      focusOrOpenSurface,
      handleSurfaceIngress,
      closeWorkspaceTile,
      updateTileChartWorkspaceIdHandler,
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

export function useOptionalAppWorkspace(): AppWorkspaceContextValue | null {
  return useContext(AppWorkspaceContext);
}
