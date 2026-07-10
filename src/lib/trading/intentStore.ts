import { randomUUID } from "crypto";
import type { OrderDraft, OrderIntent, OrderIntentStatus } from "./types";
import { normalizeDraftForHash } from "./validateOrder";

export type OrderIntentStore = {
  createIntent(draft: OrderDraft, idempotencyKey: string): OrderIntent;
  getById(intentId: string): OrderIntent | null;
  getByIdempotencyKey(idempotencyKey: string): OrderIntent | null;
  updateIntent(
    intentId: string,
    patch: Partial<
      Pick<OrderIntent, "status" | "permId" | "orderId" | "orderRef">
    >,
  ): OrderIntent | null;
};

export function buildOrderRef(intentId: string, explicit?: string): string {
  return explicit?.trim() || `edge-intent-${intentId}`;
}

type StoredIntent = OrderIntent & { draftHash: string };

function createIntentRecord(
  draft: OrderDraft,
  idempotencyKey: string,
): StoredIntent {
  const now = Date.now();
  const intentId = randomUUID();
  const orderRef = buildOrderRef(intentId, draft.orderRef);
  return {
    intentId,
    idempotencyKey,
    draft: { ...draft, orderRef },
    status: "draft",
    orderRef,
    createdAt: now,
    updatedAt: now,
    draftHash: normalizeDraftForHash(draft),
  };
}

export function createMemoryIntentStore(): OrderIntentStore {
  const byId = new Map<string, StoredIntent>();
  const byKey = new Map<string, string>();

  return {
    createIntent(draft, idempotencyKey) {
      const existingId = byKey.get(idempotencyKey);
      const draftHash = normalizeDraftForHash(draft);
      if (existingId) {
        const existing = byId.get(existingId);
        if (existing && existing.draftHash === draftHash) {
          return stripHash(existing);
        }
      }

      const record = createIntentRecord(draft, idempotencyKey);
      byId.set(record.intentId, record);
      byKey.set(idempotencyKey, record.intentId);
      return stripHash(record);
    },

    getById(intentId) {
      const record = byId.get(intentId);
      return record ? stripHash(record) : null;
    },

    getByIdempotencyKey(idempotencyKey) {
      const intentId = byKey.get(idempotencyKey);
      if (!intentId) return null;
      const record = byId.get(intentId);
      return record ? stripHash(record) : null;
    },

    updateIntent(intentId, patch) {
      const record = byId.get(intentId);
      if (!record) return null;
      const next: StoredIntent = {
        ...record,
        ...patch,
        updatedAt: Date.now(),
      };
      byId.set(intentId, next);
      return stripHash(next);
    },
  };
}

function stripHash(record: StoredIntent): OrderIntent {
  const { draftHash: _draftHash, ...intent } = record;
  return intent;
}

export const BROWSER_INTENT_STORAGE_KEY = "edge:trading:intents";

export function createBrowserIntentStore(): OrderIntentStore {
  if (typeof window === "undefined") {
    return createMemoryIntentStore();
  }

  function readAll(): StoredIntent[] {
    try {
      const raw = window.localStorage.getItem(BROWSER_INTENT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as StoredIntent[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeAll(records: StoredIntent[]): void {
    window.localStorage.setItem(BROWSER_INTENT_STORAGE_KEY, JSON.stringify(records));
  }

  return {
    createIntent(draft, idempotencyKey) {
      const records = readAll();
      const draftHash = normalizeDraftForHash(draft);
      const existing = records.find((record) => record.idempotencyKey === idempotencyKey);
      if (existing && existing.draftHash === draftHash) {
        return stripHash(existing);
      }

      const record = createIntentRecord(draft, idempotencyKey);
      const withoutDupes = records.filter(
        (item) => item.idempotencyKey !== idempotencyKey,
      );
      writeAll([record, ...withoutDupes]);
      return stripHash(record);
    },

    getById(intentId) {
      const record = readAll().find((item) => item.intentId === intentId);
      return record ? stripHash(record) : null;
    },

    getByIdempotencyKey(idempotencyKey) {
      const record = readAll().find((item) => item.idempotencyKey === idempotencyKey);
      return record ? stripHash(record) : null;
    },

    updateIntent(intentId, patch) {
      const records = readAll();
      const index = records.findIndex((item) => item.intentId === intentId);
      if (index < 0) return null;
      const next: StoredIntent = {
        ...records[index]!,
        ...patch,
        updatedAt: Date.now(),
      };
      records[index] = next;
      writeAll(records);
      return stripHash(next);
    },
  };
}

export function transitionIntentStatus(
  current: OrderIntentStatus,
  next: OrderIntentStatus,
): OrderIntentStatus {
  return next;
}

let serverIntentStore: OrderIntentStore | null = null;

export function getServerIntentStore(): OrderIntentStore {
  if (!serverIntentStore) {
    serverIntentStore = createMemoryIntentStore();
  }
  return serverIntentStore;
}

export function resetServerIntentStoreForTests(): void {
  serverIntentStore = null;
}
