import {
  JOURNAL_SCREENSHOTS_IDB_NAME,
  JOURNAL_SCREENSHOTS_IDB_STORE,
  type JournalScreenshotSource,
} from "@/lib/journal/types";
import {
  JOURNAL_SCREENSHOT_MAX_BYTES,
  JOURNAL_SCREENSHOT_MAX_PER_TRADE,
  isAllowedJournalScreenshotMime,
  validateJournalScreenshotUpload,
} from "@/lib/journal/screenshotValidation";
import type { JournalScreenshotResponse } from "@/lib/persistence/schemas/journal";

type LocalScreenshotRecord = JournalScreenshotResponse & {
  blob: Blob;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(JOURNAL_SCREENSHOTS_IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(JOURNAL_SCREENSHOTS_IDB_STORE)) {
        const store = db.createObjectStore(JOURNAL_SCREENSHOTS_IDB_STORE, { keyPath: "id" });
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

function toResponse(record: LocalScreenshotRecord): JournalScreenshotResponse {
  const { blob: _blob, ...rest } = record;
  return rest;
}

export async function listLocalJournalTradeScreenshots(
  tradeId: string,
): Promise<LocalScreenshotRecord[]> {
  const db = await openDb();
  const tx = db.transaction(JOURNAL_SCREENSHOTS_IDB_STORE, "readonly");
  const store = tx.objectStore(JOURNAL_SCREENSHOTS_IDB_STORE);
  const index = store.index("tradeId");
  const request = index.getAll(tradeId);

  const records = await new Promise<LocalScreenshotRecord[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as LocalScreenshotRecord[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed"));
  });
  await txDone(tx);
  db.close();
  return records.sort((a, b) => a.sortIndex - b.sortIndex || a.createdAt.localeCompare(b.createdAt));
}

export async function getLocalJournalTradeScreenshot(
  screenshotId: string,
): Promise<LocalScreenshotRecord | null> {
  const db = await openDb();
  const tx = db.transaction(JOURNAL_SCREENSHOTS_IDB_STORE, "readonly");
  const store = tx.objectStore(JOURNAL_SCREENSHOTS_IDB_STORE);
  const request = store.get(screenshotId);
  const record = await new Promise<LocalScreenshotRecord | null>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as LocalScreenshotRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed"));
  });
  await txDone(tx);
  db.close();
  return record;
}

export async function addLocalJournalTradeScreenshot(
  tradeId: string,
  input: {
    file: Blob;
    mimeType: string;
    source: JournalScreenshotSource;
    caption?: string | null;
  },
): Promise<JournalScreenshotResponse> {
  const existing = await listLocalJournalTradeScreenshots(tradeId);
  const validated = validateJournalScreenshotUpload(
    input.mimeType,
    input.file.size,
    existing.length,
  );
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const nextSortIndex =
    existing.reduce((max, row) => Math.max(max, row.sortIndex), -1) + 1;

  const record: LocalScreenshotRecord = {
    id,
    tradeId,
    sortIndex: nextSortIndex,
    caption: input.caption?.trim() || null,
    mimeType: validated.mimeType,
    byteSize: input.file.size,
    width: null,
    height: null,
    source: input.source,
    createdAt: now,
    updatedAt: now,
    blob: input.file,
  };

  const db = await openDb();
  const tx = db.transaction(JOURNAL_SCREENSHOTS_IDB_STORE, "readwrite");
  tx.objectStore(JOURNAL_SCREENSHOTS_IDB_STORE).put(record);
  await txDone(tx);
  db.close();
  return toResponse(record);
}

export async function patchLocalJournalTradeScreenshot(
  tradeId: string,
  screenshotId: string,
  patch: { caption?: string | null; sortIndex?: number },
): Promise<JournalScreenshotResponse | null> {
  const existing = await getLocalJournalTradeScreenshot(screenshotId);
  if (!existing || existing.tradeId !== tradeId) return null;

  const updated: LocalScreenshotRecord = {
    ...existing,
    caption: patch.caption !== undefined ? patch.caption : existing.caption,
    sortIndex: patch.sortIndex !== undefined ? patch.sortIndex : existing.sortIndex,
    updatedAt: new Date().toISOString(),
  };

  const db = await openDb();
  const tx = db.transaction(JOURNAL_SCREENSHOTS_IDB_STORE, "readwrite");
  tx.objectStore(JOURNAL_SCREENSHOTS_IDB_STORE).put(updated);
  await txDone(tx);
  db.close();
  return toResponse(updated);
}

export async function deleteLocalJournalTradeScreenshot(
  tradeId: string,
  screenshotId: string,
): Promise<boolean> {
  const existing = await getLocalJournalTradeScreenshot(screenshotId);
  if (!existing || existing.tradeId !== tradeId) return false;

  const db = await openDb();
  const tx = db.transaction(JOURNAL_SCREENSHOTS_IDB_STORE, "readwrite");
  tx.objectStore(JOURNAL_SCREENSHOTS_IDB_STORE).delete(screenshotId);
  await txDone(tx);
  db.close();
  return true;
}

export async function migrateLocalJournalTradeScreenshots(
  fromTradeId: string,
  toTradeId: string,
): Promise<number> {
  if (fromTradeId === toTradeId) return 0;
  const records = await listLocalJournalTradeScreenshots(fromTradeId);
  if (records.length === 0) return 0;

  const db = await openDb();
  const tx = db.transaction(JOURNAL_SCREENSHOTS_IDB_STORE, "readwrite");
  const store = tx.objectStore(JOURNAL_SCREENSHOTS_IDB_STORE);
  for (const record of records) {
    store.put({ ...record, tradeId: toTradeId, updatedAt: new Date().toISOString() });
  }
  await txDone(tx);
  db.close();
  return records.length;
}

export function normalizeScreenshotFile(file: File | Blob, fallbackName = "screenshot.png"): {
  blob: Blob;
  mimeType: string;
} {
  const mimeType = file.type || "image/png";
  if (!isAllowedJournalScreenshotMime(mimeType)) {
    throw new Error("Unsupported image type. Use PNG, JPEG, or WebP.");
  }
  if (file.size > JOURNAL_SCREENSHOT_MAX_BYTES) {
    throw new Error(`Screenshot exceeds ${JOURNAL_SCREENSHOT_MAX_BYTES / (1024 * 1024)} MB limit.`);
  }
  const blob = file instanceof File ? file : new File([file], fallbackName, { type: mimeType });
  return { blob, mimeType };
}

export { JOURNAL_SCREENSHOT_MAX_PER_TRADE };
