export const NOTIFICATION_SOURCES = ["system", "alert", "screener", "journal"] as const;
export type NotificationSource = (typeof NOTIFICATION_SOURCES)[number];

export type NotificationEvent = {
  id: string;
  source: NotificationSource;
  title: string;
  body: string;
  href?: string | null;
  dedupeKey: string;
  createdAt: string;
  readAt?: string | null;
  dismissedAt?: string | null;
};

export type EmitNotificationInput = {
  userId: string;
  source: NotificationSource;
  title: string;
  body: string;
  href?: string | null;
  dedupeKey: string;
};

export const NOTIFICATION_DEDUPE_WINDOW_MS = 30_000;
