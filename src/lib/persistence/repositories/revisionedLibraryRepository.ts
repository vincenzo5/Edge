export type RevisionedLibraryRecord<TSnapshot> = {
  schemaVersion: 1;
  syncRevision: number;
  updatedAt: string;
  snapshot: TSnapshot;
};

export type SaveRevisionedLibraryResult<TRecord> =
  | { ok: true; record: TRecord }
  | { ok: false; code: "conflict"; current: TRecord };

export type RevisionedLibraryOps<TSnapshot, TRecord extends { syncRevision: number }> = {
  get: (userId: string) => Promise<TRecord | null>;
  insertIfAbsent: (userId: string, snapshot: TSnapshot) => Promise<TRecord | null>;
  updateIfRevision: (
    userId: string,
    snapshot: TSnapshot,
    baseRevision: number,
    nextRevision: number,
  ) => Promise<TRecord | null>;
  createFailedMessage: string;
};

export type SaveRevisionedLibraryInput<TSnapshot> = {
  userId: string;
  snapshot: TSnapshot;
  baseRevision: number;
};

export async function saveRevisionedLibraryRecord<
  TSnapshot,
  TRecord extends { syncRevision: number },
>(
  ops: RevisionedLibraryOps<TSnapshot, TRecord>,
  input: SaveRevisionedLibraryInput<TSnapshot>,
): Promise<SaveRevisionedLibraryResult<TRecord>> {
  const existing = await ops.get(input.userId);
  if (!existing) {
    const created = await ops.insertIfAbsent(input.userId, input.snapshot);
    if (created) {
      if (input.baseRevision !== 0) {
        return { ok: false, code: "conflict", current: created };
      }
      return { ok: true, record: created };
    }

    const current = await ops.get(input.userId);
    if (!current) {
      throw new Error(ops.createFailedMessage);
    }

    return { ok: false, code: "conflict", current };
  }

  if (existing.syncRevision !== input.baseRevision) {
    return { ok: false, code: "conflict", current: existing };
  }

  const updated = await ops.updateIfRevision(
    input.userId,
    input.snapshot,
    input.baseRevision,
    existing.syncRevision + 1,
  );

  if (!updated) {
    const current = await ops.get(input.userId);
    return { ok: false, code: "conflict", current: current ?? existing };
  }

  return { ok: true, record: updated };
}
