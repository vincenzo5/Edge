import { randomUUID } from "crypto";

import type {
  PlaybookInstance,
  PlaybookInstanceStatus,
  RuleRuntime,
} from "./playbook/types";
import type { TradingEnvironment } from "./types";

export type PlaybookInstancePatch = {
  status?: PlaybookInstanceStatus;
  ruleRuntimes?: RuleRuntime[];
  stopOrderId?: number | null;
  filledQty?: number | null;
};

export type PlaybookInstanceStore = {
  create(instance: PlaybookInstance): Promise<PlaybookInstance>;
  getById(id: string): Promise<PlaybookInstance | null>;
  getByOrderIntentId(orderIntentId: string): Promise<PlaybookInstance | null>;
  listByAccount(accountId: string, options?: { activeOnly?: boolean }): Promise<PlaybookInstance[]>;
  listActive(options?: { environment?: TradingEnvironment }): Promise<PlaybookInstance[]>;
  updateStatus(id: string, status: PlaybookInstanceStatus): Promise<PlaybookInstance | null>;
  patch(id: string, patch: PlaybookInstancePatch): Promise<PlaybookInstance | null>;
};

const ACTIVE_STATUSES: PlaybookInstanceStatus[] = ["pending_fill", "armed", "paused"];

function applyPlaybookPatch(
  existing: PlaybookInstance,
  patch: PlaybookInstancePatch,
): PlaybookInstance {
  const updatedAt = new Date().toISOString();
  return {
    ...existing,
    ...(patch.status != null ? { status: patch.status } : {}),
    ...(patch.ruleRuntimes != null ? { ruleRuntimes: patch.ruleRuntimes } : {}),
    ...(patch.stopOrderId !== undefined
      ? { stopOrderId: patch.stopOrderId ?? undefined }
      : {}),
    ...(patch.filledQty !== undefined
      ? {
          filledQty:
            patch.filledQty != null && Number.isFinite(patch.filledQty)
              ? patch.filledQty
              : undefined,
        }
      : {}),
    updatedAt,
  };
}

function matchesActiveEnvironment(
  instance: PlaybookInstance,
  environment?: TradingEnvironment,
): boolean {
  if (!environment) return true;
  return instance.positionPlan.environment === environment;
}

export function createMemoryPlaybookInstanceStore(): PlaybookInstanceStore {
  const byId = new Map<string, PlaybookInstance>();
  const byIntentId = new Map<string, string>();

  return {
    async create(instance) {
      byId.set(instance.id, instance);
      if (instance.orderIntentId) {
        byIntentId.set(instance.orderIntentId, instance.id);
      }
      return instance;
    },

    async getById(id) {
      return byId.get(id) ?? null;
    },

    async getByOrderIntentId(orderIntentId) {
      const id = byIntentId.get(orderIntentId);
      return id ? (byId.get(id) ?? null) : null;
    },

    async listByAccount(accountId, options) {
      const normalized = accountId.trim();
      return [...byId.values()]
        .filter((item) => item.positionPlan.accountId === normalized)
        .filter((item) => !options?.activeOnly || ACTIVE_STATUSES.includes(item.status))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async listActive(options) {
      return [...byId.values()]
        .filter((item) => ACTIVE_STATUSES.includes(item.status))
        .filter((item) => matchesActiveEnvironment(item, options?.environment))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async updateStatus(id, status) {
      const existing = byId.get(id);
      if (!existing) return null;
      const updated = applyPlaybookPatch(existing, { status });
      byId.set(id, updated);
      return updated;
    },

    async patch(id, patch) {
      const existing = byId.get(id);
      if (!existing) return null;
      const updated = applyPlaybookPatch(existing, patch);
      byId.set(id, updated);
      return updated;
    },
  };
}

const BROWSER_STORAGE_KEY = "edge:trading:playbook-instances";

function readBrowserInstances(): PlaybookInstance[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BROWSER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlaybookInstance[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBrowserInstances(records: PlaybookInstance[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(records));
}

/** Client-side read cache for playbook instances when server list is unavailable. */
export function createBrowserPlaybookInstanceStore(): PlaybookInstanceStore {
  return {
    async create(instance) {
      const records = readBrowserInstances();
      records.push(instance);
      writeBrowserInstances(records);
      return instance;
    },

    async getById(id) {
      return readBrowserInstances().find((item) => item.id === id) ?? null;
    },

    async getByOrderIntentId(orderIntentId) {
      return (
        readBrowserInstances().find((item) => item.orderIntentId === orderIntentId) ?? null
      );
    },

    async listByAccount(accountId, options) {
      const normalized = accountId.trim();
      return readBrowserInstances()
        .filter((item) => item.positionPlan.accountId === normalized)
        .filter((item) => !options?.activeOnly || ACTIVE_STATUSES.includes(item.status))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async listActive(options) {
      return readBrowserInstances()
        .filter((item) => ACTIVE_STATUSES.includes(item.status))
        .filter((item) => matchesActiveEnvironment(item, options?.environment))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async updateStatus(id, status) {
      return this.patch(id, { status });
    },

    async patch(id, patch) {
      const records = readBrowserInstances();
      const index = records.findIndex((item) => item.id === id);
      if (index < 0) return null;
      const updated = applyPlaybookPatch(records[index]!, patch);
      records[index] = updated;
      writeBrowserInstances(records);
      return updated;
    },
  };
}

export function createPlaybookInstanceId(): string {
  return randomUUID();
}

let serverPlaybookStore: PlaybookInstanceStore | null = null;
let serverPlaybookStorePromise: Promise<PlaybookInstanceStore> | null = null;

export async function resolveServerPlaybookInstanceStore(): Promise<PlaybookInstanceStore> {
  if (serverPlaybookStore) return serverPlaybookStore;
  if (!serverPlaybookStorePromise) {
    serverPlaybookStorePromise = import("./postgresPlaybookInstanceStore")
      .then(({ createPostgresPlaybookInstanceStoreIfConfigured }) =>
        createPostgresPlaybookInstanceStoreIfConfigured(),
      )
      .then((store) => {
        serverPlaybookStore = store;
        return store;
      });
  }
  return serverPlaybookStorePromise;
}

export function resetServerPlaybookInstanceStoreForTests(): void {
  serverPlaybookStore = null;
  serverPlaybookStorePromise = null;
}
