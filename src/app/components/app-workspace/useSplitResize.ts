"use client";

import { useCallback, useRef } from "react";

const MIN_FRACTION = 0.08;

function clampFraction(value: number): number {
  return Math.min(1 - MIN_FRACTION, Math.max(MIN_FRACTION, value));
}

type Options = {
  direction: "row" | "column";
  sizes: [number, number];
  onSizesPreview: (sizes: [number, number]) => void;
  onSizesCommit: (sizes: [number, number]) => void;
};

export function useSplitResize({
  direction,
  sizes,
  onSizesPreview,
  onSizesCommit,
}: Options) {
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const startCoordRef = useRef(0);
  const startSizesRef = useRef(sizes);
  const containerSizeRef = useRef(1);
  const latestSizesRef = useRef(sizes);

  const beginDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, containerSize: number) => {
      if (event.button !== 0) return;
      event.preventDefault();
      draggingRef.current = true;
      pointerIdRef.current = event.pointerId;
      containerSizeRef.current = Math.max(containerSize, 1);
      startCoordRef.current = direction === "row" ? event.clientX : event.clientY;
      startSizesRef.current = sizes;
      latestSizesRef.current = sizes;
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.style.cursor = direction === "row" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [direction, sizes],
  );

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    pointerIdRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    onSizesCommit(latestSizesRef.current);
  }, [onSizesCommit]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) return;

      const current = direction === "row" ? event.clientX : event.clientY;
      const delta = (current - startCoordRef.current) / containerSizeRef.current;
      const first = clampFraction(startSizesRef.current[0] + delta);
      const second = 1 - first;
      latestSizesRef.current = [first, second];
      onSizesPreview(latestSizesRef.current);
    },
    [direction, onSizesPreview],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      endDrag();
    },
    [endDrag],
  );

  return {
    beginDrag,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel: handlePointerUp,
  };
}
