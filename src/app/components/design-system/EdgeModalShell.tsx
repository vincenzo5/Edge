"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { modalBackdropClass, modalShellClass, popoverEnterClass } from "./styles";
import { useFocusTrap } from "./useFocusTrap";
import {
  useModalContainment,
  type ModalContainmentMode,
} from "./ModalContainmentContext";

type Props = {
  open: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  ariaLabel?: string;
  onClose: () => void;
  maxWidth?: "sm" | "md" | "lg" | "full";
  children: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  testId?: string;
  align?: "center" | "top";
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Focus this element when the dialog opens (defaults to first focusable). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Override containment from `ModalContainmentProvider`.
   * `"parent"` centers within a chart/tile overlay host; `"viewport"` uses the full window.
   */
  containment?: ModalContainmentMode;
};

const maxWidthClass = {
  sm: "max-w-[480px]",
  md: "max-w-[840px]",
  lg: "max-w-4xl",
  full: "max-w-[min(96vw,1400px)]",
} as const;

export default function EdgeModalShell({
  open,
  title,
  subtitle,
  ariaLabel,
  onClose,
  maxWidth = "md",
  children,
  headerActions,
  footer,
  testId,
  align = "top",
  returnFocusRef,
  initialFocusRef,
  containment: containmentProp,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(() => typeof document !== "undefined");
  const context = useModalContainment();
  const mode = containmentProp ?? context.mode;
  const contained = mode === "parent" && context.root != null;
  const portalRoot = contained ? context.root : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useFocusTrap(open, dialogRef, { onEscape: onClose, returnFocusRef, initialFocusRef });

  useEffect(() => {
    if (!open || contained) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, contained]);

  if (!open || !mounted) return null;

  const dialogLabel = ariaLabel ?? (typeof title === "string" ? title : "Dialog");

  const alignClass =
    align === "center"
      ? "items-center justify-center"
      : "items-start justify-center pt-[9vh]";

  const node = (
    <div
      className={`${modalBackdropClass({ contained })} ${alignClass}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid={testId}
      data-modal-containment={contained ? "parent" : "viewport"}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? undefined : dialogLabel}
        aria-labelledby={typeof title === "string" ? titleId : undefined}
        className={`${modalShellClass()} ${popoverEnterClass()} w-full ${maxWidthClass[maxWidth]}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--edge-border)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-semibold tracking-[-0.01em]">
              {title}
            </h2>
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

  if (portalRoot) {
    return createPortal(node, portalRoot);
  }

  return createPortal(node, document.body);
}
