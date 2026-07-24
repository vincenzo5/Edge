import { describe, expect, it } from "vitest";

import { mergeScriptLibraryStates } from "./merge";
import type { ScriptLibraryEntry, ScriptLibraryState } from "./types";
import { DEFAULT_SCRIPT_LIBRARY_STATE, MAX_REVISIONS_PER_SCRIPT } from "./types";

function entry(
  scriptId: string,
  overrides: Partial<ScriptLibraryEntry> = {},
): ScriptLibraryEntry {
  const now = Date.now();
  return {
    scriptId,
    displayName: overrides.displayName ?? "Test",
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    headRevision: overrides.headRevision ?? null,
    draft: overrides.draft,
    revisions: overrides.revisions ?? [],
  };
}

function state(scripts: ScriptLibraryEntry[]): ScriptLibraryState {
  return { version: 1, scripts };
}

describe("mergeScriptLibraryStates", () => {
  it("returns local when remote is empty", () => {
    const local = state([entry("a", { displayName: "Local only" })]);
    const merged = mergeScriptLibraryStates(local, DEFAULT_SCRIPT_LIBRARY_STATE);
    expect(merged.scripts).toHaveLength(1);
    expect(merged.scripts[0]?.displayName).toBe("Local only");
  });

  it("keeps remote-only scripts", () => {
    const remote = state([entry("remote-only", { displayName: "From cloud" })]);
    const merged = mergeScriptLibraryStates(DEFAULT_SCRIPT_LIBRARY_STATE, remote);
    expect(merged.scripts).toHaveLength(1);
    expect(merged.scripts[0]?.scriptId).toBe("remote-only");
  });

  it("unions revisions from both sides without dropping unique hashes", () => {
    const local = state([
      entry("shared", {
        updatedAt: 100,
        revisions: [
          {
            revision: "rev-local",
            source: "local source",
            languageVersion: "1",
            sdkVersion: "1",
            compileOk: true,
            compiledAt: 100,
          },
        ],
        headRevision: "rev-local",
      }),
    ]);
    const remote = state([
      entry("shared", {
        updatedAt: 200,
        revisions: [
          {
            revision: "rev-remote",
            source: "remote source",
            languageVersion: "1",
            sdkVersion: "1",
            compileOk: true,
            compiledAt: 200,
          },
        ],
        headRevision: "rev-remote",
      }),
    ]);

    const merged = mergeScriptLibraryStates(local, remote);
    const script = merged.scripts[0];
    expect(script?.revisions.map((rev) => rev.revision).sort()).toEqual([
      "rev-local",
      "rev-remote",
    ]);
    expect(script?.headRevision).toBe("rev-remote");
    expect(script?.updatedAt).toBe(200);
  });

  it("prefers newer compiled revision payload when hash matches", () => {
    const local = state([
      entry("shared", {
        revisions: [
          {
            revision: "same-hash",
            source: "older manifest",
            languageVersion: "1",
            sdkVersion: "1",
            compileOk: true,
            compiledAt: 50,
            manifest: { name: "Old" },
          },
        ],
      }),
    ]);
    const remote = state([
      entry("shared", {
        revisions: [
          {
            revision: "same-hash",
            source: "newer manifest",
            languageVersion: "1",
            sdkVersion: "1",
            compileOk: true,
            compiledAt: 150,
            manifest: { name: "New" },
          },
        ],
      }),
    ]);

    const merged = mergeScriptLibraryStates(local, remote);
    expect(merged.scripts[0]?.revisions[0]?.source).toBe("newer manifest");
  });

  it("trims to MAX_REVISIONS_PER_SCRIPT preferring revisions present on both sides", () => {
    const localRevisions = Array.from({ length: MAX_REVISIONS_PER_SCRIPT }, (_, index) => ({
      revision: `local-${index}`,
      source: `local ${index}`,
      languageVersion: "1",
      sdkVersion: "1",
      compileOk: true,
      compiledAt: index,
    }));
    const remoteOnly = {
      revision: "remote-only",
      source: "remote unique",
      languageVersion: "1",
      sdkVersion: "1",
      compileOk: true,
      compiledAt: 9999,
    };
    const shared = {
      revision: "shared-rev",
      source: "shared",
      languageVersion: "1",
      sdkVersion: "1",
      compileOk: true,
      compiledAt: 5000,
    };

    const local = state([
      entry("heavy", {
        revisions: [...localRevisions, shared],
      }),
    ]);
    const remote = state([
      entry("heavy", {
        updatedAt: 9999,
        revisions: [shared, remoteOnly],
      }),
    ]);

    const merged = mergeScriptLibraryStates(local, remote);
    const hashes = merged.scripts[0]?.revisions.map((rev) => rev.revision) ?? [];
    expect(hashes).toHaveLength(MAX_REVISIONS_PER_SCRIPT);
    expect(hashes).toContain("shared-rev");
    expect(hashes).toContain("remote-only");
  });

  it("picks displayName and draft from the entry with newer updatedAt", () => {
    const local = state([
      entry("script", {
        updatedAt: 300,
        displayName: "Local name",
        draft: {
          source: "local draft",
          updatedAt: 300,
          dirty: true,
        },
      }),
    ]);
    const remote = state([
      entry("script", {
        updatedAt: 100,
        displayName: "Remote name",
        draft: {
          source: "remote draft",
          updatedAt: 100,
          dirty: true,
        },
      }),
    ]);

    const merged = mergeScriptLibraryStates(local, remote);
    expect(merged.scripts[0]?.displayName).toBe("Local name");
    expect(merged.scripts[0]?.draft?.source).toBe("local draft");
  });
});
