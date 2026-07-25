import "server-only";

import { isDatabaseConfigured } from "@/db";
import { redactDiagnostic } from "@/lib/api/redactDiagnostic";
import { ensureDevAppUser } from "@/lib/persistence/repositories/appUserRepository";
import {
  insertProductionErrorEvent,
  purgeProductionErrorEventsOlderThan,
  type ProductionErrorInsertInput,
} from "@/lib/persistence/repositories/productionErrorRepository";
import { getRequestId } from "./requestIdContext";
import { productionErrorRetentionCutoffMs } from "./productionErrorRetention";

const SOURCE_MAX_LENGTH = 64;
const MESSAGE_MAX_LENGTH = 240;
const STACK_MAX_LENGTH = 2000;
const DETAIL_MAX_LENGTH = 240;

let lastPurgeAtMs = 0;
const PURGE_INTERVAL_MS = 60_000;

export type ProductionErrorPersistInput = {
  at?: number;
  source: string;
  message: string;
  stack?: string;
  detail?: string;
  requestId?: string;
};

function sanitizeForPersist(input: ProductionErrorPersistInput): ProductionErrorInsertInput {
  const entry: ProductionErrorInsertInput = {
    at: input.at ?? Date.now(),
    source: redactDiagnostic(input.source, { maxLength: SOURCE_MAX_LENGTH }),
    message: redactDiagnostic(input.message, { maxLength: MESSAGE_MAX_LENGTH }),
  };
  if (input.stack) {
    entry.stack = redactDiagnostic(input.stack, { maxLength: STACK_MAX_LENGTH });
  }
  if (input.detail) {
    entry.detail = redactDiagnostic(input.detail, { maxLength: DETAIL_MAX_LENGTH });
  }
  const requestId = input.requestId ?? getRequestId();
  if (requestId) {
    entry.requestId = redactDiagnostic(requestId, { maxLength: 128 });
  }
  return entry;
}

async function maybePurgeOldEvents(): Promise<void> {
  const now = Date.now();
  if (now - lastPurgeAtMs < PURGE_INTERVAL_MS) {
    return;
  }
  lastPurgeAtMs = now;
  await purgeProductionErrorEventsOlderThan(productionErrorRetentionCutoffMs(now));
}

export async function persistProductionError(
  input: ProductionErrorPersistInput,
  options: { userId?: string } = {},
): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  const userId = options.userId ?? (await ensureDevAppUser());
  const sanitized = sanitizeForPersist(input);
  await insertProductionErrorEvent(userId, sanitized);
  await maybePurgeOldEvents();
}

export async function purgeProductionErrorRetentionNow(): Promise<number> {
  if (!isDatabaseConfigured()) {
    return 0;
  }
  return purgeProductionErrorEventsOlderThan(productionErrorRetentionCutoffMs());
}
