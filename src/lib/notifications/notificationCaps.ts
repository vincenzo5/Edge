export const MAX_NOTIFICATION_TOASTS = 5;
export const MAX_NOTIFICATION_SEEN_IDS = 200;

export function capNotificationToasts<T extends { id: string }>(current: T[], next: T): T[] {
  if (current.some((toast) => toast.id === next.id)) {
    return current;
  }
  return [...current, next].slice(-MAX_NOTIFICATION_TOASTS);
}

export function trackSeenNotificationId(seenIds: Set<string>, id: string): void {
  seenIds.add(id);
  if (seenIds.size <= MAX_NOTIFICATION_SEEN_IDS) {
    return;
  }
  const keep = [...seenIds].slice(-MAX_NOTIFICATION_SEEN_IDS);
  seenIds.clear();
  for (const keepId of keep) {
    seenIds.add(keepId);
  }
}
