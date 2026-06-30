"use client";

import { useEffect, type ReactNode } from "react";
import { modalBackdropClass, modalShellClass } from "./styles";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  maxWidth?: "sm" | "md" | "lg" | "full";
  children: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  testId?: string;
  align?: "center" | "top";
};

const maxWidthClass = {
  sm: "max-w-[480px]",
  md: "max-w-[840px]",
  lg: "max-w-4xl",
  full: "max-w-[960px]",
} as const;

export default function EdgeModalShell({
  open,
  title,
  subtitle,
  onClose,
  maxWidth = "md",
  children,
  headerActions,
  footer,
  testId,
  align = "top",
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const alignClass =
    align === "center"
      ? "items-center justify-center"
      : "items-start justify-center pt-[9vh]";

  return (
    <div
      className={`${modalBackdropClass()} ${alignClass}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid={testId}
    >
      <div
        role="dialog"
        aria-label={title}
        className={`${modalShellClass()} w-full ${maxWidthClass[maxWidth]}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--edge-border)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-[-0.01em]">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-[var(--edge-text-secondary)]">{subtitle}</p>
            ) : null}
          </div>
          {headerActions ? (
            <div className="flex shrink-0 items-center gap-2" data-testid="edge-modal-header-actions">
              {headerActions}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="edge-icon-button edge-focus-ring shrink-0 rounded p-1 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--edge-border)] px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
