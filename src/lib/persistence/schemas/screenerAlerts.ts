import { z } from "zod";

export const SCREENER_ALERT_INTERVALS = [15, 60] as const;
export const SCREENER_ALERT_NOTIFY_ON = ["added"] as const;
export const SCREENER_ALERT_STATUSES = ["active", "paused"] as const;

export type ScreenerAlertInterval = (typeof SCREENER_ALERT_INTERVALS)[number];
export type ScreenerAlertNotifyOn = (typeof SCREENER_ALERT_NOTIFY_ON)[number];
export type ScreenerAlertStatus = (typeof SCREENER_ALERT_STATUSES)[number];

export const screenerAlertDefinitionSchema = z.object({
  id: z.string().uuid(),
  screenId: z.string().trim().min(1).max(128),
  intervalMinutes: z.union([z.literal(15), z.literal(60)]),
  notifyOn: z.enum(SCREENER_ALERT_NOTIFY_ON),
  status: z.enum(SCREENER_ALERT_STATUSES),
  cooldownMs: z.number().int().positive(),
  lastSymbols: z.array(z.string()),
  lastRunAt: z.string().nullable().optional(),
  nextRunAt: z.string().nullable().optional(),
  lastFiredAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const screenerAlertListResponseSchema = z.object({
  screenerAlerts: z.array(screenerAlertDefinitionSchema),
});

export const createScreenerAlertSchema = z.object({
  screenId: z.string().trim().min(1).max(128),
  intervalMinutes: z.union([z.literal(15), z.literal(60)]).default(60),
});

export const patchScreenerAlertSchema = z
  .object({
    intervalMinutes: z.union([z.literal(15), z.literal(60)]).optional(),
    status: z.enum(SCREENER_ALERT_STATUSES).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export type ScreenerAlertDefinitionResponse = z.infer<typeof screenerAlertDefinitionSchema>;

export type ActiveScreenerAlertDefinition = ScreenerAlertDefinitionResponse & {
  userId: string;
};
