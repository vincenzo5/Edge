import "server-only";

import { isDatabaseConfigured } from "@/db";
import { ensureDevAppUser } from "@/lib/persistence/repositories/appUserRepository";
import {
  getPlaybookAutoManageSettings,
  patchPlaybookAutoManageSettings,
} from "@/lib/persistence/repositories/playbookAutoManageRepository";
import {
  createMemoryPlaybookAutoManageStore,
  type PlaybookAutoManageStore,
} from "./playbookAutoManageStore";

export async function createPostgresPlaybookAutoManageStoreIfConfigured(): Promise<PlaybookAutoManageStore> {
  if (!isDatabaseConfigured()) {
    return createMemoryPlaybookAutoManageStore();
  }

  const userId = await ensureDevAppUser();

  return {
    async get() {
      return getPlaybookAutoManageSettings(userId);
    },
    async patch(input) {
      return patchPlaybookAutoManageSettings(userId, input);
    },
  };
}
