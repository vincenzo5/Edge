import "server-only";

import { isDatabaseConfigured } from "@/db";
import { ensureDevAppUser } from "@/lib/persistence/repositories/appUserRepository";
import {
  findIntentById,
  findIntentByIdempotencyKey,
  insertIntent,
  patchIntent,
} from "@/lib/persistence/repositories/intentRepository";
import type { OrderDraft } from "./types";
import {
  createIntentRecord,
  createMemoryIntentStore,
  type OrderIntentStore,
} from "./intentStore";
import { normalizeDraftForHash } from "./validateOrder";

export async function createPostgresIntentStoreIfConfigured(): Promise<OrderIntentStore> {
  if (!isDatabaseConfigured()) {
    return createMemoryIntentStore();
  }

  const userId = await ensureDevAppUser();

  return {
    async createIntent(draft: OrderDraft, idempotencyKey: string) {
      const draftHash = normalizeDraftForHash(draft);
      const existing = await findIntentByIdempotencyKey(userId, idempotencyKey);
      if (existing) {
        const existingHash = normalizeDraftForHash(existing.draft);
        if (existingHash === draftHash) {
          return existing;
        }
      }

      const record = createIntentRecord(draft, idempotencyKey);
      return insertIntent(userId, record);
    },

    async getById(intentId: string) {
      return findIntentById(userId, intentId);
    },

    async getByIdempotencyKey(idempotencyKey: string) {
      return findIntentByIdempotencyKey(userId, idempotencyKey);
    },

    async updateIntent(intentId, patch) {
      return patchIntent(userId, intentId, patch);
    },
  };
}
