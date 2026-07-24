import { describe, expect, it, vi } from "vitest";

import { createDefaultUserPreferencesSnapshot } from "@/lib/userPreferences/assembleUserPreferencesSnapshot";
import { resolveUserPreferencesBootstrap } from "./resolveUserPreferencesBootstrap";

describe("resolveUserPreferencesBootstrap", () => {
  it("returns local snapshot when remote is unavailable", async () => {
    const local = createDefaultUserPreferencesSnapshot();
    const result = await resolveUserPreferencesBootstrap(local, {
      fetchRemote: async () => null,
    });

    expect(result.snapshot).toEqual(local);
    expect(result.remoteApplied).toBe(false);
    expect(result.remotePending).toBe(false);
  });

  it("applies newer remote snapshot during bootstrap race", async () => {
    const local = createDefaultUserPreferencesSnapshot();
    const remoteSnapshot = { ...local, theme: "light" as const };

    const result = await resolveUserPreferencesBootstrap(local, {
      fetchRemote: async () => ({
        schemaVersion: 1,
        syncRevision: 2,
        updatedAt: "2026-01-02T00:00:00.000Z",
        preferencesSnapshot: remoteSnapshot,
      }),
    });

    expect(result.remoteApplied).toBe(true);
    expect(result.snapshot.theme).toBe("light");
  });

  it("defers merge when remote bootstrap times out", async () => {
    const local = createDefaultUserPreferencesSnapshot();
    let resolveRemote!: (value: {
      schemaVersion: 1;
      syncRevision: number;
      updatedAt: string;
      preferencesSnapshot: typeof local;
    }) => void;

    const remotePromise = new Promise<{
      schemaVersion: 1;
      syncRevision: number;
      updatedAt: string;
      preferencesSnapshot: typeof local;
    }>((resolve) => {
      resolveRemote = resolve;
    });

    const result = await resolveUserPreferencesBootstrap(local, {
      fetchRemote: () => remotePromise,
      remoteTimeoutMs: 0,
      sleep: async () => {},
    });

    expect(result.remotePending).toBe(true);
    expect(result.snapshot).toEqual(local);

    resolveRemote({
      schemaVersion: 1,
      syncRevision: 3,
      updatedAt: "2026-01-03T00:00:00.000Z",
      preferencesSnapshot: { ...local, theme: "light" },
    });

    const merged = await result.finishRemoteUserPreferencesMerge?.();
    expect(merged?.theme).toBe("light");
  });
});
