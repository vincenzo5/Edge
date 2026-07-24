"use client";

import { useEffect, useState } from "react";

import { bodyTextClass, metadataTextClass } from "./styles";
import { sanitizeHref } from "@/lib/security/safeHref";

export type EdgeToastItem = {
  id: string;
  title: string;
  body?: string;
  href?: string | null;
  onDismiss?: () => void;
};

type Props = {
  toasts: EdgeToastItem[];
  onDismiss: (id: string) => void;
};

const AUTO_DISMISS_MS = 5000;

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: EdgeToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.id]);

  const safeHref = sanitizeHref(toast.href);

  return (
    <div
      role="status"
      data-testid={`edge-toast-${toast.id}`}
      className="edge-popover-enter pointer-events-auto flex w-[min(20rem,calc(100vw-2rem))] items-start gap-2 rounded-[var(--edge-radius-lg)] border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-popover)] px-3 py-2 shadow-[var(--edge-shadow-popover)]"
    >
      <div className="min-w-0 flex-1">
        <p className={`${bodyTextClass()} font-medium text-[var(--edge-text-primary)]`}>
          {toast.title}
        </p>
        {toast.body ? (
          <p className={`${metadataTextClass()} mt-0.5 text-[var(--edge-text-secondary)]`}>
            {toast.body}
          </p>
        ) : null}
        {safeHref ? (
          <a
            href={safeHref}
            className={`${metadataTextClass()} mt-1 inline-block text-[var(--edge-accent-blue)] hover:underline`}
          >
            View
          </a>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        className="edge-focus-ring shrink-0 rounded p-1 text-[var(--edge-text-secondary)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)]"
        onClick={() => {
          toast.onDismiss?.();
          onDismiss(toast.id);
        }}
      >
        ×
      </button>
    </div>
  );
}

export default function EdgeToastViewport({ toasts, onDismiss }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col gap-2"
      data-testid="edge-toast-viewport"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
