import { z } from "zod";

import { LIVE_CONFIRMATION_TOKEN } from "./validateOrder";
import type { TradingEnvironment } from "./types";

export const PlaybookAutoManageSettingsSchema = z.object({
  paperEnabled: z.boolean(),
  liveEnabled: z.boolean(),
  liveConsentAt: z.string().datetime().optional(),
});

export type PlaybookAutoManageSettings = z.infer<typeof PlaybookAutoManageSettingsSchema>;

export const DEFAULT_PLAYBOOK_AUTO_MANAGE: PlaybookAutoManageSettings = {
  paperEnabled: true,
  liveEnabled: false,
};

export const PatchPlaybookAutoManageSchema = z
  .object({
    paperEnabled: z.boolean().optional(),
    liveEnabled: z.boolean().optional(),
    liveConfirmation: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.liveEnabled === true) {
      if (value.liveConfirmation?.trim() !== LIVE_CONFIRMATION_TOKEN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Enabling live auto-manage requires liveConfirmation: "${LIVE_CONFIRMATION_TOKEN}"`,
          path: ["liveConfirmation"],
        });
      }
    }
  });

export type PatchPlaybookAutoManageInput = z.infer<typeof PatchPlaybookAutoManageSchema>;

export function mergePlaybookAutoManagePatch(
  existing: PlaybookAutoManageSettings,
  patch: PatchPlaybookAutoManageInput,
): PlaybookAutoManageSettings {
  const next: PlaybookAutoManageSettings = {
    paperEnabled: patch.paperEnabled ?? existing.paperEnabled,
    liveEnabled: patch.liveEnabled ?? existing.liveEnabled,
    liveConsentAt: existing.liveConsentAt,
  };

  if (patch.liveEnabled === true) {
    next.liveConsentAt = new Date().toISOString();
  } else if (patch.liveEnabled === false) {
    next.liveEnabled = false;
    next.liveConsentAt = undefined;
  }

  return PlaybookAutoManageSettingsSchema.parse(next);
}

export function isAutoManageEnabledForEnvironment(
  settings: PlaybookAutoManageSettings,
  environment: TradingEnvironment,
): boolean {
  if (environment === "paper") return settings.paperEnabled;
  return settings.liveEnabled && settings.liveConsentAt != null;
}

export function resolvePlaybookLiveConfirmation(
  settings: PlaybookAutoManageSettings,
  environment: TradingEnvironment,
): string | undefined {
  if (environment !== "live") return undefined;
  if (!settings.liveEnabled || !settings.liveConsentAt) return undefined;
  return LIVE_CONFIRMATION_TOKEN;
}

export type PlaybookAutoManageStore = {
  get(): Promise<PlaybookAutoManageSettings>;
  patch(input: PatchPlaybookAutoManageInput): Promise<PlaybookAutoManageSettings>;
};

export function createMemoryPlaybookAutoManageStore(
  initial: PlaybookAutoManageSettings = DEFAULT_PLAYBOOK_AUTO_MANAGE,
): PlaybookAutoManageStore {
  let settings = PlaybookAutoManageSettingsSchema.parse(initial);
  return {
    async get() {
      return settings;
    },
    async patch(input) {
      settings = mergePlaybookAutoManagePatch(settings, input);
      return settings;
    },
  };
}

let serverAutoManageStore: PlaybookAutoManageStore | null = null;
let serverAutoManageStorePromise: Promise<PlaybookAutoManageStore> | null = null;

export async function resolveServerPlaybookAutoManageStore(): Promise<PlaybookAutoManageStore> {
  if (serverAutoManageStore) return serverAutoManageStore;
  if (!serverAutoManageStorePromise) {
    serverAutoManageStorePromise = import("./postgresPlaybookAutoManageStore")
      .then(({ createPostgresPlaybookAutoManageStoreIfConfigured }) =>
        createPostgresPlaybookAutoManageStoreIfConfigured(),
      )
      .then((store) => {
        serverAutoManageStore = store;
        return store;
      });
  }
  return serverAutoManageStorePromise;
}

export function resetServerPlaybookAutoManageStoreForTests(): void {
  serverAutoManageStore = null;
  serverAutoManageStorePromise = null;
}
