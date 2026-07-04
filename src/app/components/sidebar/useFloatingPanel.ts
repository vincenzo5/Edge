"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FloatingPanelGeometry } from "@/lib/chartConfig";
import {
  clampFloatingGeometry,
  FLOATING_PANEL_MIN_HEIGHT,
  FLOATING_PANEL_MIN_WIDTH,
} from "@/lib/sidebar/floatingPanelGeometry";

type Options = {
  geometry: FloatingPanelGeometry;
  onGeometryChange: (geometry: FloatingPanelGeometry) => void;
};

export function useFloatingPanel({ geometry, onGeometryChange }: Options) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [draftGeometry, setDraftGeometry] = useState<FloatingPanelGeometry | null>(null);
  const displayGeometry = draftGeometry ?? geometry;

  useEffect(() => {
    setDraftGeometry(null);
  }, [geometry]);

  const getContainerSize = useCallback(() => {
    const container = panelRef.current?.offsetParent as HTMLElement | null;
    return {
      width: container?.clientWidth ?? window.innerWidth,
      height: container?.clientHeight ?? window.innerHeight,
    };
  }, []);

  const clampPosition = useCallback(
    (next: { x: number; y: number }, size = displayGeometry) => {
      const { width: containerWidth, height: containerHeight } = getContainerSize();
      return clampFloatingGeometry(
        { ...size, x: next.x, y: next.y },
        containerWidth,
        containerHeight,
      );
    },
    [displayGeometry, getContainerSize],
  );

  const commitGeometry = useCallback(
    (next: FloatingPanelGeometry) => {
      const { width: containerWidth, height: containerHeight } = getContainerSize();
      const clamped = clampFloatingGeometry(next, containerWidth, containerHeight);
      setDraftGeometry(null);
      onGeometryChange(clamped);
    },
    [getContainerSize, onGeometryChange],
  );

  const handleHeaderPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      e.preventDefault();
      e.stopPropagation();
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        ox: displayGeometry.x,
        oy: displayGeometry.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [displayGeometry.x, displayGeometry.y],
  );

  const handleHeaderPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const next = clampPosition({
        x: dragStartRef.current.ox + dx,
        y: dragStartRef.current.oy + dy,
      });
      setDraftGeometry(next);
    },
    [clampPosition],
  );

  const handleHeaderPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const next = clampPosition({
        x: dragStartRef.current.ox + dx,
        y: dragStartRef.current.oy + dy,
      });
      dragStartRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
      setDraftGeometry(null);
      commitGeometry(next);
    },
    [clampPosition, commitGeometry],
  );

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = displayGeometry.width;
      const startH = displayGeometry.height;

      const onMove = (moveEvent: PointerEvent) => {
        const next = clampFloatingGeometry({
          ...displayGeometry,
          width: Math.max(FLOATING_PANEL_MIN_WIDTH, startW + (moveEvent.clientX - startX)),
          height: Math.max(FLOATING_PANEL_MIN_HEIGHT, startH + (moveEvent.clientY - startY)),
        });
        setDraftGeometry(next);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setDraftGeometry((current) => {
          if (current) commitGeometry(current);
          return null;
        });
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [commitGeometry, displayGeometry],
  );

  return {
    panelRef,
    displayGeometry,
    handleHeaderPointerDown,
    handleHeaderPointerMove,
    handleHeaderPointerUp,
    handleHeaderPointerCancel: handleHeaderPointerUp,
    handleResizePointerDown,
  };
}
