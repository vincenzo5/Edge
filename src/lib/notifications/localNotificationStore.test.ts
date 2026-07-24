import { describe, expect, it, beforeEach } from "vitest";

import {
  addLocalNotification,
  clearLocalNotificationsForTests,
  countLocalUnreadNotifications,
  listLocalNotifications,
  markLocalNotificationRead,
} from "./localNotificationStore";

describe("localNotificationStore", () => {
  beforeEach(() => {
    clearLocalNotificationsForTests();
  });

  it("stores and lists notifications", () => {
    addLocalNotification({
      source: "system",
      title: "Test",
      body: "Hello",
      dedupeKey: "system:test",
    });
    expect(listLocalNotifications()).toHaveLength(1);
    expect(countLocalUnreadNotifications()).toBe(1);
  });

  it("dedupes notifications with the same key inside the window", () => {
    const first = addLocalNotification({
      source: "system",
      title: "Test",
      body: "Hello",
      dedupeKey: "system:test",
    });
    const second = addLocalNotification({
      source: "system",
      title: "Test",
      body: "Hello again",
      dedupeKey: "system:test",
    });
    expect(second.id).toBe(first.id);
    expect(listLocalNotifications()).toHaveLength(1);
  });

  it("marks notifications read", () => {
    const event = addLocalNotification({
      source: "alert",
      title: "AAPL crossed 200",
      body: "Triggered",
      dedupeKey: "alert:1",
    });
    markLocalNotificationRead(event.id);
    expect(countLocalUnreadNotifications()).toBe(0);
  });

  it("drops unsafe href values on store", () => {
    const event = addLocalNotification({
      source: "system",
      title: "Unsafe",
      body: "Link",
      href: "javascript:alert(1)",
      dedupeKey: "system:unsafe",
    });
    expect(event.href).toBeNull();
  });
});
