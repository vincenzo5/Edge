"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PRESENCE_EXIT_MS } from "@/app/components/design-system/usePresence";
import type { SplitDirection } from "@/lib/appWorkspace/types";
import { useSplitResize } from "./useSplitResize";

type Props = {
  splitId: string;
  direction: SplitDirection;
  sizes: [number, number];
  onResizeCommit: (splitId: string, sizes: [number, number]) => void;
  first: ReactNode;
  second: ReactNode;
};

export default function SplitPane({
  splitId,
  direction,
  sizes,
  onResizeCommit,
  first,
  second,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftSizes, setDraftSizes] = useState(sizes);
  const [isResizing, setIsResizing] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    setDraftSizes(sizes);
  }, [sizes[0], sizes[1], splitId]);

  const displaySizes = draftSizes;

  const onSizesCommit = useCallback(
    (next: [number, number]) => {
      setDraftSizes(next);
      onResizeCommit(splitId, next);
    },
    [onResizeCommit, splitId],
  );

  const { beginDrag, handlePointerMove, handlePointerUp, handlePointerCancel } = useSplitResize({
    direction,
    sizes: displaySizes,
    onSizesPreview: setDraftSizes,
    onSizesCommit,
  });

  const isRow = direction === "row";

  useEffect(() => {
    return () => {
      if (settleTimeoutRef.current != null) {
        clearTimeout(settleTimeoutRef.current);
      }
    };
  }, []);

  const triggerSettle = useCallback(() => {
    setIsSettling(true);
    if (settleTimeoutRef.current != null) {
      clearTimeout(settleTimeoutRef.current);
    }
    settleTimeoutRef.current = setTimeout(() => {
      setIsSettling(false);
      settleTimeoutRef.current = null;
    }, PRESENCE_EXIT_MS);
  }, []);

  const handleResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const size = rect ? (isRow ? rect.width : rect.height) : 1;
      if (event.button === 0) {
        isResizingRef.current = true;
        setIsResizing(true);
      }
      beginDrag(event, size);
    },
    [beginDrag, isRow],
  );

  const handleResizePointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const wasResizing = isResizingRef.current;
      handlePointerUp(event);
      isResizingRef.current = false;
      setIsResizing(false);
      if (wasResizing) {
        triggerSettle();
      }
    },
    [handlePointerUp, triggerSettle],
  );

  const handleResizePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const wasResizing = isResizingRef.current;
      handlePointerCancel(event);
      isResizingRef.current = false;
      setIsResizing(false);
      if (wasResizing) {
        triggerSettle();
      }
    },
    [handlePointerCancel, triggerSettle],
  );

  return (
    <div
      ref={containerRef}
      data-testid={`split-pane-${splitId}`}
      data-resizing={isResizing ? "true" : undefined}
      className={`flex h-full min-h-0 min-w-0 flex-1 ${isRow ? "flex-row" : "flex-col"}`}
    >
      <div
        className="h-full min-h-0 min-w-0 overflow-hidden"
        style={{ flex: `${displaySizes[0]} 1 0%` }}
      >
        {first}
      </div>
      <div
        className={`relative shrink-0 bg-[var(--edge-border-subtle)] ${
          isSettling ? "edge-split-settle" : ""
        } ${isRow ? "w-px" : "h-px"}`}
      >
        <div
          role="separator"
          aria-orientation={isRow ? "vertical" : "horizontal"}
          aria-label="Resize panels"
          data-testid={`split-handle-${splitId}`}
          data-split-handle=""
          className={`absolute z-20 touch-none hover:bg-[var(--edge-accent-blue)] focus-visible:bg-[var(--edge-accent-blue)] focus-visible:outline-none ${
            isSettling ? "edge-split-settle" : ""
          } ${
            isRow
              ? "inset-y-0 left-1/2 w-2 -translate-x-1/2 cursor-col-resize"
              : "inset-x-0 top-1/2 h-2 -translate-y-1/2 cursor-row-resize"
          }`}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handleResizePointerEnd}
          onPointerCancel={handleResizePointerCancel}
        />
      </div>
      <div
        className="h-full min-h-0 min-w-0 overflow-hidden"
        style={{ flex: `${displaySizes[1]} 1 0%` }}
      >
        {second}
      </div>
    </div>
  );
}
