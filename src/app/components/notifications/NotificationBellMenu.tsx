"use client";

import Link from "next/link";
import { useRef } from "react";

import {
  EdgeAnchoredPopover,
  EdgeEmptyState,
  EdgeIconButton,
} from "@/app/components/design-system";
import { annotationTextClass, bodyTextClass, metadataTextClass } from "@/app/components/design-system/styles";
import { useAppTheme } from "@/app/components/AppThemeProvider";
import { useNotifications } from "@/app/components/notifications/NotificationProvider";
import { WORKSPACE_SURFACE_LINKS } from "@/lib/appWorkspace/deepLinks";
import { sanitizeHref } from "@/lib/security/safeHref";

function BellIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.75a3.25 3.25 0 00-3.25 3.25v1.9c0 .55-.18 1.08-.52 1.52L3.2 9.95A1 1 0 004 11.5h8a1 1 0 00.8-1.55l-1.03-1.53a2.6 2.6 0 01-.52-1.52V5A3.25 3.25 0 008 1.75z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M6.5 11.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function NotificationBellMenu({ open, onOpenChange }: Props) {
  const { theme } = useAppTheme();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { notifications, unreadCount, loading, markRead, dismiss, markAllRead } = useNotifications();

  return (
    <>
      <EdgeIconButton
        ref={triggerRef}
        theme={theme}
        data-testid="app-header-notifications"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => onOpenChange(!open)}
      >
        <span className="relative inline-flex">
          <BellIcon size={16} />
          {unreadCount > 0 ? (
            <span
              data-testid="notification-unread-badge"
              className={`absolute -right-1.5 -top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--edge-accent-blue)] px-1 ${annotationTextClass()} text-[10px] font-semibold text-white`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </span>
      </EdgeIconButton>

      <EdgeAnchoredPopover
        open={open}
        anchorRef={triggerRef}
        onClose={() => onOpenChange(false)}
        align="end"
        minWidth={320}
        role="menu"
      >
        <div className="flex max-h-[min(24rem,70vh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden bg-[var(--edge-surface-popover)]">
          <div className="flex items-center justify-between border-b border-[var(--edge-border-subtle)] px-3 py-2">
            <h2 className={`${bodyTextClass()} font-semibold text-[var(--edge-text-primary)]`}>
              Notifications
            </h2>
            {unreadCount > 0 ? (
              <button
                type="button"
                className={`${metadataTextClass()} text-[var(--edge-accent-blue)] hover:underline`}
                onClick={() => {
                  void markAllRead();
                }}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-1" data-testid="notification-inbox-list">
            {loading ? (
              <p className={`px-2 py-3 ${metadataTextClass()} text-[var(--edge-text-secondary)]`}>
                Loading…
              </p>
            ) : notifications.length === 0 ? (
              <EdgeEmptyState title="No notifications" message="Alerts and updates will appear here." />
            ) : (
              notifications.map((event) => {
                const unread = !event.readAt && !event.dismissedAt;
                const safeHref = sanitizeHref(event.href);
                return (
                  <div
                    key={event.id}
                    data-testid={`notification-item-${event.id}`}
                    className={`flex items-start gap-2 rounded-[var(--edge-radius-sm)] px-2 py-2 ${
                      unread ? "bg-[var(--edge-surface-hover)]/40" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        if (unread) void markRead(event.id);
                      }}
                    >
                      <p className={`${bodyTextClass()} font-medium text-[var(--edge-text-primary)]`}>
                        {event.title}
                      </p>
                      <p className={`${metadataTextClass()} text-[var(--edge-text-secondary)]`}>
                        {event.source} · {new Date(event.createdAt).toLocaleString()}
                      </p>
                      {event.body ? (
                        <p className={`${metadataTextClass()} text-[var(--edge-text-muted)]`}>{event.body}</p>
                      ) : null}
                      {safeHref ? (
                        <Link
                          href={safeHref}
                          className={`${metadataTextClass()} mt-1 inline-block text-[var(--edge-accent-blue)] hover:underline`}
                          onClick={() => onOpenChange(false)}
                        >
                          View
                        </Link>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      aria-label="Dismiss notification"
                      className={`${metadataTextClass()} shrink-0 px-1 text-[var(--edge-text-secondary)] hover:text-[var(--edge-text-primary)]`}
                      onClick={() => {
                        void dismiss(event.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-[var(--edge-border-subtle)] px-3 py-2">
            <Link
              href={WORKSPACE_SURFACE_LINKS.alerts}
              className={`${bodyTextClass()} block text-center text-[var(--edge-accent-blue)] hover:underline`}
              onClick={() => onOpenChange(false)}
            >
              Open Alerts
            </Link>
          </div>
        </div>
      </EdgeAnchoredPopover>
    </>
  );
}
