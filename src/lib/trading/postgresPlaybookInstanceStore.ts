import "server-only";

import { isDatabaseConfigured } from "@/db";
import { ensureDevAppUser } from "@/lib/persistence/repositories/appUserRepository";
import {
  findActivePlaybookInstanceByTradeKey,
  findPlannedPlaybookInstanceByBinding,
  findPlaybookInstanceById,
  findPlaybookInstanceByOrderIntentId,
  insertPlaybookInstance,
  listActivePlaybookInstances,
  listPlaybookInstancesByAccount,
  patchPlaybookInstance,
  patchPlaybookInstanceStatus,
} from "@/lib/persistence/repositories/playbookInstanceRepository";
import type { PlaybookInstanceWithPolicy } from "./playbook/types";
import {
  createMemoryPlaybookInstanceStore,
  type PlaybookInstancePatch,
  type PlaybookInstanceStore,
} from "./playbookInstanceStore";

export async function createPostgresPlaybookInstanceStoreIfConfigured(): Promise<PlaybookInstanceStore> {
  if (!isDatabaseConfigured()) {
    return createMemoryPlaybookInstanceStore();
  }

  const userId = await ensureDevAppUser();

  return {
    async create(instance: PlaybookInstanceWithPolicy) {
      return insertPlaybookInstance(userId, instance);
    },

    async getById(id: string) {
      return findPlaybookInstanceById(userId, id);
    },

    async getByOrderIntentId(orderIntentId: string) {
      return findPlaybookInstanceByOrderIntentId(userId, orderIntentId);
    },

    async findActiveByTradeKey(args) {
      return findActivePlaybookInstanceByTradeKey(userId, args);
    },

    async findPlannedByBinding(bindingRef) {
      return findPlannedPlaybookInstanceByBinding(userId, bindingRef);
    },

    async listByAccount(accountId: string, options?: { activeOnly?: boolean }) {
      return listPlaybookInstancesByAccount(userId, accountId, options);
    },

    async listActive(options) {
      return listActivePlaybookInstances(userId, options);
    },

    async updateStatus(id, status) {
      return patchPlaybookInstanceStatus(userId, id, status);
    },

    async patch(id: string, patch: PlaybookInstancePatch) {
      return patchPlaybookInstance(userId, id, patch);
    },
  };
}
