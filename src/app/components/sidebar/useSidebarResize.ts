"use client";

import { useCallback, useEffect, useRef } from "react";
import { clampSidebarPanelWidth } from "@/lib/responsive/sidebarWidth";

const KEYBOARD_STEP = 16;

type Options = {
  width: number;
  onWidthPreview: (width: number) => void;
  onWidthCommit: (width: number) => void;
  enabled?: boolean;
};

export function useSidebarResize({
  width,
  onWidthPreview,
  onWidthCommit,
  enabled = true,
}: Options) {
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);
  const latestWidthRef = useRef(width);

  const computeWidth = useCallback((clientX: number) => {
    const delta = startXRef.current - clientX;
    return clampSidebarPanelWidth(startWidthRef.current + delta);
  }, []);

  const beginDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || event.button !== 0) return;
      event.preventDefault();
      draggingRef.current = true;
      pointerIdRef.current = event.pointerId;
      startXRef.current = event.clientX;
      startWidthRef.current = width;
      latestWidthRef.current = width;
      if (typeof event.currentTarget.setPointerCapture === "function") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [enabled, width],
  );

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    pointerIdRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    onWidthCommit(latestWidthRef.current);
  }, [onWidthCommit]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) {
        return;
      }
      const nextWidth = computeWidth(event.clientX);
      latestWidthRef.current = nextWidth;
      onWidthPreview(nextWidth);
    },
    [computeWidth, onWidthPreview],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) {
        return;
      }
      const nextWidth = computeWidth(event.clientX);
      latestWidthRef.current = nextWidth;
      onWidthPreview(nextWidth);
      if (
        typeof event.currentTarget.hasPointerCapture === "function" &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      endDrag();
    },
    [computeWidth, endDrag, onWidthPreview],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) {
        return;
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      endDrag();
    },
    [endDrag],
  );

  useEffect(() => {
    return () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const nextWidth = clampSidebarPanelWidth(width + KEYBOARD_STEP);
        onWidthPreview(nextWidth);
        onWidthCommit(nextWidth);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        const nextWidth = clampSidebarPanelWidth(width - KEYBOARD_STEP);
        onWidthPreview(nextWidth);
        onWidthCommit(nextWidth);
      }
    },
    [enabled, onWidthCommit, onWidthPreview, width],
  );

  return {
    handlePointerDown: beginDrag,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleKeyDown,
  };
}
