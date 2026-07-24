"use client";

import { useEffect, type RefObject } from "react";

const MENU_ITEM_SELECTOR = '[role="menuitem"]:not([disabled])';

type MenuKeyboardNavOptions = {
  open: boolean;
  containerRef: RefObject<HTMLElement | null>;
  anchorRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
};

/** Arrow/Home/End navigation for simple menu popovers; returns focus to anchor on close. */
export function useMenuKeyboardNav({
  open,
  containerRef,
  anchorRef,
  onClose,
}: MenuKeyboardNavOptions): void {
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const container = containerRef.current;

    const getItems = (): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR));

    const focusItem = (index: number) => {
      const items = getItems();
      if (items.length === 0) return;
      const next = ((index % items.length) + items.length) % items.length;
      items[next]?.focus();
    };

    const firstItem = getItems()[0];
    firstItem?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      const items = getItems();
      if (items.length === 0) return;

      const currentIndex = items.findIndex((item) => item === document.activeElement);

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          focusItem(currentIndex < 0 ? 0 : currentIndex + 1);
          break;
        case "ArrowUp":
          event.preventDefault();
          focusItem(currentIndex < 0 ? items.length - 1 : currentIndex - 1);
          break;
        case "Home":
          event.preventDefault();
          items[0]?.focus();
          break;
        case "End":
          event.preventDefault();
          items[items.length - 1]?.focus();
          break;
        case "Escape":
          event.preventDefault();
          onClose();
          anchorRef?.current?.focus();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, containerRef, anchorRef, onClose]);
}
