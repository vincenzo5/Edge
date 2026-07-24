import { describe, expect, it } from "vitest";

import {
  capNotificationToasts,
  MAX_NOTIFICATION_SEEN_IDS,
  MAX_NOTIFICATION_TOASTS,
  trackSeenNotificationId,
} from "./notificationCaps";

describe("notificationCaps", () => {
  it("caps concurrent toasts to the newest five", () => {
    let toasts: Array<{ id: string }> = [];
    for (let i = 1; i <= 8; i += 1) {
      toasts = capNotificationToasts(toasts, { id: `toast-${i}` });
    }
    expect(toasts).toHaveLength(MAX_NOTIFICATION_TOASTS);
    expect(toasts.map((toast) => toast.id)).toEqual([
      "toast-4",
      "toast-5",
      "toast-6",
      "toast-7",
      "toast-8",
    ]);
  });

  it("dedupes toast ids", () => {
    const first = capNotificationToasts([], { id: "a" });
    const second = capNotificationToasts(first, { id: "a" });
    expect(second).toEqual([{ id: "a" }]);
  });

  it("prunes seen notification ids to the newest window", () => {
    const seenIds = new Set<string>();
    for (let i = 0; i < MAX_NOTIFICATION_SEEN_IDS + 25; i += 1) {
      trackSeenNotificationId(seenIds, `id-${i}`);
    }
    expect(seenIds.size).toBe(MAX_NOTIFICATION_SEEN_IDS);
    expect(seenIds.has("id-0")).toBe(false);
    expect(seenIds.has(`id-${MAX_NOTIFICATION_SEEN_IDS + 24}`)).toBe(true);
  });
});
