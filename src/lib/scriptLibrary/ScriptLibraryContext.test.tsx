import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import {
  ScriptLibraryProvider,
  resetScriptLibraryHydrateInFlightForTests,
  useScriptLibrary,
} from "./ScriptLibraryContext";
import {
  SCRIPT_LIBRARY_MIGRATED_KEY,
} from "@/lib/persistence/client/scriptsClient";
import type { ScriptLibraryState } from "./types";

const legacySnapshot: ScriptLibraryState = {
  version: 1,
  scripts: [
    {
      scriptId: "legacy-script-1",
      displayName: "Legacy Script",
      createdAt: 1,
      updatedAt: 1,
      headRevision: "rev-1",
      revisions: [
        {
          revision: "rev-1",
          source: "function edgeScript() { return { name: 'Legacy' }; }",
          languageVersion: "1",
          sdkVersion: "1",
          compileOk: true,
        },
      ],
    },
  ],
};

vi.mock("./storage", () => ({
  loadScriptLibraryState: vi.fn(async () => legacySnapshot),
}));

const fetchScriptsListMock = vi.fn();
const importScriptsSnapshotMock = vi.fn();
const fetchScriptDetailMock = vi.fn();

vi.mock("@/lib/persistence/client/scriptsClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/persistence/client/scriptsClient")>();
  return {
    ...actual,
    fetchScriptsList: (...args: unknown[]) => fetchScriptsListMock(...args),
    importScriptsSnapshot: (...args: unknown[]) => importScriptsSnapshotMock(...args),
    fetchScriptDetail: (...args: unknown[]) => fetchScriptDetailMock(...args),
    isScriptLibraryMigratedLocally: () =>
      window.localStorage.getItem(SCRIPT_LIBRARY_MIGRATED_KEY) === "1",
    markScriptLibraryMigratedLocally: () => {
      window.localStorage.setItem(SCRIPT_LIBRARY_MIGRATED_KEY, "1");
    },
  };
});

function HydrateProbe() {
  const library = useScriptLibrary();
  return (
    <div>
      <span data-testid="hydrated">{String(library.hydrated)}</span>
      <span data-testid="error">{library.error ?? ""}</span>
      <span data-testid="script-count">{library.scripts.length}</span>
    </div>
  );
}

describe("ScriptLibraryProvider hydrate", () => {
  beforeEach(() => {
    resetScriptLibraryHydrateInFlightForTests();
    window.localStorage.clear();
    fetchScriptsListMock.mockReset();
    importScriptsSnapshotMock.mockReset();
    fetchScriptDetailMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("dedupes concurrent hydrate and issues one import POST", async () => {
    fetchScriptsListMock.mockResolvedValue({ scripts: [] });
    importScriptsSnapshotMock.mockResolvedValue({
      imported: 1,
      scripts: [{ scriptId: "legacy-script-1", displayName: "Legacy Script" }],
    });
    fetchScriptDetailMock.mockResolvedValue({
      script: legacySnapshot.scripts[0],
    });

    render(
      <>
        <ScriptLibraryProvider>
          <HydrateProbe />
        </ScriptLibraryProvider>
        <ScriptLibraryProvider>
          <div />
        </ScriptLibraryProvider>
      </>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="hydrated"]')?.textContent).toBe("true");
    });

    expect(importScriptsSnapshotMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(SCRIPT_LIBRARY_MIGRATED_KEY)).toBe("1");
  });

  it("does not mark migrated when import returns 503", async () => {
    fetchScriptsListMock.mockResolvedValue({ scripts: [] });
    importScriptsSnapshotMock.mockResolvedValue(null);

    render(
      <ScriptLibraryProvider>
        <HydrateProbe />
      </ScriptLibraryProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="error"]')?.textContent).toMatch(
        /import failed/i,
      );
    });

    expect(window.localStorage.getItem(SCRIPT_LIBRARY_MIGRATED_KEY)).toBeNull();
    expect(document.querySelector('[data-testid="script-count"]')?.textContent).toBe("0");
  });

  it("defers hydrate until active becomes true", async () => {
    fetchScriptsListMock.mockResolvedValue({ scripts: [] });

    const { rerender } = render(
      <ScriptLibraryProvider active={false}>
        <HydrateProbe />
      </ScriptLibraryProvider>,
    );

    expect(document.querySelector('[data-testid="hydrated"]')?.textContent).toBe("false");
    expect(fetchScriptsListMock).not.toHaveBeenCalled();

    rerender(
      <ScriptLibraryProvider active>
        <HydrateProbe />
      </ScriptLibraryProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="hydrated"]')?.textContent).toBe("true");
    });
    expect(fetchScriptsListMock).toHaveBeenCalledTimes(1);
  });
});
