import type { NotificationSource } from "@/lib/notifications/types";

export type CreateNotificationInput = {
  source?: NotificationSource;
  title: string;
  body: string;
  href?: string | null;
  dedupeKey?: string;
};

export type NotificationListResult = {
  notifications: import("@/lib/notifications/types").NotificationEvent[];
  unreadCount: number;
  source?: "remote" | "local";
};
