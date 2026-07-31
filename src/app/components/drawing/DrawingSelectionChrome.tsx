"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  DrawingMetadata,
  DrawingStyles,
  SerializedDrawing,
  Theme,
} from "@edge/chart-core/contracts";
import type { DrawingScreenBounds } from "../chart-cell/EdgeChart";
import type { PlaybookInstance } from "@/lib/trading/playbook/types";
import type { TradingEnvironment } from "@/lib/trading/types";
import {
  detachPlaybookInstance,
  pausePlaybookInstance,
} from "@/lib/trading/tradingClient";
import DrawingSelectionToolbar from "./DrawingSelectionToolbar";
import PositionPlanPanel from "./PositionPlanPanel";
import { usePositionPlanPolicy } from "./usePositionPlanPolicy";
import { isPositionDrawingName } from "@/lib/trading/positionTradeSetup";
import { resolveDrawingToolbarPosition } from "./drawingSelectionToolbarPosition";

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
  onGeometryChange: (levels: { entry: number; stop: number; target: number }) => void;
  symbol: string;
  accountId: string;
  environment: TradingEnvironment;
  dollarRisk: number | null;
  playbookInstances: PlaybookInstance[];
  onPlaybookInstancesChange?: () => void;
  onTradeSetup?: (seedQuantity?: number) => void;
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
  onGeometryChange,
  symbol,
  accountId,
  environment,
  dollarRisk,
  playbookInstances,
  onPlaybookInstancesChange,
  onTradeSetup,
}: Props) {
  const [toolbarSize, setToolbarSize] = useState({ width: 280, height: 36 });
  const [planPanelDragOffset, setPlanPanelDragOffset] = useState({ x: 0, y: 0 });
  const showPlanPanel = isPositionDrawingName(drawing.name);

  const policy = usePositionPlanPolicy({
    drawing,
    symbol,
    accountId,
    environment,
    dollarRisk,
    instances: playbookInstances,
    onInstancesChange: onPlaybookInstancesChange,
  });

  const plannedControlVisible = useMemo(() => {
    const instance = policy.plannedInstance;
    return instance != null && (instance.status === "planned" || instance.status === "armed" || instance.status === "paused");
  }, [policy.plannedInstance]);

  useEffect(() => {
    setPlanPanelDragOffset({ x: 0, y: 0 });
  }, [drawing.id]);

  const toolbarAnchor = useMemo(() => {
    const toolbarPos = resolveDrawingToolbarPosition({
      bounds,
      toolbar: toolbarSize,
      container: { width: containerWidth, height: containerHeight },
      dragOffset,
    });
    return {
      left: toolbarPos.left,
      top: toolbarPos.top,
      width: toolbarSize.width,
      height: toolbarSize.height,
    };
  }, [bounds, toolbarSize, containerWidth, containerHeight, dragOffset]);

  return (
    <>
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
        onToolbarSizeChange={setToolbarSize}
      />
      {showPlanPanel ? (
        <PositionPlanPanel
          drawing={drawing}
          toolbarAnchor={toolbarAnchor}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          dragOffset={planPanelDragOffset}
          onDragOffsetChange={setPlanPanelDragOffset}
          onGeometryChange={onGeometryChange}
          policyTemplates={policy.templates}
          selectedPolicyId={policy.selectedTemplateId}
          policyChips={policy.integrityChips}
          policyLoading={policy.loading}
          policyError={policy.error}
          onPolicyChange={(templateId) => void policy.applyPolicy(templateId)}
          onTradeSetup={() => {
            const previewQty = policy.plannedInstance?.positionPlan.qty;
            onTradeSetup?.(previewQty);
          }}
          policyControlVisible={plannedControlVisible}
          onPausePolicy={
            policy.plannedInstance &&
            (policy.plannedInstance.status === "armed" ||
              policy.plannedInstance.status === "paused")
              ? () =>
                  void pausePlaybookInstance(policy.plannedInstance!.id).then(() =>
                    onPlaybookInstancesChange?.(),
                  )
              : undefined
          }
          onDetachPolicy={
            policy.plannedInstance
              ? () =>
                  void detachPlaybookInstance(policy.plannedInstance!.id).then(() =>
                    onPlaybookInstancesChange?.(),
                  )
              : undefined
          }
        />
      ) : null}
    </>
  );
}
