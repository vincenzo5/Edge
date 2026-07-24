import { z } from "zod";

import { NOTIFICATION_SOURCES } from "@/lib/notifications/types";
import { isAllowedHref } from "@/lib/security/safeHref";

export const safeHrefSchema = z
  .string()
  .max(500)
  .nullable()
  .optional()
  .refine((value) => value == null || value === "" || isAllowedHref(value), {
    message: "href must use http, https, or an app-relative path starting with /",
  });

export const notificationEventSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(NOTIFICATION_SOURCES),
  title: z.string().min(1),
  body: z.string(),
  href: z.string().nullable().optional(),
  dedupeKey: z.string().min(1),
  createdAt: z.string(),
  readAt: z.string().nullable().optional(),
  dismissedAt: z.string().nullable().optional(),
});

export const notificationListResponseSchema = z.object({
  notifications: z.array(notificationEventSchema),
  unreadCount: z.number().int().nonnegative(),
});

export const createNotificationSchema = z.object({
  source: z.enum(NOTIFICATION_SOURCES).default("system"),
  title: z.string().min(1).max(200),
  body: z.string().max(2000),
  href: safeHrefSchema,
  dedupeKey: z.string().min(1).max(200).optional(),
});

export const patchNotificationSchema = z
  .object({
    read: z.boolean().optional(),
    dismiss: z.boolean().optional(),
  })
  .refine((value) => value.read === true || value.dismiss === true, {
    message: "At least one of read or dismiss must be true.",
  });

export type NotificationEventResponse = z.infer<typeof notificationEventSchema>;
