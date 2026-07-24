import { describe, expect, it, vi, beforeEach } from "vitest";

import { createDefaultWorkspacesState } from "@/lib/appWorkspace/storage";
import {
  REMOTE_APP_WORKSPACES_BOOTSTRAP_TIMEOUT_MS,
  resolveAppWorkspacesBootstrap,
} from "./resolveAppWorkspacesBootstrap";

describe("resolveAppWorkspacesBootstrap", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns local state immediately when remote fetch exceeds timeout", async () => {
    const local = createDefaultWorkspacesState();
    let resolveRemote: (value: unknown) => void = () => {};
    const remotePromise = new Promise((resolve) => {
      resolveRemote = resolve;
    });

    const result = await resolveAppWorkspacesBootstrap(local, {
      fetchRemote: () => remotePromise as never,
      remoteTimeoutMs: 10,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    });

    expect(result.state).toBe(local);
    expect(result.remoteApplied).toBe(false);
    expect(result.remotePending).toBe(true);
    expect(result.finishRemoteAppWorkspacesMerge).toBeDefined();

    resolveRemote({
      schemaVersion: 1,
      syncRevision: 2,
      updatedAt: "2026-01-02T00:00:00.000Z",
      appWorkspacesSnapshot: {
        ...local,
        documents: [{ ...local.documents[0]!, name: "Late Remote" }],
      },
    });

    const merged = await result.finishRemoteAppWorkspacesMerge?.();
    expect(merged?.documents[0]?.name).toBe("Late Remote");
  });

  it("applies remote snapshot when remote wins the bootstrap race", async () => {
    const local = createDefaultWorkspacesState();
    const remoteSnapshot = {
      ...local,
      documents: [{ ...local.documents[0]!, name: "Remote Desk" }],
    };

    const result = await resolveAppWorkspacesBootstrap(local, {
      fetchRemote: async () => ({
        schemaVersion: 1,
        syncRevision: 2,
        updatedAt: "2026-01-02T00:00:00.000Z",
        appWorkspacesSnapshot: remoteSnapshot,
      }),
      remoteTimeoutMs: REMOTE_APP_WORKSPACES_BOOTSTRAP_TIMEOUT_MS,
      sleep: () => new Promise(() => {}),
    });

    expect(result.remoteApplied).toBe(true);
    expect(result.state.documents[0]?.name).toBe("Remote Desk");
  });

  it("keeps local state when remote is null", async () => {
    const local = createDefaultWorkspacesState();
    const result = await resolveAppWorkspacesBootstrap(local, {
      fetchRemote: async () => null,
      remoteTimeoutMs: REMOTE_APP_WORKSPACES_BOOTSTRAP_TIMEOUT_MS,
      sleep: () => new Promise(() => {}),
    });

    expect(result.state).toBe(local);
    expect(result.remoteApplied).toBe(false);
    expect(result.remotePending).toBe(false);
  });
});
