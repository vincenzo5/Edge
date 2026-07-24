"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import EdgeToastViewport, { type EdgeToastItem } from "@/app/components/design-system/EdgeToastViewport";
import {
  capNotificationToasts,
  trackSeenNotificationId,
} from "@/lib/notifications/notificationCaps";
import type { NotificationEvent } from "@/lib/notifications/types";
import {
  fetchNotifications,
  markAllNotificationsRead,
  patchNotification,
} from "@/lib/notifications/notificationClient";

type NotificationContextValue = {
  notifications: NotificationEvent[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  dismiss: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const POLL_MS = 30_000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<EdgeToastItem[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const pushToast = useCallback((event: NotificationEvent) => {
    setToasts((current) =>
      capNotificationToasts(current, {
        id: event.id,
        title: event.title,
        body: event.body,
        href: event.href,
      }),
    );
  }, []);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchNotifications();
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);

      if (!initializedRef.current) {
        for (const event of result.notifications) {
          trackSeenNotificationId(seenIdsRef.current, event.id);
        }
        initializedRef.current = true;
        return;
      }

      for (const event of result.notifications) {
        if (!seenIdsRef.current.has(event.id) && !event.readAt && !event.dismissedAt) {
          trackSeenNotificationId(seenIdsRef.current, event.id);
          pushToast(event);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const markRead = useCallback(
    async (notificationId: string) => {
      await patchNotification(notificationId, { read: true });
      await refresh();
    },
    [refresh],
  );

  const dismiss = useCallback(
    async (notificationId: string) => {
      await patchNotification(notificationId, { dismiss: true });
      setToasts((current) => current.filter((toast) => toast.id !== notificationId));
      await refresh();
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    await refresh();
  }, [refresh]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(
    (): NotificationContextValue => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markRead,
      dismiss,
      markAllRead,
    }),
    [notifications, unreadCount, loading, refresh, markRead, dismiss, markAllRead],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <EdgeToastViewport toasts={toasts} onDismiss={dismissToast} />
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}

export function useNotificationsOptional(): NotificationContextValue | null {
  return useContext(NotificationContext);
}
