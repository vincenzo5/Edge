import { createDefaultWorkspacesState, getActiveDocument } from "./commands";
import { parseAppWorkspacesState, type ParsedAppWorkspacesState } from "./schema";
import type { AppWorkspaceDocument, AppWorkspacesState, LayoutNode } from "./types";
import { isTileNode } from "./types";

export const APP_WORKSPACES_STORAGE_KEY = "tv-ai:app-workspaces:v1";

function validateDocumentTiles(doc: AppWorkspaceDocument): AppWorkspaceDocument | null {
  function walk(node: AppWorkspaceDocument["root"]): boolean {
    if (isTileNode(node)) {
      return Boolean(doc.tiles[node.tileId]);
    }
    return walk(node.children[0]) && walk(node.children[1]);
  }
  if (!walk(doc.root)) return null;
  if (doc.activeTileId && !doc.tiles[doc.activeTileId]) {
    const firstTileId = Object.keys(doc.tiles)[0];
    if (!firstTileId) return null;
    return { ...doc, activeTileId: firstTileId };
  }
  return doc;
}

function normalizeState(parsed: ParsedAppWorkspacesState): AppWorkspacesState | null {
  if (parsed.version !== 1 || !Array.isArray(parsed.documents) || parsed.documents.length === 0) {
    return null;
  }

  const documents: AppWorkspaceDocument[] = [];
  for (const doc of parsed.documents) {
    const validated = validateDocumentTiles({
      ...doc,
      root: doc.root as LayoutNode,
    });
    if (validated) documents.push(validated);
  }
  if (documents.length === 0) return null;

  const activeDocumentId = documents.some((d) => d.id === parsed.activeDocumentId)
    ? parsed.activeDocumentId
    : documents[0]!.id;

  return {
    version: 1,
    activeDocumentId,
    documents,
  };
}

export function loadAppWorkspacesState(): AppWorkspacesState {
  if (typeof window === "undefined") {
    return createDefaultWorkspacesState();
  }

  try {
    const raw = window.localStorage.getItem(APP_WORKSPACES_STORAGE_KEY);
    if (raw) {
      const parsed = parseAppWorkspacesState(JSON.parse(raw));
      if (parsed) {
        const normalized = normalizeState(parsed);
        if (normalized) return normalized;
      }
    }
  } catch {
    // fall through
  }

  return createDefaultWorkspacesState();
}

export function saveAppWorkspacesState(state: AppWorkspacesState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APP_WORKSPACES_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function loadActiveAppWorkspaceDocument(): AppWorkspaceDocument {
  return getActiveDocument(loadAppWorkspacesState());
}

export {
  createDefaultDocument,
  createDefaultWorkspacesState,
  duplicateDocument,
  getActiveDocument,
  loadDocument,
  renameDocument,
  saveDocument,
} from "./commands";
