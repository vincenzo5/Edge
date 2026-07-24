import { NextResponse } from "next/server";

import {
  markAllNotificationsRead,
} from "@/lib/persistence/repositories/notificationRepository";
import { withPersistenceAuth } from "@/lib/persistence/server/routeHelpers";

export const runtime = "nodejs";

export async function POST() {
  return withPersistenceAuth(async (userId) => {
    const updated = await markAllNotificationsRead(userId);
    return NextResponse.json({ updated });
  });
}
