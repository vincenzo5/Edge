"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
  );
}

type FocusTrapOptions = {
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Prefer this element on activate (e.g. a search input) instead of the first focusable. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
};

/** Trap Tab focus inside a container while active; optionally restore focus on deactivate. */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  options?: FocusTrapOptions,
): void {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onEscapeRef = useRef(options?.onEscape);
  const returnFocusOptionRef = useRef(options?.returnFocusRef);
  const initialFocusOptionRef = useRef(options?.initialFocusRef);
  onEscapeRef.current = options?.onEscape;
  returnFocusOptionRef.current = options?.returnFocusRef;
  initialFocusOptionRef.current = options?.initialFocusRef;

  useEffect(() => {
    if (!active || !containerRef.current) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    const focusInitial = () => {
      const initial = initialFocusOptionRef.current?.current;
      if (initial && container.contains(initial)) {
        initial.focus();
        return;
      }
      getFocusableElements(container)[0]?.focus();
    };

    focusInitial();
    const focusTimer = window.setTimeout(focusInitial, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscapeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;

      const nodes = getFocusableElements(container);
      if (nodes.length === 0) return;

      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [active, containerRef]);

  useEffect(() => {
    if (active) return;
    const returnTarget =
      returnFocusOptionRef.current?.current ?? previouslyFocusedRef.current;
    returnTarget?.focus?.();
  }, [active]);
}
