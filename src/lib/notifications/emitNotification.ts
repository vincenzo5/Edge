import "server-only";

import { emitNotificationRecord } from "@/lib/persistence/repositories/notificationRepository";
import type { EmitNotificationInput, NotificationEvent } from "@/lib/notifications/types";

export async function emitNotification(input: EmitNotificationInput): Promise<NotificationEvent | null> {
  return emitNotificationRecord(input);
}
