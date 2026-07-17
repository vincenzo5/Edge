import { describe, expect, it, vi } from "vitest";

import {
  saveRevisionedLibraryRecord,
  type RevisionedLibraryOps,
} from "./revisionedLibraryRepository";

type TestSnapshot = { items: string[] };
type TestRecord = {
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  snapshot: TestSnapshot;
};

function createRecord(revision: number, items: string[] = ["a"]): TestRecord {
  return {
    schemaVersion: 1,
    syncRevision: revision,
    updatedAt: "2026-01-01T00:00:00.000Z",
    snapshot: { items },
  };
}

function createOps(
  overrides: Partial<RevisionedLibraryOps<TestSnapshot, TestRecord>> = {},
): RevisionedLibraryOps<TestSnapshot, TestRecord> {
  return {
    get: vi.fn().mockResolvedValue(null),
    insertIfAbsent: vi.fn().mockResolvedValue(createRecord(1)),
    updateIfRevision: vi.fn().mockResolvedValue(createRecord(2, ["b"])),
    createFailedMessage: "Failed to create test library",
    ...overrides,
  };
}

describe("saveRevisionedLibraryRecord", () => {
  it("creates when absent and baseRevision is 0", async () => {
    const created = createRecord(1);
    const ops = createOps({
      get: vi.fn().mockResolvedValue(null),
      insertIfAbsent: vi.fn().mockResolvedValue(created),
    });

    const result = await saveRevisionedLibraryRecord(ops, {
      userId: "user-1",
      snapshot: { items: ["a"] },
      baseRevision: 0,
    });

    expect(result).toEqual({ ok: true, record: created });
    expect(ops.insertIfAbsent).toHaveBeenCalledWith("user-1", { items: ["a"] });
  });

  it("returns conflict when absent insert succeeds but baseRevision is not 0", async () => {
    const created = createRecord(1);
    const ops = createOps({
      get: vi.fn().mockResolvedValue(null),
      insertIfAbsent: vi.fn().mockResolvedValue(created),
    });

    const result = await saveRevisionedLibraryRecord(ops, {
      userId: "user-1",
      snapshot: { items: ["a"] },
      baseRevision: 2,
    });

    expect(result).toEqual({ ok: false, code: "conflict", current: created });
  });

  it("returns conflict when insert races and another writer created the row", async () => {
    const current = createRecord(1, ["race"]);
    const ops = createOps({
      get: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(current),
      insertIfAbsent: vi.fn().mockResolvedValue(null),
    });

    const result = await saveRevisionedLibraryRecord(ops, {
      userId: "user-1",
      snapshot: { items: ["a"] },
      baseRevision: 0,
    });

    expect(result).toEqual({ ok: false, code: "conflict", current });
  });

  it("throws when insert races and row still missing", async () => {
    const ops = createOps({
      get: vi.fn().mockResolvedValue(null),
      insertIfAbsent: vi.fn().mockResolvedValue(null),
    });

    await expect(
      saveRevisionedLibraryRecord(ops, {
        userId: "user-1",
        snapshot: { items: ["a"] },
        baseRevision: 0,
      }),
    ).rejects.toThrow("Failed to create test library");
  });

  it("returns conflict when existing revision does not match baseRevision", async () => {
    const existing = createRecord(3);
    const ops = createOps({
      get: vi.fn().mockResolvedValue(existing),
    });

    const result = await saveRevisionedLibraryRecord(ops, {
      userId: "user-1",
      snapshot: { items: ["b"] },
      baseRevision: 2,
    });

    expect(result).toEqual({ ok: false, code: "conflict", current: existing });
    expect(ops.updateIfRevision).not.toHaveBeenCalled();
  });

  it("returns conflict when CAS update returns no row", async () => {
    const existing = createRecord(2);
    const raced = createRecord(3, ["stale"]);
    const ops = createOps({
      get: vi
        .fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(raced),
      updateIfRevision: vi.fn().mockResolvedValue(null),
    });

    const result = await saveRevisionedLibraryRecord(ops, {
      userId: "user-1",
      snapshot: { items: ["b"] },
      baseRevision: 2,
    });

    expect(result).toEqual({ ok: false, code: "conflict", current: raced });
    expect(ops.updateIfRevision).toHaveBeenCalledWith("user-1", { items: ["b"] }, 2, 3);
  });

  it("returns success when CAS update succeeds", async () => {
    const existing = createRecord(2);
    const updated = createRecord(3, ["b"]);
    const ops = createOps({
      get: vi.fn().mockResolvedValue(existing),
      updateIfRevision: vi.fn().mockResolvedValue(updated),
    });

    const result = await saveRevisionedLibraryRecord(ops, {
      userId: "user-1",
      snapshot: { items: ["b"] },
      baseRevision: 2,
    });

    expect(result).toEqual({ ok: true, record: updated });
  });
});
