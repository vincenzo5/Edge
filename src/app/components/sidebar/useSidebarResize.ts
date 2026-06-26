"use client";

import { useCallback, useEffect, useRef } from "react";
import { clampSidebarPanelWidth } from "@/lib/responsive/sidebarWidth";

const KEYBOARD_STEP = 16;

type Options = {
  width: number;
  onWidthChange: (width: number) => void;
  enabled?: boolean;
};

export function useSidebarResize({ width, onWidthChange, enabled = true }: Options) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

  const beginDrag = useCallback(
    (clientX: number) => {
      if (!enabled) return;
      draggingRef.current = true;
      startXRef.current = clientX;
      startWidthRef.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [enabled, width],
  );

  const applyDelta = useCallback(
    (clientX: number) => {
      const delta = startXRef.current - clientX;
      onWidthChange(clampSidebarPanelWidth(startWidthRef.current + delta));
    },
    [onWidthChange],
  );

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onMouseMove = (event: MouseEvent) => {
      if (!draggingRef.current) return;
      applyDelta(event.clientX);
    };

    const onMouseUp = () => endDrag();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      endDrag();
    };
  }, [applyDelta, enabled, endDrag]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || event.button !== 0) return;
      event.preventDefault();
      beginDrag(event.clientX);
    },
    [beginDrag, enabled],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onWidthChange(clampSidebarPanelWidth(width + KEYBOARD_STEP));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onWidthChange(clampSidebarPanelWidth(width - KEYBOARD_STEP));
      }
    },
    [enabled, onWidthChange, width],
  );

  return {
    handlePointerDown,
    handleKeyDown,
  };
}
