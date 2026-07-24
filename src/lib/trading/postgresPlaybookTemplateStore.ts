import "server-only";

import { isDatabaseConfigured } from "@/db";
import { ensureDevAppUser } from "@/lib/persistence/repositories/appUserRepository";
import {
  deletePlaybookTemplate,
  duplicatePlaybookTemplate,
  findPlaybookTemplateById,
  insertPlaybookTemplate,
  listPlaybookTemplates,
  patchPlaybookTemplate,
} from "@/lib/persistence/repositories/playbookTemplateRepository";
import {
  createMemoryPlaybookTemplateStore,
  type PlaybookTemplateStore,
} from "./playbookTemplateStore";

export async function createPostgresPlaybookTemplateStoreIfConfigured(): Promise<PlaybookTemplateStore> {
  if (!isDatabaseConfigured()) {
    return createMemoryPlaybookTemplateStore();
  }

  const userId = await ensureDevAppUser();

  return {
    async list() {
      return listPlaybookTemplates(userId);
    },
    async getById(id) {
      return findPlaybookTemplateById(userId, id);
    },
    async create(input) {
      return insertPlaybookTemplate(userId, input);
    },
    async patch(id, patch) {
      return patchPlaybookTemplate(userId, id, patch);
    },
    async duplicate(id) {
      return duplicatePlaybookTemplate(userId, id);
    },
    async delete(id) {
      return deletePlaybookTemplate(userId, id);
    },
  };
}
