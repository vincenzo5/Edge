import { NOTIFICATION_DEDUPE_WINDOW_MS } from "./types";

export function shouldSuppressNotificationDedupe(
  existingCreatedAt: string | Date,
  nowMs: number = Date.now(),
  windowMs: number = NOTIFICATION_DEDUPE_WINDOW_MS,
): boolean {
  const createdMs =
    existingCreatedAt instanceof Date
      ? existingCreatedAt.getTime()
      : new Date(existingCreatedAt).getTime();
  if (!Number.isFinite(createdMs)) return false;
  return nowMs - createdMs < windowMs;
}
