import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createNotification,
  fetchNotifications,
  markAllNotificationsRead,
  patchNotification,
} from "@/lib/notifications/notificationClient";

describe("notificationClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("uses the local notification store when the remote session is unauthorized", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    const created = await createNotification({
      source: "system",
      title: "Local notification",
      body: "Available without a persistence session.",
      dedupeKey: "local-notification",
    });

    const initial = await fetchNotifications();
    expect(initial).toMatchObject({
      source: "local",
      unreadCount: 1,
    });
    expect(initial.notifications).toHaveLength(1);

    await patchNotification(created.id, { read: true });
    const afterRead = await fetchNotifications();
    expect(afterRead.unreadCount).toBe(0);

    expect(await markAllNotificationsRead()).toBe(0);
  });
});
