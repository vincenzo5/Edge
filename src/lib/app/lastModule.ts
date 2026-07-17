export type AppModule = "home" | "chart" | "journal" | "research" | "screener" | "workspace";

export const LAST_MODULE_STORAGE_KEY = "tv-ai:last-module:v1";
export const LAST_MODULE_TTL_MS = 24 * 60 * 60 * 1000;

export type LastModuleRecord = {
  module: AppModule;
  updatedAt: string;
};

export type RootRedirectTarget = "/home" | "/workspace";

export function readLastModuleRecord(raw: string | null): LastModuleRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LastModuleRecord>;
    if (
      parsed.module !== "home" &&
      parsed.module !== "chart" &&
      parsed.module !== "journal" &&
      parsed.module !== "research" &&
      parsed.module !== "screener" &&
      parsed.module !== "workspace"
    ) {
      return null;
    }
    if (typeof parsed.updatedAt !== "string") return null;
    return { module: parsed.module, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

export function isLastModuleRecent(
  record: LastModuleRecord,
  nowMs: number = Date.now(),
  ttlMs: number = LAST_MODULE_TTL_MS,
): boolean {
  const updatedAtMs = Date.parse(record.updatedAt);
  if (Number.isNaN(updatedAtMs)) return false;
  return nowMs - updatedAtMs <= ttlMs;
}

export function resolveRootRedirectTarget(
  record: LastModuleRecord | null,
  nowMs: number = Date.now(),
): RootRedirectTarget {
  if (!record || !isLastModuleRecent(record, nowMs)) {
    return "/home";
  }
  if (
    record.module === "chart" ||
    record.module === "journal" ||
    record.module === "screener" ||
    record.module === "workspace"
  ) {
    return "/workspace";
  }
  return "/home";
}

export function shouldRedirectFromRoot(
  raw: string | null,
  nowMs: number = Date.now(),
): RootRedirectTarget {
  return resolveRootRedirectTarget(readLastModuleRecord(raw), nowMs);
}

export function createLastModuleRecord(
  module: AppModule,
  nowMs: number = Date.now(),
): LastModuleRecord {
  return {
    module,
    updatedAt: new Date(nowMs).toISOString(),
  };
}

export function serializeLastModuleRecord(record: LastModuleRecord): string {
  return JSON.stringify(record);
}

export function recordLastModule(module: AppModule): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LAST_MODULE_STORAGE_KEY,
      serializeLastModuleRecord(createLastModuleRecord(module)),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function readLastModuleFromStorage(): LastModuleRecord | null {
  if (typeof window === "undefined") return null;
  try {
    return readLastModuleRecord(window.localStorage.getItem(LAST_MODULE_STORAGE_KEY));
  } catch {
    return null;
  }
}
