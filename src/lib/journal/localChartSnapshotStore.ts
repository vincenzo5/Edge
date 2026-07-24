import {
  JOURNAL_CHART_SNAPSHOTS_IDB_NAME,
  JOURNAL_CHART_SNAPSHOTS_IDB_STORE,
} from "@/lib/journal/types";
import {
  JOURNAL_CHART_SNAPSHOT_MAX_PER_TRADE,
  validateJournalChartSnapshotPayload,
  jsonByteLength,
} from "@/lib/journal/chartSnapshotValidation";
import type {
  JournalChartSnapshotCreate,
  JournalChartSnapshotPatch,
  JournalChartSnapshotResponse,
} from "@/lib/persistence/schemas/journal";
import type { CellConfig } from "@/lib/chartConfig";

type LocalChartSnapshotRecord = JournalChartSnapshotResponse & {
  cellConfigOriginal: CellConfig;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(JOURNAL_CHART_SNAPSHOTS_IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(JOURNAL_CHART_SNAPSHOTS_IDB_STORE)) {
        const store = db.createObjectStore(JOURNAL_CHART_SNAPSHOTS_IDB_STORE, { keyPath: "id" });
        store.createIndex("tradeId", "tradeId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function toResponse(record: LocalChartSnapshotRecord): JournalChartSnapshotResponse {
  const { cellConfigOriginal: _original, ...rest } = record;
  return rest;
}

export async function listLocalJournalTradeChartSnapshots(
  tradeId: string,
): Promise<LocalChartSnapshotRecord[]> {
  const db = await openDb();
  const tx = db.transaction(JOURNAL_CHART_SNAPSHOTS_IDB_STORE, "readonly");
  const store = tx.objectStore(JOURNAL_CHART_SNAPSHOTS_IDB_STORE);
  const index = store.index("tradeId");
  const request = index.getAll(tradeId);

  const records = await new Promise<LocalChartSnapshotRecord[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as LocalChartSnapshotRecord[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed"));
  });
  await txDone(tx);
  db.close();
  return records.sort((a, b) => a.sortIndex - b.sortIndex || a.createdAt.localeCompare(b.createdAt));
}

export async function getLocalJournalTradeChartSnapshot(
  snapshotId: string,
): Promise<LocalChartSnapshotRecord | null> {
  const db = await openDb();
  const tx = db.transaction(JOURNAL_CHART_SNAPSHOTS_IDB_STORE, "readonly");
  const store = tx.objectStore(JOURNAL_CHART_SNAPSHOTS_IDB_STORE);
  const request = store.get(snapshotId);
  const record = await new Promise<LocalChartSnapshotRecord | null>((resolve, reject) => {
    request.onsuccess = () =>
      resolve((request.result as LocalChartSnapshotRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed"));
  });
  await txDone(tx);
  db.close();
  return record;
}

export async function addLocalJournalTradeChartSnapshot(
  tradeId: string,
  input: JournalChartSnapshotCreate,
): Promise<JournalChartSnapshotResponse> {
  const existing = await listLocalJournalTradeChartSnapshots(tradeId);
  const payloadBytes = jsonByteLength(input.cellConfig);
  const validated = validateJournalChartSnapshotPayload(payloadBytes, existing.length);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const nextSortIndex =
    existing.reduce((max, row) => Math.max(max, row.sortIndex), -1) + 1;

  const record: LocalChartSnapshotRecord = {
    id,
    tradeId,
    sortIndex: nextSortIndex,
    label: input.label?.trim() || null,
    symbol: input.cellConfig.symbol.trim().toUpperCase(),
    interval: input.cellConfig.interval,
    cellConfig: input.cellConfig as CellConfig,
    cellConfigOriginal: input.cellConfig as CellConfig,
    planLevels: input.planLevels ?? null,
    screenshotId: input.screenshotId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const db = await openDb();
  const tx = db.transaction(JOURNAL_CHART_SNAPSHOTS_IDB_STORE, "readwrite");
  tx.objectStore(JOURNAL_CHART_SNAPSHOTS_IDB_STORE).put(record);
  await txDone(tx);
  db.close();
  return toResponse(record);
}

export async function patchLocalJournalTradeChartSnapshot(
  tradeId: string,
  snapshotId: string,
  patch: JournalChartSnapshotPatch,
): Promise<JournalChartSnapshotResponse | null> {
  const existing = await getLocalJournalTradeChartSnapshot(snapshotId);
  if (!existing || existing.tradeId !== tradeId) return null;

  let nextCellConfig = existing.cellConfig;
  if (patch.resetToOriginal) {
    nextCellConfig = existing.cellConfigOriginal;
  } else if (patch.cellConfig) {
    const payloadBytes = jsonByteLength(patch.cellConfig);
    const validated = validateJournalChartSnapshotPayload(payloadBytes, 0);
    if (!validated.ok) {
      throw new Error(validated.error);
    }
    nextCellConfig = patch.cellConfig as CellConfig;
  }

  const updated: LocalChartSnapshotRecord = {
    ...existing,
    cellConfig: nextCellConfig,
    label: patch.label !== undefined ? patch.label : existing.label,
    updatedAt: new Date().toISOString(),
  };

  const db = await openDb();
  const tx = db.transaction(JOURNAL_CHART_SNAPSHOTS_IDB_STORE, "readwrite");
  tx.objectStore(JOURNAL_CHART_SNAPSHOTS_IDB_STORE).put(updated);
  await txDone(tx);
  db.close();
  return toResponse(updated);
}

export async function deleteLocalJournalTradeChartSnapshot(
  tradeId: string,
  snapshotId: string,
): Promise<boolean> {
  const existing = await getLocalJournalTradeChartSnapshot(snapshotId);
  if (!existing || existing.tradeId !== tradeId) return false;

  const db = await openDb();
  const tx = db.transaction(JOURNAL_CHART_SNAPSHOTS_IDB_STORE, "readwrite");
  tx.objectStore(JOURNAL_CHART_SNAPSHOTS_IDB_STORE).delete(snapshotId);
  await txDone(tx);
  db.close();
  return true;
}

export async function migrateLocalJournalTradeChartSnapshots(
  fromTradeId: string,
  toTradeId: string,
): Promise<number> {
  if (fromTradeId === toTradeId) return 0;
  const records = await listLocalJournalTradeChartSnapshots(fromTradeId);
  if (records.length === 0) return 0;

  const db = await openDb();
  const tx = db.transaction(JOURNAL_CHART_SNAPSHOTS_IDB_STORE, "readwrite");
  const store = tx.objectStore(JOURNAL_CHART_SNAPSHOTS_IDB_STORE);
  for (const record of records) {
    store.put({ ...record, tradeId: toTradeId, updatedAt: new Date().toISOString() });
  }
  await txDone(tx);
  db.close();
  return records.length;
}

export { JOURNAL_CHART_SNAPSHOT_MAX_PER_TRADE };
