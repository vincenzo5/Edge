/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";

import ScriptsTileSurface from "./ScriptsTileSurface";
import { AppWorkspaceProvider, useAppWorkspace } from "./AppWorkspaceContext";
import { TileDensityOverrideProvider } from "./TileDensityContext";
import { ScriptLibraryProvider } from "@/lib/scriptLibrary/ScriptLibraryContext";
import { WorkspaceDriveProvider } from "./WorkspaceDriveContext";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockMonacoScriptEditor({
      value,
      onChange,
    }: {
      value: string;
      onChange: (value: string) => void;
    }) {
      return (
        <textarea
          data-testid="script-source-editor"
          aria-label="Script source"
          className="min-h-0 w-full flex-1 resize-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    },
}));

vi.mock("@/lib/persistence/client/scriptsClient", () => ({
  fetchScriptsList: vi.fn(async () => ({ scripts: [] })),
  fetchScriptDetail: vi.fn(),
  createScriptRemote: vi.fn(async () => ({
    script: {
      scriptId: "script-new",
      displayName: "Untitled script",
      headRevision: null,
      revisions: [],
      draft: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  })),
  patchScriptRemote: vi.fn(),
  deleteScriptRemote: vi.fn(),
  saveScriptRevisionRemote: vi.fn(),
  importScriptsSnapshot: vi.fn(),
  isScriptLibraryMigratedLocally: vi.fn(() => true),
  markScriptLibraryMigratedLocally: vi.fn(),
}));

function ScriptsTileHarness() {
  const { document, assignWorkspaceTileSurface } = useAppWorkspace();
  const firstTileId = Object.keys(document.tiles)[0];

  useEffect(() => {
    if (firstTileId) {
      assignWorkspaceTileSurface(firstTileId, "scripts");
    }
  }, [assignWorkspaceTileSurface, firstTileId]);

  const scriptsTile = Object.values(document.tiles).find((tile) => tile.surfaceId === "scripts");
  if (!scriptsTile) return null;

  return (
    <TileDensityOverrideProvider mode="standard" width={960}>
      <ScriptsTileSurface tileId={scriptsTile.id} surfaceState={scriptsTile.surfaceState} />
    </TileDensityOverrideProvider>
  );
}

function renderScriptsTile() {
  return render(
    <AppWorkspaceProvider>
      <ScriptLibraryProvider>
        <WorkspaceDriveProvider>
          <ScriptsTileHarness />
        </WorkspaceDriveProvider>
      </ScriptLibraryProvider>
    </AppWorkspaceProvider>,
  );
}

describe("ScriptsTileSurface", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows Scripts title and library rail", async () => {
    renderScriptsTile();
    await waitFor(() => {
      expect(screen.getByTestId("scripts-title")).toHaveTextContent("Scripts");
    });
    expect(screen.getByTestId("scripts-library-rail")).toBeInTheDocument();
    expect(screen.getByTestId("script-editor-empty")).toBeInTheDocument();
  });

  it("creates a script from the library rail", async () => {
    renderScriptsTile();
    await waitFor(() => {
      expect(screen.getByTestId("scripts-library-new")).toBeInTheDocument();
    });
    screen.getByTestId("scripts-library-new").click();
    await waitFor(() => {
      expect(screen.getByTestId("script-editor-pane")).toBeInTheDocument();
    });
  });

  it("keeps editor chrome in a constrained flex layout", async () => {
    renderScriptsTile();
    await waitFor(() => {
      expect(screen.getByTestId("scripts-library-new")).toBeInTheDocument();
    });
    screen.getByTestId("scripts-library-new").click();
    await waitFor(() => {
      expect(screen.getByTestId("script-editor-pane")).toBeInTheDocument();
    });

    const pane = screen.getByTestId("script-editor-pane");
    expect(pane.className).toContain("overflow-hidden");
    expect(pane.className).toContain("min-h-0");

    const source = screen.getByTestId("script-source-editor");
    expect(source.className).toContain("min-h-0");
    expect(source.className).not.toContain("40vh");

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Run script compile")).toBeInTheDocument();
    expect(screen.getByLabelText("Save script")).toBeInTheDocument();
  });
});
