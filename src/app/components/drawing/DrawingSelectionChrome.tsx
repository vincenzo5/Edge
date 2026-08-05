"use client";

import type {
  DrawingMetadata,
  DrawingStyles,
  SerializedDrawing,
  Theme,
} from "@edge/chart-core/contracts";
import type { DrawingScreenBounds } from "../chart-cell/EdgeChart";
import DrawingSelectionToolbar from "./DrawingSelectionToolbar";

type Props = {
  theme: Theme;
  drawing: SerializedDrawing;
  bounds: DrawingScreenBounds | null;
  containerWidth: number;
  containerHeight: number;
  dragOffset: { x: number; y: number };
  onDragOffsetChange: (offset: { x: number; y: number }) => void;
  onStyleChange: (patch: Partial<DrawingStyles>) => void;
  onMetadataChange: (patch: DrawingMetadata) => void;
  onAcceptProposal: () => void;
  onDismissProposal: () => void;
  onOpenInChat?: () => void;
  onOpenSettings: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onMore: (clientX: number, clientY: number) => void;
};

export default function DrawingSelectionChrome({
  theme,
  drawing,
  bounds,
  containerWidth,
  containerHeight,
  dragOffset,
  onDragOffsetChange,
  onStyleChange,
  onMetadataChange,
  onAcceptProposal,
  onDismissProposal,
  onOpenInChat,
  onOpenSettings,
  onToggleLock,
  onDelete,
  onMore,
}: Props) {
  return (
    <DrawingSelectionToolbar
      theme={theme}
      drawing={drawing}
      bounds={bounds}
      containerWidth={containerWidth}
      containerHeight={containerHeight}
      dragOffset={dragOffset}
      onDragOffsetChange={onDragOffsetChange}
      onStyleChange={onStyleChange}
      onMetadataChange={onMetadataChange}
      onAcceptProposal={onAcceptProposal}
      onDismissProposal={onDismissProposal}
      onOpenInChat={onOpenInChat}
      onOpenSettings={onOpenSettings}
      onToggleLock={onToggleLock}
      onDelete={onDelete}
      onMore={onMore}
    />
  );
}
