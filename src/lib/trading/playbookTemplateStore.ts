import { z } from "zod";

import {
  PlaybookRuleSchema,
  PlaybookTemplateSchema,
  type PlaybookTemplate,
} from "./playbook/types";
import { isUserPlaybookTemplateId } from "./playbook/resolveTemplate";
import { getPlaybookPreset } from "./playbook/presets";
import {
  applyPlaybookTemplatePatch,
  userTemplateFromDefinition,
  userTemplateFromSource,
} from "./playbookTemplateMutations";

const CreateFromSourceSchema = z.object({
  sourceTemplateId: z.string().min(1),
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(1).max(240).optional(),
});

const CreateFromDefinitionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(240),
  rules: z.array(PlaybookRuleSchema).min(1),
  schemaVersion: z.literal(1).optional(),
  scope: z.enum(["trade"]).optional(),
  budget: z
    .union([
      z.object({ kind: z.enum(["dollar", "percentNetLiq"]), value: z.number().positive() }),
      z.object({ kind: z.literal("inherits") }),
    ])
    .optional(),
  sizing: z
    .union([
      z.object({ method: z.literal("stopDistance"), maxQty: z.number().positive().optional() }),
      z.object({ kind: z.literal("inherits") }),
    ])
    .optional(),
  geometry: z
    .object({
      stops: z
        .array(
          z.object({
            rMultiple: z.number().positive().optional(),
            price: z.number().positive().optional(),
          }),
        )
        .min(1)
        .optional(),
      targets: z
        .array(
          z.object({
            rMultiple: z.number().positive().optional(),
            price: z.number().positive().optional(),
          }),
        )
        .optional(),
      timeHorizonBars: z.number().int().positive().optional(),
    })
    .optional(),
  exits: z.array(PlaybookRuleSchema).optional(),
  gates: z
    .object({
      minRiskReward: z.number().positive().optional(),
      maxQty: z.number().positive().optional(),
    })
    .optional(),
  defaultEntrySchedule: z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("immediate") }),
      z.object({
        kind: z.literal("sessionEvent"),
        event: z.enum(["nextRthOpen", "nextRthClose"]),
      }),
      z.object({
        kind: z.literal("clock"),
        at: z.string().datetime(),
        timeZone: z.string().min(1),
      }),
    ])
    .optional(),
});

export const CreatePlaybookTemplateSchema = z.union([
  CreateFromSourceSchema,
  CreateFromDefinitionSchema,
]);

export type CreatePlaybookTemplateInput = z.infer<typeof CreatePlaybookTemplateSchema>;

export function isCreateFromSource(
  input: CreatePlaybookTemplateInput,
): input is z.infer<typeof CreateFromSourceSchema> {
  return "sourceTemplateId" in input && typeof input.sourceTemplateId === "string";
}

export const PatchPlaybookTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().min(1).max(240).optional(),
    rules: z.array(PlaybookRuleSchema).min(1).optional(),
    schemaVersion: z.literal(1).optional(),
    scope: z.enum(["trade"]).optional(),
    budget: z.union([
      z.object({ kind: z.enum(["dollar", "percentNetLiq"]), value: z.number().positive() }),
      z.object({ kind: z.literal("inherits") }),
    ]).optional(),
    sizing: z.union([
      z.object({ method: z.literal("stopDistance"), maxQty: z.number().positive().optional() }),
      z.object({ kind: z.literal("inherits") }),
    ]).optional(),
    geometry: z
      .object({
        stops: z.array(z.object({ rMultiple: z.number().positive().optional(), price: z.number().positive().optional() })).min(1).optional(),
        targets: z.array(z.object({ rMultiple: z.number().positive().optional(), price: z.number().positive().optional() })).optional(),
        timeHorizonBars: z.number().int().positive().optional(),
      })
      .optional(),
    exits: z.array(PlaybookRuleSchema).optional(),
    gates: z
      .object({
        minRiskReward: z.number().positive().optional(),
        maxQty: z.number().positive().optional(),
      })
      .optional(),
    defaultEntrySchedule: z
      .discriminatedUnion("kind", [
        z.object({ kind: z.literal("immediate") }),
        z.object({
          kind: z.literal("sessionEvent"),
          event: z.enum(["nextRthOpen", "nextRthClose"]),
        }),
        z.object({
          kind: z.literal("clock"),
          at: z.string().datetime(),
          timeZone: z.string().min(1),
        }),
      ])
      .optional(),
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
      const template = isCreateFromSource(input)
        ? (() => {
            const userTemplates = [...byId.values()];
            const source = resolveSourceTemplate(input.sourceTemplateId, userTemplates);
            if (!source) {
              throw new Error(`Unknown source template: ${input.sourceTemplateId}`);
            }
            return userTemplateFromSource(source, {
              name: input.name,
              description: input.description,
            });
          })()
        : userTemplateFromDefinition(input);
      byId.set(template.id, template);
      return template;
    },

    async patch(id, patch) {
      if (!isUserPlaybookTemplateId(id)) return null;
      const existing = byId.get(id);
      if (!existing) return null;
      const updated = applyPlaybookTemplatePatch(existing, patch);
      byId.set(id, updated);
      return updated;
    },

    async duplicate(id) {
      const userTemplates = [...byId.values()];
      const source =
        getPlaybookPreset(id) ?? userTemplates.find((item) => item.id === id) ?? null;
      if (!source) return null;
      const template = userTemplateFromSource(source);
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
      const template = isCreateFromSource(input)
        ? (() => {
            const source = resolveSourceTemplate(input.sourceTemplateId, records);
            if (!source) {
              throw new Error(`Unknown source template: ${input.sourceTemplateId}`);
            }
            return userTemplateFromSource(source, {
              name: input.name,
              description: input.description,
            });
          })()
        : userTemplateFromDefinition(input);
      records.push(template);
      writeBrowserTemplates(records);
      return template;
    },

    async patch(id, patch) {
      if (!isUserPlaybookTemplateId(id)) return null;
      const records = readBrowserTemplates();
      const index = records.findIndex((item) => item.id === id);
      if (index < 0) return null;
      const updated = applyPlaybookTemplatePatch(records[index]!, patch);
      records[index] = updated;
      writeBrowserTemplates(records);
      return updated;
    },

    async duplicate(id) {
      const records = readBrowserTemplates();
      const source =
        getPlaybookPreset(id) ?? records.find((item) => item.id === id) ?? null;
      if (!source) return null;
      const template = userTemplateFromSource(source);
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
