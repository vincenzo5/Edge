import "server-only";

import { getTradingService } from "@/lib/trading/tradingService";

const ACTIVE_TICK_MS = 2_000;
const IDLE_TICK_MS = 15_000;

let started = false;
let timer: ReturnType<typeof setInterval> | undefined;
let ticking = false;

export function isManageWorkerEnabled(): boolean {
  const raw = process.env.EDGE_MANAGE_WORKER?.trim().toLowerCase();
  if (raw === "0" || raw === "false") return false;
  if (raw === "1" || raw === "true") return true;
  if (process.env.NODE_ENV === "test") return false;
  return process.env.TWS_ENABLED === "true" || process.env.NODE_ENV === "development";
}

async function tickManageWorker(): Promise<void> {
  if (ticking) return;
  ticking = true;
  try {
    const service = getTradingService();
    const instances = await service.listActivePlaybookInstances();
    if (instances.length === 0) {
      scheduleNext(IDLE_TICK_MS);
      return;
    }
    await service.evaluatePlaybooks();
    scheduleNext(ACTIVE_TICK_MS);
  } catch {
    scheduleNext(ACTIVE_TICK_MS);
  } finally {
    ticking = false;
  }
}

function scheduleNext(delayMs: number): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void tickManageWorker();
  }, delayMs);
}

export function startManageWorker(): void {
  if (started || !isManageWorkerEnabled()) return;
  started = true;
  scheduleNext(ACTIVE_TICK_MS);
}

export function stopManageWorker(): void {
  if (timer) clearTimeout(timer);
  timer = undefined;
  started = false;
}

/** Test helper — reset singleton state. */
export function resetManageWorkerForTests(): void {
  stopManageWorker();
}
