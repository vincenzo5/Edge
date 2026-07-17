import "server-only";

import { isDatabaseConfigured } from "@/db";
import { runBrokerageIngestForEnvironment } from "@/lib/brokerage/ingest/runBrokerageIngest";
import type { TradingEnvironment } from "@/lib/trading/types";

const INGEST_MIN_INTERVAL_MS = 30_000;

const scheduledByEnvironment = new Map<TradingEnvironment, NodeJS.Timeout>();
const lastRunAtByEnvironment = new Map<TradingEnvironment, number>();
const inFlightByEnvironment = new Set<TradingEnvironment>();

async function resolveIngestUserId(): Promise<string | null> {
  const { getCurrentUser } = await import("@/lib/persistence/auth/getCurrentUser");
  const { ensureDevAppUser } = await import("@/lib/persistence/repositories/appUserRepository");

  const user = await getCurrentUser();
  if (user) return user.id;
  if (!isDatabaseConfigured()) return null;
  return ensureDevAppUser();
}

export async function triggerBrokerageIngest(
  environment: TradingEnvironment,
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  if (inFlightByEnvironment.has(environment)) return;

  const userId = await resolveIngestUserId();
  if (!userId) return;

  inFlightByEnvironment.add(environment);
  lastRunAtByEnvironment.set(environment, Date.now());
  try {
    await runBrokerageIngestForEnvironment(userId, environment);
  } finally {
    inFlightByEnvironment.delete(environment);
  }
}

/** Debounced server-side ingest — call from brokerage snapshot route. */
export function scheduleBrokerageIngest(environment: TradingEnvironment): void {
  if (!isDatabaseConfigured()) return;

  const now = Date.now();
  const lastRun = lastRunAtByEnvironment.get(environment) ?? 0;
  const elapsed = now - lastRun;

  if (elapsed >= INGEST_MIN_INTERVAL_MS && !inFlightByEnvironment.has(environment)) {
    void triggerBrokerageIngest(environment);
    return;
  }

  if (scheduledByEnvironment.has(environment)) return;

  const delay = Math.max(INGEST_MIN_INTERVAL_MS - elapsed, 1_000);
  const timer = setTimeout(() => {
    scheduledByEnvironment.delete(environment);
    void triggerBrokerageIngest(environment);
  }, delay);
  scheduledByEnvironment.set(environment, timer);
}

export function resetBrokerageIngestScheduleForTests(): void {
  for (const timer of scheduledByEnvironment.values()) {
    clearTimeout(timer);
  }
  scheduledByEnvironment.clear();
  lastRunAtByEnvironment.clear();
  inFlightByEnvironment.clear();
}
