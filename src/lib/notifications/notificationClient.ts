import type { NotificationEvent } from "@/lib/notifications/types";
import {
  addLocalNotification,
  dismissLocalNotification,
  listLocalNotifications,
  markAllLocalNotificationsRead,
  markLocalNotificationRead,
} from "@/lib/notifications/localNotificationStore";
import type {
  CreateNotificationInput,
  NotificationListResult,
} from "@/lib/notifications/notificationClientTypes";

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchNotifications(): Promise<NotificationListResult> {
  const response = await fetch("/api/me/notifications", { cache: "no-store" });
  if (response.status === 503) {
    const notifications = listLocalNotifications();
    return {
      notifications,
      unreadCount: notifications.filter((event) => !event.readAt && !event.dismissedAt).length,
      source: "local",
    };
  }
  if (!response.ok) {
    throw new Error("Could not load notifications.");
  }
  const payload = await parseJson<NotificationListResult>(response);
  if (!payload) throw new Error("Invalid notifications response.");
  return { ...payload, source: "remote" };
}

export async function createNotification(input: CreateNotificationInput): Promise<NotificationEvent> {
  const response = await fetch("/api/me/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.status === 503) {
    return addLocalNotification({
      source: input.source ?? "system",
      title: input.title,
      body: input.body,
      href: input.href,
      dedupeKey: input.dedupeKey ?? `${input.source ?? "system"}:${input.title}:${Date.now()}`,
    });
  }
  if (!response.ok) {
    throw new Error("Could not create notification.");
  }
  const payload = await parseJson<NotificationEvent>(response);
  if (!payload) throw new Error("Invalid notification create response.");
  return payload;
}

export async function patchNotification(
  notificationId: string,
  patch: { read?: boolean; dismiss?: boolean },
): Promise<NotificationEvent | null> {
  const response = await fetch(`/api/me/notifications/${notificationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (response.status === 503) {
    if (patch.dismiss) return dismissLocalNotification(notificationId);
    if (patch.read) return markLocalNotificationRead(notificationId);
    return null;
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not update notification.");
  return parseJson<NotificationEvent>(response);
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await fetch("/api/me/notifications/mark-all-read", {
    method: "POST",
  });
  if (response.status === 503) {
    return markAllLocalNotificationsRead();
  }
  if (!response.ok) throw new Error("Could not mark notifications read.");
  const payload = await parseJson<{ updated: number }>(response);
  return payload?.updated ?? 0;
}
