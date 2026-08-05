"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { slideOverBackdropClass, slideOverPanelClass } from "./styles";
import { useFocusTrap } from "./useFocusTrap";
import { usePresence } from "./usePresence";

type Props = {
  open: boolean;
  title: ReactNode;
  ariaLabel?: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  headerActions?: ReactNode;
  testId?: string;
  width?: "third" | "half";
  returnFocusRef?: React.RefObject<HTMLElement | null>;
};

function resolveAriaLabel(title: ReactNode, ariaLabel?: string): string {
  if (ariaLabel?.trim()) return ariaLabel.trim();
  if (typeof title === "string") return title;
  return "Panel";
}

export default function EdgeSlideOver({
  open,
  title,
  ariaLabel,
  subtitle,
  onClose,
  children,
  headerActions,
  testId = "edge-slide-over",
  width = "third",
  returnFocusRef,
}: Props) {
  const [clientMounted, setClientMounted] = useState(false);
  const { mounted: presenceMounted, visible } = usePresence(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const dialogLabel = resolveAriaLabel(title, ariaLabel);

  useFocusTrap(presenceMounted, panelRef, { onEscape: onClose, returnFocusRef });

  useEffect(() => {
    setClientMounted(true);
  }, []);

  useEffect(() => {
    if (!presenceMounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [presenceMounted]);

  useEffect(() => {
    if (!presenceMounted) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenceMounted, onClose]);

  if (!clientMounted || !presenceMounted) return null;

  return createPortal(
    <div data-testid={testId}>
      <button
        type="button"
        aria-label="Close panel"
        data-testid={`${testId}-backdrop`}
        className={slideOverBackdropClass()}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={dialogLabel}
        data-testid={`${testId}-panel`}
        className={`${slideOverPanelClass(width)} ${visible ? "translate-x-0" : "translate-x-full"}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--edge-border)] bg-[var(--edge-surface-toolbar)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-[var(--edge-text-strong)]">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-[var(--edge-text-secondary)]">{subtitle}</p>
            ) : null}
          </div>
          {headerActions ? (
            <div className="flex shrink-0 items-center gap-2" data-testid={`${testId}-header-actions`}>
              {headerActions}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            data-testid={`${testId}-close`}
            className="edge-icon-button edge-focus-ring shrink-0 rounded p-1 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
