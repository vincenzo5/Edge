"use client";

import { useVirtualizer, observeElementOffset, type Virtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { isNearBottom } from "@/lib/copilot/chatScrollPolicy";
import type { ResearchArtifactHint } from "@/lib/research/artifactHint";
import { ChevronDownIcon } from "../chart-chrome/ChartHeaderIcons";
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

function latestUserMessageId(messages: CopilotMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "user") return message.id;
  }
  return null;
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
  onOpenHref?: (href: string) => void;
  onSelectFollowup?: (prompt: string) => void;
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
  onOpenHref,
  onSelectFollowup,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  const pinnedUserMessageIdRef = useRef<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

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

  const scrollToLatest = useCallback((behavior: ScrollBehavior = "auto") => {
    const element = scrollRef.current;
    if (!element) return;
    stickToBottomRef.current = true;
    setShowScrollToBottom(false);
    const top = element.scrollHeight;
    if (behavior === "smooth" && typeof element.scrollTo === "function") {
      element.scrollTo({ top, behavior: "smooth" });
      lastScrollTopRef.current = top;
      return;
    }
    // Instant assignment — more reliable than scrollTo while the virtualizer remeasures.
    element.scrollTop = top;
    lastScrollTopRef.current = element.scrollTop;
  }, []);

  const totalSize = rowVirtualizer.getTotalSize();

  useLayoutEffect(() => {
    const nextUserMessageId = latestUserMessageId(messages);
    const userMessageJustSent =
      nextUserMessageId != null && nextUserMessageId !== pinnedUserMessageIdRef.current;
    if (userMessageJustSent) {
      pinnedUserMessageIdRef.current = nextUserMessageId;
      stickToBottomRef.current = true;
    }
    if (stickToBottomRef.current) {
      scrollToLatest("auto");
    }
  }, [
    messages,
    historyMessages.length,
    streamingMessage?.id,
    streamingMessage?.content,
    streamingMessage?.toolSteps,
    totalSize,
    scrollToLatest,
  ]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    lastScrollTopRef.current = element.scrollTop;

    const onScroll = () => {
      const scrollTop = element.scrollTop;
      const scrollingUp = scrollTop < lastScrollTopRef.current - 0.5;
      const scrollingDown = scrollTop > lastScrollTopRef.current + 0.5;
      lastScrollTopRef.current = scrollTop;

      // Any upward movement is explicit leave-bottom intent. Stay unpinned even
      // inside the near-bottom threshold so slow scrolls are not re-pinned/yanked.
      if (scrollingUp) {
        stickToBottomRef.current = false;
        setShowScrollToBottom(!isNearBottom(element));
        return;
      }

      if (stickToBottomRef.current) {
        setShowScrollToBottom(false);
        return;
      }

      // Re-engage follow only when the user scrolls back down into the zone.
      if (scrollingDown && isNearBottom(element)) {
        stickToBottomRef.current = true;
        setShowScrollToBottom(false);
        return;
      }

      setShowScrollToBottom(!isNearBottom(element));
    };

    // Unpin before the browser applies wheel deltas so resize/layout follow-ups
    // cannot snap the viewport while the gesture is still inside the threshold.
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        stickToBottomRef.current = false;
      }
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    element.addEventListener("wheel", onWheel, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        scrollToLatest("auto");
        return;
      }
      setShowScrollToBottom(!isNearBottom(element));
    });
    resizeObserver.observe(element);
    const column = element.firstElementChild;
    if (column) {
      resizeObserver.observe(column);
    }

    return () => {
      element.removeEventListener("scroll", onScroll);
      element.removeEventListener("wheel", onWheel);
      resizeObserver.disconnect();
    };
  }, [scrollToLatest, historyMessages.length, streamingMessage?.id]);

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
  const followupsDisabled = isStreaming || hasPendingConfirm;
  const virtualRows = rowVirtualizer.getVirtualItems();
  const isVirtualized = virtualRows.length > 0;
  const paddingTop = isVirtualized && virtualRows.length > 0 ? virtualRows[0]!.start : 0;
  const paddingBottom =
    isVirtualized && virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1]!.end
      : 0;

  useEffect(() => {
    if (!focusMessageId) return;
    // Focusing a historical message is an explicit jump away from live follow.
    stickToBottomRef.current = false;
    const node = focusRef.current;
    if (!node) return;
    node.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusMessageId]);

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
  ) => {
    const isAssistant = message.role === "assistant";
    const isStreamingMessage = message.status === "streaming";
    const isLatestAssistant = message.id === lastAssistantMessageId;
    const showActions =
      options?.forceShowActions ?? (isAssistant && !isStreamingMessage);

    return (
    <div key={message.id} className="w-full min-w-0 pb-5">
      <CopilotMessageBubble
      message={message}
      onResolveConfirm={onResolveConfirm}
      confirmDisabled={confirmDisabled}
      isFocused={focusMessageId === message.id}
      messageRef={focusMessageId === message.id ? focusRef : undefined}
      showActions={showActions}
      actionsReveal={isLatestAssistant ? "always" : "hover"}
      actionsDisabled={actionsDisabled}
      onCopy={() => {
        if (!message.content || typeof navigator === "undefined") return;
        void navigator.clipboard.writeText(message.content);
      }}
      onRegenerate={isLatestAssistant ? onRegenerate : undefined}
      onPinArtifact={onPinArtifact}
      isArtifactPinned={isArtifactPinned}
      onOpenHref={onOpenHref}
      showFollowups={isLatestAssistant && !followupsDisabled}
      onSelectFollowup={onSelectFollowup}
      followupsDisabled={followupsDisabled}
      measureRef={options?.measureRef}
      virtualIndex={options?.virtualIndex}
    />
    </div>
    );
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        data-testid="copilot-message-list"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto [overflow-anchor:none] px-[var(--edge-space-4)] pb-0 pt-[var(--edge-space-4)]"
      >
        <div
          data-testid="copilot-message-column"
          className="mx-auto flex w-full min-w-0 max-w-[var(--copilot-bar-max-width)] flex-col px-[var(--copilot-message-inline-inset)]"
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
          <div data-testid="copilot-message-list-end" aria-hidden className="h-px w-full shrink-0" />
        </div>
      </div>

      {showScrollToBottom ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-[var(--edge-space-4)]">
          <div className="flex w-full max-w-[var(--copilot-bar-max-width)] justify-end pr-2">
            <button
              type="button"
              data-testid="copilot-scroll-to-bottom"
              aria-label="Scroll to latest message"
              title="Scroll to latest"
              className="edge-focus-ring pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_oklab,#2a2a2a_92%,transparent)] text-[var(--edge-text-primary)] shadow-[0_2px_10px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--edge-text-strong)_14%,transparent)] transition-colors hover:bg-[#333]"
              onClick={() => scrollToLatest("auto")}
            >
              <ChevronDownIcon size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
