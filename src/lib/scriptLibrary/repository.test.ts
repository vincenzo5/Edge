import { describe, expect, it } from "vitest";
import { SCRIPT_FIXTURES } from "@edge/chart-core";
import {
  createScript,
  deleteScript,
  getRevisionSource,
  saveDraft,
  saveRevision,
} from "./repository";
import { computeRevisionFromSource } from "./hash";
import { DEFAULT_SCRIPT_LIBRARY_STATE } from "./types";

describe("scriptLibrary repository", () => {
  it("creates a script with draft source", () => {
    const { entry, state } = createScript(DEFAULT_SCRIPT_LIBRARY_STATE, {
      displayName: "Test",
    });
    expect(entry.displayName).toBe("Test");
    expect(entry.draft?.dirty).toBe(true);
    expect(state.scripts).toHaveLength(1);
  });

  it("saves immutable revisions keyed by normalized source hash", () => {
    const source = SCRIPT_FIXTURES["line-midpoint"].source;
    let state = createScript(DEFAULT_SCRIPT_LIBRARY_STATE).state;
    const scriptId = state.scripts[0]!.scriptId;
    state = saveDraft(state, scriptId, { source });
    const revision = computeRevisionFromSource(source);
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
    expect(saved?.revision).toBe(revision);
    const record = getRevisionSource(saved!.state, scriptId, revision);
    expect(record?.source).toBeTruthy();
  });

  it("does not resolve draft source via revision hash lookup", () => {
    const source = SCRIPT_FIXTURES["line-midpoint"].source;
    let state = createScript(DEFAULT_SCRIPT_LIBRARY_STATE).state;
    const scriptId = state.scripts[0]!.scriptId;
    state = saveDraft(state, scriptId, { source });
    const revision = computeRevisionFromSource(source);
    const draftRecord = getRevisionSource(state, scriptId, revision);
    expect(draftRecord).toBeNull();
    expect(state.scripts[0]?.draft?.source).toContain("edgeScript");
  });

  it("deletes scripts without touching other entries", () => {
    const first = createScript(DEFAULT_SCRIPT_LIBRARY_STATE, { displayName: "A" });
    const second = createScript(first.state, { displayName: "B" });
    const scriptId = second.state.scripts[1]!.scriptId;
    const next = deleteScript(second.state, scriptId);
    expect(next.scripts).toHaveLength(1);
    expect(next.scripts[0]?.displayName).toBe("A");
  });
});
