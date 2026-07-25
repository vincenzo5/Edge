"use client";

import { useVirtualizer, observeElementOffset, type Virtualizer } from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { ResearchArtifactHint } from "@/lib/research/artifactHint";
import { EdgeEmptyState } from "../design-system";
import CopilotMessageBubble from "./CopilotMessageBubble";
import { splitCopilotMessages } from "./copilotMessageSplit";
import type { CopilotMessage } from "./useCopilotThread";

const ESTIMATED_MESSAGE_HEIGHT = 96;
const MESSAGE_GAP_PX = 20;
const VIRTUAL_OVERSCAN = 4;

function observeCopilotScrollRect<T extends Element>(
  instance: Virtualizer<T, Element>,
  cb: (rect: { width: number; height: number }) => void,
) {
  const element = instance.scrollElement;
  if (!element) {
    return () => {};
  }

  const notify = () => {
    const rect = element.getBoundingClientRect();
    cb({
      width: rect.width,
      height: rect.height,
    });
  };

  notify();
  const observer = new ResizeObserver(notify);
  observer.observe(element);
  return () => observer.disconnect();
}

type Props = {
  messages: CopilotMessage[];
  configError: string | null;
  onResolveConfirm: (messageId: string, callId: string, accepted: boolean) => void;
  confirmDisabled?: boolean;
  focusMessageId?: string | null;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onPinArtifact?: (
    hint: ResearchArtifactHint,
    provenance: { messageId: string; toolCallId: string },
  ) => void;
  isArtifactPinned?: (toolCallId: string) => boolean;
};

export function CopilotMessageList({
  messages,
  configError,
  onResolveConfirm,
  confirmDisabled,
  focusMessageId,
  isStreaming = false,
  onRegenerate,
  onPinArtifact,
  isArtifactPinned,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement | null>(null);

  const { historyMessages, streamingMessage } = useMemo(
    () => splitCopilotMessages(messages),
    [messages],
  );

  const rowVirtualizer = useVirtualizer({
    count: historyMessages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_MESSAGE_HEIGHT + MESSAGE_GAP_PX,
    overscan: VIRTUAL_OVERSCAN,
    getItemKey: (index) => historyMessages[index]?.id ?? index,
    observeElementRect: observeCopilotScrollRect,
    observeElementOffset,
  });

  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, historyMessages.length]);

  const hasPendingConfirm = messages.some((message) =>
    message.toolSteps.some((step) => step.status === "pending-confirm"),
  );

  const lastAssistantMessageId = (() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role === "assistant" && message.status !== "streaming") {
        return message.id;
      }
    }
    return null;
  })();

  const actionsDisabled = isStreaming || hasPendingConfirm;
  const virtualRows = rowVirtualizer.getVirtualItems();
  const isVirtualized = virtualRows.length > 0;
  const paddingTop = isVirtualized && virtualRows.length > 0 ? virtualRows[0]!.start : 0;
  const paddingBottom =
    isVirtualized && virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1]!.end
      : 0;

  useEffect(() => {
    if (!focusMessageId) return;
    const node = focusRef.current;
    if (!node) return;
    node.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusMessageId, messages]);

  if (configError && messages.length === 0) {
    return (
      <EdgeEmptyState
        data-testid="copilot-config-error"
        tone="warning"
        title="Copilot unavailable"
        message={configError}
      />
    );
  }

  if (messages.length === 0) {
    return null;
  }

  const renderBubble = (
    message: CopilotMessage,
    options?: {
      measureRef?: (node: Element | null) => void;
      virtualIndex?: number;
      forceShowActions?: boolean;
    },
  ) => (
    <div key={message.id} className="pb-5">
      <CopilotMessageBubble
      message={message}
      onResolveConfirm={onResolveConfirm}
      confirmDisabled={confirmDisabled}
      isFocused={focusMessageId === message.id}
      messageRef={focusMessageId === message.id ? focusRef : undefined}
      showActions={
        options?.forceShowActions ?? message.id === lastAssistantMessageId
      }
      actionsDisabled={actionsDisabled}
      onCopy={() => {
        if (!message.content || typeof navigator === "undefined") return;
        void navigator.clipboard.writeText(message.content);
      }}
      onRegenerate={onRegenerate}
      onPinArtifact={onPinArtifact}
      isArtifactPinned={isArtifactPinned}
      measureRef={options?.measureRef}
      virtualIndex={options?.virtualIndex}
    />
    </div>
  );

  return (
    <div
      ref={scrollRef}
      data-testid="copilot-message-list"
      className="flex flex-1 flex-col overflow-y-auto px-[var(--edge-space-4)] py-[var(--edge-space-4)]"
    >
      {isVirtualized && paddingTop > 0 ? (
        <div aria-hidden style={{ height: paddingTop }} />
      ) : null}
      {isVirtualized
        ? virtualRows.map((virtualRow) => {
            const message = historyMessages[virtualRow.index]!;
            return renderBubble(message, {
              measureRef: rowVirtualizer.measureElement,
              virtualIndex: virtualRow.index,
            });
          })
        : historyMessages.map((message) => renderBubble(message))}
      {isVirtualized && paddingBottom > 0 ? (
        <div aria-hidden style={{ height: paddingBottom }} />
      ) : null}
      {streamingMessage ? renderBubble(streamingMessage, { forceShowActions: false }) : null}
    </div>
  );
}
