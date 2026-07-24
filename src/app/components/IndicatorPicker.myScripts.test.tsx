/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import IndicatorPicker from "./IndicatorPicker";
import { ScriptLibraryProvider } from "@/lib/scriptLibrary/ScriptLibraryContext";
import { computeRevisionFromSource } from "@/lib/scriptLibrary/hash";
import { createScript, saveRevision } from "@/lib/scriptLibrary/repository";
import { DEFAULT_SCRIPT_LIBRARY_STATE } from "@/lib/scriptLibrary/types";
import { SCRIPT_FIXTURES } from "@edge/chart-core";
import { SCRIPT_LIBRARY_MIGRATED_KEY } from "@/lib/persistence/client/scriptsClient";

function renderPicker(props: Partial<React.ComponentProps<typeof IndicatorPicker>> = {}) {
  const onAdd = vi.fn();
  const onAddScript = vi.fn();
  render(
    <ScriptLibraryProvider>
      <IndicatorPicker
        open
        active={[]}
        theme="dark"
        onAdd={onAdd}
        onAddScript={onAddScript}
        onNewScript={vi.fn()}
        onEditScript={vi.fn()}
        onClose={vi.fn()}
        {...props}
      />
    </ScriptLibraryProvider>,
  );
  return { onAdd, onAddScript };
}

describe("IndicatorPicker My scripts", () => {
  beforeEach(() => {
    const storage = {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return storage.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        storage.store[key] = value;
      },
    };
    vi.stubGlobal("localStorage", storage);

    const source = SCRIPT_FIXTURES["line-midpoint"].source;
    let state = createScript(DEFAULT_SCRIPT_LIBRARY_STATE, { displayName: "My Midpoint" }).state;
    const scriptId = state.scripts[0]!.scriptId;
    const saved = saveRevision(state, scriptId, {
      source,
      compile: {
        ok: true,
        diagnostics: [],
        manifest: {
          name: "Midpoint",
          pane: "main",
          inputs: {},
          plots: {},
        },
      },
    });
    state = saved!.state;
    const entry = state.scripts[0]!;

    window.localStorage.setItem(SCRIPT_LIBRARY_MIGRATED_KEY, "1");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/me/scripts" && (!init?.method || init.method === "GET")) {
          return new Response(
            JSON.stringify({
              scripts: [
                {
                  scriptId: entry.scriptId,
                  displayName: entry.displayName,
                  headRevision: entry.headRevision,
                  updatedAt: entry.updatedAt,
                  dirty: false,
                  hasDraft: false,
                  compileOk: true,
                  revisionCount: 1,
                },
              ],
            }),
            { status: 200 },
          );
        }
        if (url === `/api/me/scripts/${entry.scriptId}`) {
          return new Response(JSON.stringify({ script: entry }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      }),
    );
  });

  it("lists saved scripts in My scripts section", async () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "My scripts" }));
    await waitFor(() => {
      expect(screen.getByText("My Midpoint")).toBeTruthy();
    });
  });

  it("calls onAddScript when clicking a saved script", async () => {
    const { onAddScript } = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "My scripts" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add My Midpoint to chart" }));
    expect(onAddScript).toHaveBeenCalledWith(
      expect.objectContaining({
        pane: "main",
        revision: computeRevisionFromSource(SCRIPT_FIXTURES["line-midpoint"].source),
      }),
    );
  });
});
