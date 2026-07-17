import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RevisionedRemoteSyncAdapter } from "./useRevisionedRemoteSync";

const mocks = vi.hoisted(() => ({
  fetchRemote: vi.fn(),
  saveRemote: vi.fn(),
  getMeta: vi.fn(),
  setMeta: vi.fn(),
}));

const remoteSnapshot = { items: ["remote"] };
const localSnapshot = { items: ["local"] };
const equalSnapshot = { items: ["same"] };

function createAdapter(
  overrides: Partial<RevisionedRemoteSyncAdapter<{ items: string[] }>> = {},
): RevisionedRemoteSyncAdapter<{ items: string[] }> {
  return {
    fetchRemote: mocks.fetchRemote,
    saveRemote: mocks.saveRemote,
    getMeta: mocks.getMeta,
    setMeta: mocks.setMeta,
    debounceMs: 600,
    ...overrides,
  };
}

import { useRevisionedRemoteSync } from "./useRevisionedRemoteSync";

describe("useRevisionedRemoteSync (react-state mode)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.fetchRemote.mockResolvedValue({
      syncRevision: 2,
      updatedAt: "2026-01-02T00:00:00.000Z",
      snapshot: remoteSnapshot,
    });
    mocks.getMeta.mockReturnValue(null);
    mocks.saveRemote.mockResolvedValue({
      ok: true,
      record: {
        syncRevision: 3,
        updatedAt: "2026-01-03T00:00:00.000Z",
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies remote snapshot on first hydrate when local meta is missing and snapshots differ", async () => {
    const onApplyRemoteState = vi.fn();

    renderHook(() =>
      useRevisionedRemoteSync({
        adapter: createAdapter(),
        state: localSnapshot,
        hydrated: true,
        onApplyRemoteState,
      }),
    );

    await waitFor(() => {
      expect(onApplyRemoteState).toHaveBeenCalledWith(remoteSnapshot);
      expect(mocks.setMeta).toHaveBeenCalledWith({
        syncRevision: 2,
        updatedAt: "2026-01-02T00:00:00.000Z",
      });
    });
  });

  it("skips apply on first hydrate when remote snapshot equals local state", async () => {
    mocks.fetchRemote.mockResolvedValue({
      syncRevision: 2,
      updatedAt: "2026-01-02T00:00:00.000Z",
      snapshot: equalSnapshot,
    });
    const onApplyRemoteState = vi.fn();

    renderHook(() =>
      useRevisionedRemoteSync({
        adapter: createAdapter(),
        state: equalSnapshot,
        hydrated: true,
        onApplyRemoteState,
      }),
    );

    await waitFor(() => {
      expect(mocks.setMeta).toHaveBeenCalled();
    });

    expect(onApplyRemoteState).not.toHaveBeenCalled();
  });

  it("marks hydrated and allows debounced push when remote fetch returns null", async () => {
    mocks.fetchRemote.mockResolvedValue(null);
    const onApplyRemoteState = vi.fn();

    const { rerender } = renderHook(
      ({ state }) =>
        useRevisionedRemoteSync({
          adapter: createAdapter(),
          state,
          hydrated: true,
          onApplyRemoteState,
        }),
      { initialProps: { state: localSnapshot } },
    );

    await waitFor(() => {
      expect(mocks.fetchRemote).toHaveBeenCalled();
    });

    vi.useFakeTimers();
    rerender({ state: { items: ["changed"] } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(mocks.saveRemote).toHaveBeenCalledWith({ items: ["changed"] }, 0);
  });

  it("debounces successful push and updates sync metadata", async () => {
    mocks.getMeta.mockReturnValue({
      syncRevision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const onApplyRemoteState = vi.fn();

    const { rerender } = renderHook(
      ({ state }) =>
        useRevisionedRemoteSync({
          adapter: createAdapter(),
          state,
          hydrated: true,
          onApplyRemoteState,
        }),
      { initialProps: { state: localSnapshot } },
    );

    await waitFor(() => {
      expect(mocks.fetchRemote).toHaveBeenCalled();
    });

    vi.useFakeTimers();
    rerender({ state: { items: ["push-me"] } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(mocks.saveRemote).toHaveBeenCalledWith({ items: ["push-me"] }, 1);
    expect(mocks.setMeta).toHaveBeenCalledWith({
      syncRevision: 3,
      updatedAt: "2026-01-03T00:00:00.000Z",
    });
  });

  it("applies remote snapshot and metadata on conflict response", async () => {
    mocks.getMeta.mockReturnValue({
      syncRevision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    mocks.saveRemote.mockResolvedValue({
      ok: false,
      current: {
        syncRevision: 4,
        updatedAt: "2026-01-04T00:00:00.000Z",
        snapshot: remoteSnapshot,
      },
    });
    const onApplyRemoteState = vi.fn();

    const { rerender } = renderHook(
      ({ state }) =>
        useRevisionedRemoteSync({
          adapter: createAdapter(),
          state,
          hydrated: true,
          onApplyRemoteState,
        }),
      { initialProps: { state: localSnapshot } },
    );

    await waitFor(() => {
      expect(mocks.fetchRemote).toHaveBeenCalled();
    });

    vi.useFakeTimers();
    rerender({ state: { items: ["conflict"] } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(onApplyRemoteState).toHaveBeenCalledWith(remoteSnapshot);
    expect(mocks.setMeta).toHaveBeenCalledWith({
      syncRevision: 4,
      updatedAt: "2026-01-04T00:00:00.000Z",
    });
  });

  it("skips apply when remote is newer but snapshot is equal", async () => {
    mocks.getMeta.mockReturnValue({
      syncRevision: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    mocks.fetchRemote.mockResolvedValue({
      syncRevision: 5,
      updatedAt: "2026-01-05T00:00:00.000Z",
      snapshot: equalSnapshot,
    });
    const onApplyRemoteState = vi.fn();

    renderHook(() =>
      useRevisionedRemoteSync({
        adapter: createAdapter(),
        state: equalSnapshot,
        hydrated: true,
        onApplyRemoteState,
      }),
    );

    await waitFor(() => {
      expect(mocks.fetchRemote).toHaveBeenCalled();
    });

    expect(onApplyRemoteState).not.toHaveBeenCalled();
  });
});

describe("useRevisionedRemoteSync (subscribe mode)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.fetchRemote.mockResolvedValue({
      syncRevision: 2,
      updatedAt: "2026-01-02T00:00:00.000Z",
      snapshot: remoteSnapshot,
    });
    mocks.getMeta.mockReturnValue(null);
    mocks.saveRemote.mockResolvedValue({
      ok: true,
      record: {
        syncRevision: 3,
        updatedAt: "2026-01-03T00:00:00.000Z",
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces push when subscribe callback fires", async () => {
    let listener: (() => void) | null = null;
    const getState = vi.fn(() => localSnapshot);
    const onApplyRemoteState = vi.fn();

    renderHook(() =>
      useRevisionedRemoteSync({
        adapter: createAdapter(),
        getState,
        subscribe: (onChange) => {
          listener = onChange;
          return () => {
            listener = null;
          };
        },
        onApplyRemoteState,
      }),
    );

    await waitFor(() => {
      expect(mocks.fetchRemote).toHaveBeenCalled();
    });

    vi.useFakeTimers();
    act(() => {
      listener?.();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(mocks.saveRemote).toHaveBeenCalledWith(localSnapshot, 0);
  });
});
