import { randomUUID } from "crypto";

import type { PolicyBindingRef } from "@/lib/risk/policy/slotSchemas";

import type {
  PlaybookInstance,
  PlaybookInstanceStatus,
  PlaybookInstanceWithPolicy,
  RuleRuntime,
} from "./playbook/types";
import type { TradingEnvironment } from "./types";

export type PlaybookInstancePatch = {
  status?: PlaybookInstanceStatus;
  ruleRuntimes?: RuleRuntime[];
  stopOrderId?: number | null;
  filledQty?: number | null;
  alertBundleId?: string | null;
  controlMode?: PlaybookInstance["controlMode"];
  offReason?: PlaybookInstance["offReason"];
  protect?: PlaybookInstance["protect"];
  protectState?: PlaybookInstance["protectState"];
  protectCheckedAt?: string | null;
  entrySchedule?: PlaybookInstance["entrySchedule"];
  entryOrder?: PlaybookInstance["entryOrder"];
  scheduledFor?: string | null;
  positionPlan?: PlaybookInstance["positionPlan"];
  detachedAt?: string | null;
  closedAt?: string | null;
  armedAt?: string | null;
};

export class PlaybookInstanceConflictError extends Error {
  readonly code = "playbook_instance_conflict" as const;

  constructor(
    message: string,
    readonly conflict: PlaybookInstanceWithPolicy,
  ) {
    super(message);
    this.name = "PlaybookInstanceConflictError";
  }
}

export type PlaybookInstanceStore = {
  create(instance: PlaybookInstanceWithPolicy): Promise<PlaybookInstanceWithPolicy>;
  getById(id: string): Promise<PlaybookInstanceWithPolicy | null>;
  getByOrderIntentId(orderIntentId: string): Promise<PlaybookInstanceWithPolicy | null>;
  findActiveByTradeKey(args: {
    environment: TradingEnvironment;
    accountId: string;
    symbol: string;
  }): Promise<PlaybookInstanceWithPolicy | null>;
  findPlannedByBinding(bindingRef: PolicyBindingRef): Promise<PlaybookInstanceWithPolicy | null>;
  listByAccount(
    accountId: string,
    options?: { activeOnly?: boolean },
  ): Promise<PlaybookInstanceWithPolicy[]>;
  listActive(options?: { environment?: TradingEnvironment }): Promise<PlaybookInstanceWithPolicy[]>;
  updateStatus(
    id: string,
    status: PlaybookInstanceStatus,
  ): Promise<PlaybookInstanceWithPolicy | null>;
  patch(id: string, patch: PlaybookInstancePatch): Promise<PlaybookInstanceWithPolicy | null>;
};

const ACTIVE_STATUSES: PlaybookInstanceStatus[] = ["pending_fill", "armed", "paused"];

function resolveTradeKey(instance: PlaybookInstance) {
  return {
    environment: instance.environment ?? instance.positionPlan.environment,
    accountId: instance.accountId ?? instance.positionPlan.accountId,
    symbol: (instance.symbol ?? instance.positionPlan.symbol).trim().toUpperCase(),
  };
}

function applyPlaybookPatch(
  existing: PlaybookInstanceWithPolicy,
  patch: PlaybookInstancePatch,
): PlaybookInstanceWithPolicy {
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
    ...(patch.alertBundleId !== undefined
      ? { alertBundleId: patch.alertBundleId ?? undefined }
      : {}),
    ...(patch.controlMode != null ? { controlMode: patch.controlMode } : {}),
    ...(patch.offReason != null ? { offReason: patch.offReason } : {}),
    ...(patch.protect != null ? { protect: patch.protect } : {}),
    ...(patch.protectState != null ? { protectState: patch.protectState } : {}),
    ...(patch.protectCheckedAt !== undefined
      ? { protectCheckedAt: patch.protectCheckedAt ?? undefined }
      : {}),
    ...(patch.entrySchedule != null ? { entrySchedule: patch.entrySchedule } : {}),
    ...(patch.entryOrder != null ? { entryOrder: patch.entryOrder } : {}),
    ...(patch.scheduledFor !== undefined
      ? { scheduledFor: patch.scheduledFor ?? undefined }
      : {}),
    ...(patch.positionPlan != null ? { positionPlan: patch.positionPlan } : {}),
    ...(patch.detachedAt !== undefined ? { detachedAt: patch.detachedAt ?? undefined } : {}),
    ...(patch.closedAt !== undefined ? { closedAt: patch.closedAt ?? undefined } : {}),
    ...(patch.armedAt !== undefined ? { armedAt: patch.armedAt ?? undefined } : {}),
    updatedAt,
  };
}

function matchesActiveEnvironment(
  instance: PlaybookInstance,
  environment?: TradingEnvironment,
): boolean {
  if (!environment) return true;
  return resolveTradeKey(instance).environment === environment;
}

export function createMemoryPlaybookInstanceStore(): PlaybookInstanceStore {
  const byId = new Map<string, PlaybookInstanceWithPolicy>();
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

    async findActiveByTradeKey(args) {
      const normalizedSymbol = args.symbol.trim().toUpperCase();
      return (
        [...byId.values()].find((item) => {
          if (!ACTIVE_STATUSES.includes(item.status)) return false;
          const key = resolveTradeKey(item);
          return (
            key.environment === args.environment &&
            key.accountId === args.accountId.trim() &&
            key.symbol === normalizedSymbol
          );
        }) ?? null
      );
    },

    async findPlannedByBinding(bindingRef) {
      return (
        [...byId.values()].find(
          (item) =>
            item.status === "planned" &&
            item.bindingRef?.kind === bindingRef.kind &&
            item.bindingRef?.id === bindingRef.id,
        ) ?? null
      );
    },

    async listByAccount(accountId, options) {
      const normalized = accountId.trim();
      return [...byId.values()]
        .filter((item) => resolveTradeKey(item).accountId === normalized)
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

function readBrowserInstances(): PlaybookInstanceWithPolicy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BROWSER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlaybookInstanceWithPolicy[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBrowserInstances(records: PlaybookInstanceWithPolicy[]): void {
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

    async findActiveByTradeKey(args) {
      const store = createMemoryPlaybookInstanceStore();
      for (const item of readBrowserInstances()) {
        await store.create(item);
      }
      return store.findActiveByTradeKey(args);
    },

    async findPlannedByBinding(bindingRef) {
      return (
        readBrowserInstances().find(
          (item) =>
            item.status === "planned" &&
            item.bindingRef?.kind === bindingRef.kind &&
            item.bindingRef?.id === bindingRef.id,
        ) ?? null
      );
    },

    async listByAccount(accountId, options) {
      const normalized = accountId.trim();
      return readBrowserInstances()
        .filter((item) => resolveTradeKey(item).accountId === normalized)
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
