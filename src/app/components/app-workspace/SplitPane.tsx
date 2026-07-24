"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const [draftSizes, setDraftSizes] = useState(sizes);

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

  return (
    <div
      ref={containerRef}
      data-testid={`split-pane-${splitId}`}
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
          isRow ? "w-px" : "h-px"
        }`}
      >
        <div
          role="separator"
          aria-orientation={isRow ? "vertical" : "horizontal"}
          aria-label="Resize panels"
          data-testid={`split-handle-${splitId}`}
          className={`absolute z-20 touch-none hover:bg-[var(--edge-accent-blue)] focus-visible:bg-[var(--edge-accent-blue)] focus-visible:outline-none ${
            isRow
              ? "inset-y-0 left-1/2 w-2 -translate-x-1/2 cursor-col-resize"
              : "inset-x-0 top-1/2 h-2 -translate-y-1/2 cursor-row-resize"
          }`}
          onPointerDown={(event) => {
            const rect = containerRef.current?.getBoundingClientRect();
            const size = rect ? (isRow ? rect.width : rect.height) : 1;
            beginDrag(event, size);
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
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
