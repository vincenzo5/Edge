import { z } from "zod";

import {
  PlaybookTemplateSchema,
  type PlaybookTemplate,
} from "./playbook/types";
import { createUserPlaybookTemplateId, isUserPlaybookTemplateId } from "./playbook/resolveTemplate";
import { getPlaybookPreset } from "./playbook/presets";

export const CreatePlaybookTemplateSchema = z.object({
  sourceTemplateId: z.string().min(1),
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(240).optional(),
});

export type CreatePlaybookTemplateInput = z.infer<typeof CreatePlaybookTemplateSchema>;

export const PatchPlaybookTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().min(1).max(240).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export type PatchPlaybookTemplateInput = z.infer<typeof PatchPlaybookTemplateSchema>;

export type PlaybookTemplateStore = {
  list(): Promise<PlaybookTemplate[]>;
  getById(id: string): Promise<PlaybookTemplate | null>;
  create(input: CreatePlaybookTemplateInput): Promise<PlaybookTemplate>;
  patch(id: string, patch: PatchPlaybookTemplateInput): Promise<PlaybookTemplate | null>;
  duplicate(id: string): Promise<PlaybookTemplate | null>;
  delete(id: string): Promise<boolean>;
};

function resolveSourceTemplate(
  sourceTemplateId: string,
  userTemplates: PlaybookTemplate[],
): PlaybookTemplate | null {
  return (
    getPlaybookPreset(sourceTemplateId) ??
    userTemplates.find((item) => item.id === sourceTemplateId) ??
    null
  );
}

function duplicateTemplateName(source: PlaybookTemplate): string {
  const suffix = " (copy)";
  const base = source.name.trim();
  if (base.endsWith(suffix)) return `${base} 2`;
  return `${base}${suffix}`;
}

export function createMemoryPlaybookTemplateStore(): PlaybookTemplateStore {
  const byId = new Map<string, PlaybookTemplate>();

  return {
    async list() {
      return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    },

    async getById(id) {
      return byId.get(id) ?? null;
    },

    async create(input) {
      const userTemplates = [...byId.values()];
      const source = resolveSourceTemplate(input.sourceTemplateId, userTemplates);
      if (!source) {
        throw new Error(`Unknown source template: ${input.sourceTemplateId}`);
      }
      const template = PlaybookTemplateSchema.parse({
        id: createUserPlaybookTemplateId(),
        name: input.name?.trim() || duplicateTemplateName(source),
        description: input.description?.trim() || source.description,
        rules: source.rules,
      });
      byId.set(template.id, template);
      return template;
    },

    async patch(id, patch) {
      if (!isUserPlaybookTemplateId(id)) return null;
      const existing = byId.get(id);
      if (!existing) return null;
      const updated = PlaybookTemplateSchema.parse({
        ...existing,
        ...(patch.name != null ? { name: patch.name } : {}),
        ...(patch.description != null ? { description: patch.description } : {}),
      });
      byId.set(id, updated);
      return updated;
    },

    async duplicate(id) {
      const userTemplates = [...byId.values()];
      const source =
        getPlaybookPreset(id) ?? userTemplates.find((item) => item.id === id) ?? null;
      if (!source) return null;
      const template = PlaybookTemplateSchema.parse({
        id: createUserPlaybookTemplateId(),
        name: duplicateTemplateName(source),
        description: source.description,
        rules: source.rules,
      });
      byId.set(template.id, template);
      return template;
    },

    async delete(id) {
      if (!isUserPlaybookTemplateId(id)) return false;
      return byId.delete(id);
    },
  };
}

const BROWSER_STORAGE_KEY = "edge:trading:playbook-templates";

function readBrowserTemplates(): PlaybookTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BROWSER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlaybookTemplate[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => PlaybookTemplateSchema.safeParse(item).success);
  } catch {
    return [];
  }
}

function writeBrowserTemplates(records: PlaybookTemplate[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(records));
}

export function createBrowserPlaybookTemplateStore(): PlaybookTemplateStore {
  return {
    async list() {
      return readBrowserTemplates().sort((a, b) => a.name.localeCompare(b.name));
    },

    async getById(id) {
      return readBrowserTemplates().find((item) => item.id === id) ?? null;
    },

    async create(input) {
      const records = readBrowserTemplates();
      const source = resolveSourceTemplate(input.sourceTemplateId, records);
      if (!source) {
        throw new Error(`Unknown source template: ${input.sourceTemplateId}`);
      }
      const template = PlaybookTemplateSchema.parse({
        id: createUserPlaybookTemplateId(),
        name: input.name?.trim() || duplicateTemplateName(source),
        description: input.description?.trim() || source.description,
        rules: source.rules,
      });
      records.push(template);
      writeBrowserTemplates(records);
      return template;
    },

    async patch(id, patch) {
      if (!isUserPlaybookTemplateId(id)) return null;
      const records = readBrowserTemplates();
      const index = records.findIndex((item) => item.id === id);
      if (index < 0) return null;
      const updated = PlaybookTemplateSchema.parse({
        ...records[index]!,
        ...(patch.name != null ? { name: patch.name } : {}),
        ...(patch.description != null ? { description: patch.description } : {}),
      });
      records[index] = updated;
      writeBrowserTemplates(records);
      return updated;
    },

    async duplicate(id) {
      const records = readBrowserTemplates();
      const source =
        getPlaybookPreset(id) ?? records.find((item) => item.id === id) ?? null;
      if (!source) return null;
      const template = PlaybookTemplateSchema.parse({
        id: createUserPlaybookTemplateId(),
        name: duplicateTemplateName(source),
        description: source.description,
        rules: source.rules,
      });
      records.push(template);
      writeBrowserTemplates(records);
      return template;
    },

    async delete(id) {
      if (!isUserPlaybookTemplateId(id)) return false;
      const records = readBrowserTemplates().filter((item) => item.id !== id);
      if (records.length === readBrowserTemplates().length) return false;
      writeBrowserTemplates(records);
      return true;
    },
  };
}

let serverTemplateStore: PlaybookTemplateStore | null = null;
let serverTemplateStorePromise: Promise<PlaybookTemplateStore> | null = null;

export async function resolveServerPlaybookTemplateStore(): Promise<PlaybookTemplateStore> {
  if (serverTemplateStore) return serverTemplateStore;
  if (!serverTemplateStorePromise) {
    serverTemplateStorePromise = import("./postgresPlaybookTemplateStore")
      .then(({ createPostgresPlaybookTemplateStoreIfConfigured }) =>
        createPostgresPlaybookTemplateStoreIfConfigured(),
      )
      .then((store) => {
        serverTemplateStore = store;
        return store;
      });
  }
  return serverTemplateStorePromise;
}

export function resetServerPlaybookTemplateStoreForTests(): void {
  serverTemplateStore = null;
  serverTemplateStorePromise = null;
}
