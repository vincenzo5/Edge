import type { NotificationEvent, NotificationSource } from "@/lib/notifications/types";
import { shouldSuppressNotificationDedupe } from "@/lib/notifications/dedupe";
import { sanitizeHref } from "@/lib/security/safeHref";

const STORAGE_KEY = "edge:notifications:v1";
const MAX_EVENTS = 100;

type LocalNotificationState = {
  version: 1;
  notifications: NotificationEvent[];
};

function readState(): LocalNotificationState {
  if (typeof window === "undefined") {
    return { version: 1, notifications: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, notifications: [] };
    const parsed = JSON.parse(raw) as LocalNotificationState;
    if (parsed.version !== 1 || !Array.isArray(parsed.notifications)) {
      return { version: 1, notifications: [] };
    }
    return parsed;
  } catch {
    return { version: 1, notifications: [] };
  }
}

function writeState(state: LocalNotificationState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function listLocalNotifications(includeDismissed = false): NotificationEvent[] {
  const state = readState();
  const notifications = includeDismissed
    ? state.notifications
    : state.notifications.filter((event) => !event.dismissedAt);
  return [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function countLocalUnreadNotifications(): number {
  return readState().notifications.filter((event) => !event.readAt && !event.dismissedAt).length;
}

export function addLocalNotification(input: {
  source: NotificationSource;
  title: string;
  body: string;
  href?: string | null;
  dedupeKey: string;
}): NotificationEvent {
  const state = readState();
  const existing = state.notifications.find((event) => event.dedupeKey === input.dedupeKey);
  if (existing && shouldSuppressNotificationDedupe(existing.createdAt)) {
    return existing;
  }

  const event: NotificationEvent = {
    id: crypto.randomUUID(),
    source: input.source,
    title: input.title.trim(),
    body: input.body.trim(),
    href: sanitizeHref(input.href),
    dedupeKey: input.dedupeKey,
    createdAt: new Date().toISOString(),
    readAt: null,
    dismissedAt: null,
  };

  state.notifications = [event, ...state.notifications].slice(0, MAX_EVENTS);
  writeState(state);
  return event;
}

export function markLocalNotificationRead(notificationId: string): NotificationEvent | null {
  const state = readState();
  const event = state.notifications.find((row) => row.id === notificationId);
  if (!event) return null;
  event.readAt = new Date().toISOString();
  writeState(state);
  return event;
}

export function dismissLocalNotification(notificationId: string): NotificationEvent | null {
  const state = readState();
  const event = state.notifications.find((row) => row.id === notificationId);
  if (!event) return null;
  const now = new Date().toISOString();
  event.dismissedAt = now;
  if (!event.readAt) event.readAt = now;
  writeState(state);
  return event;
}

export function markAllLocalNotificationsRead(): number {
  const state = readState();
  const now = new Date().toISOString();
  let count = 0;
  for (const event of state.notifications) {
    if (!event.readAt && !event.dismissedAt) {
      event.readAt = now;
      count += 1;
    }
  }
  if (count > 0) writeState(state);
  return count;
}

export function clearLocalNotificationsForTests(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
