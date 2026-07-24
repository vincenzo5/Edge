"use client";

import { useEffect, useRef, useState } from "react";
import type { ResearchArtifactHint } from "@/lib/research/artifactHint";
import { EdgeButton, EdgeEmptyState } from "../design-system";
import { copilotAttachmentDisplayUrl } from "@/lib/persistence/client/copilotAttachmentsClient";
import { CopilotArtifactCard } from "./CopilotArtifactCard";
import type { CopilotMessage, CopilotToolStep } from "./useCopilotThread";

type ConfirmActions = {
  onAccept: () => void;
  onReject: () => void;
  disabled?: boolean;
};

function splitToolSteps(steps: CopilotToolStep[]) {
  const confirmSteps = steps.filter((step) => step.status === "pending-confirm");
  const artifactSteps = steps.filter(
    (step) => step.status !== "pending-confirm" && step.artifactHint != null,
  );
  const disclosureSteps = steps.filter(
    (step) => step.status !== "pending-confirm" && step.artifactHint == null,
  );
  return { confirmSteps, artifactSteps, disclosureSteps };
}

function ToolStepChip({
  step,
  confirmActions,
}: {
  step: CopilotToolStep;
  confirmActions?: ConfirmActions;
}) {
  const tone =
    step.status === "error"
      ? "border-[var(--edge-negative)] text-[var(--edge-negative)]"
      : step.status === "pending-confirm"
        ? "border-[var(--edge-warning)] text-[var(--edge-warning)]"
        : step.status === "rejected"
          ? "border-[var(--edge-border)] text-[var(--edge-text-tertiary)]"
          : step.status === "running"
            ? "border-[var(--edge-border-strong)] text-[var(--edge-text-secondary)]"
            : "border-[var(--edge-border)] text-[var(--edge-text-secondary)]";

  return (
    <div
      data-testid={`copilot-tool-${step.callId}`}
      data-status={step.status}
      className={`rounded border px-2 py-1 text-xs ${tone}`}
    >
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        <span className="font-medium">{step.name}</span>
        {step.summary ? (
          <span className="text-[var(--edge-text-tertiary)]">· {step.summary}</span>
        ) : step.status === "running" ? (
          <span className="text-[var(--edge-text-tertiary)]">· running…</span>
        ) : null}
      </div>
      {step.status === "pending-confirm" && step.confirmReason ? (
        <p className="mt-1 text-[var(--edge-text-secondary)]">{step.confirmReason}</p>
      ) : null}
      {step.status === "pending-confirm" && confirmActions ? (
        <div className="mt-2 flex gap-2">
          <EdgeButton
            type="button"
            variant="primary"
            data-testid={`copilot-confirm-accept-${step.callId}`}
            disabled={confirmActions.disabled}
            onClick={confirmActions.onAccept}
          >
            Accept
          </EdgeButton>
          <EdgeButton
            type="button"
            variant="secondary"
            data-testid={`copilot-confirm-reject-${step.callId}`}
            disabled={confirmActions.disabled}
            onClick={confirmActions.onReject}
          >
            Reject
          </EdgeButton>
        </div>
      ) : null}
    </div>
  );
}

function ThoughtsDisclosure({
  steps,
}: {
  steps: CopilotToolStep[];
}) {
  const hasRunning = steps.some((step) => step.status === "running");
  const [open, setOpen] = useState(hasRunning);

  useEffect(() => {
    if (hasRunning) {
      setOpen(true);
    }
  }, [hasRunning]);

  if (steps.length === 0) return null;

  return (
    <details
      data-testid="copilot-thoughts"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="max-w-full rounded border border-[var(--edge-border)] bg-[var(--edge-surface-raised)] px-3 py-2"
    >
      <summary className="cursor-pointer list-none text-xs font-medium text-[var(--edge-text-secondary)] marker:content-none [&::-webkit-details-marker]:hidden">
        Thoughts
      </summary>
      <div className="mt-2 flex flex-col gap-1">
        {steps.map((step) => (
          <ToolStepChip key={step.callId} step={step} />
        ))}
      </div>
    </details>
  );
}

function StreamingPlaceholder() {
  return (
    <span className="text-[var(--edge-text-tertiary)]">
      Thinking
      <span className="copilot-streaming-cursor" aria-hidden>
        …
      </span>
    </span>
  );
}

function MessageAttachments({ messageId, attachments }: { messageId: string; attachments: NonNullable<CopilotMessage["attachments"]> }) {
  return (
    <div
      data-testid={`copilot-message-attachments-${messageId}`}
      className="mb-2 flex flex-wrap gap-2"
    >
      {attachments.map((attachment) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={attachment.id}
          src={copilotAttachmentDisplayUrl(attachment.id)}
          alt={attachment.name ?? "Attached image"}
          className="h-20 w-20 rounded-lg border border-[var(--edge-border)] object-cover"
        />
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  onResolveConfirm,
  confirmDisabled,
  isFocused,
  messageRef,
  showActions,
  onCopy,
  onRegenerate,
  actionsDisabled,
  onPinArtifact,
  isArtifactPinned,
}: {
  message: CopilotMessage;
  onResolveConfirm: (messageId: string, callId: string, accepted: boolean) => void;
  confirmDisabled?: boolean;
  isFocused?: boolean;
  messageRef?: React.RefObject<HTMLDivElement | null>;
  showActions?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
  actionsDisabled?: boolean;
  onPinArtifact?: (
    hint: ResearchArtifactHint,
    provenance: { messageId: string; toolCallId: string },
  ) => void;
  isArtifactPinned?: (toolCallId: string) => boolean;
}) {
  const isUser = message.role === "user";
  const { confirmSteps, artifactSteps, disclosureSteps } = splitToolSteps(message.toolSteps);
  const bubbleClass = isUser
    ? "ml-10 max-w-[85%] rounded-2xl bg-[var(--edge-surface-raised)] px-4 py-3 text-[length:var(--copilot-message-body-size)] text-[var(--edge-text-primary)]"
    : "mr-6 max-w-[92%] bg-transparent px-1 py-1 text-[length:var(--copilot-message-body-size)] leading-relaxed text-[var(--edge-text-primary)]";

  return (
    <div
      ref={messageRef}
      data-testid={`copilot-message-${message.id}`}
      data-role={message.role}
      data-focused={isFocused ? "true" : undefined}
      className={`group flex flex-col gap-2 ${isUser ? "items-end" : "items-start"} ${
        isFocused
          ? "rounded ring-2 ring-[var(--edge-accent)] ring-offset-2 ring-offset-[var(--edge-surface)]"
          : ""
      }`}
    >
      <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
        <div className={`whitespace-pre-wrap ${bubbleClass}`}>
          {isUser && message.attachments?.length ? (
            <MessageAttachments messageId={message.id} attachments={message.attachments} />
          ) : null}
          {message.content ||
            (message.status === "streaming" ? (
              <StreamingPlaceholder />
            ) : message.attachments?.length ? (
              <span className="text-[var(--edge-text-secondary)]">Image attached</span>
            ) : (
              ""
            ))}
        </div>
      </div>
      {!isUser && disclosureSteps.length > 0 ? (
        <ThoughtsDisclosure steps={disclosureSteps} />
      ) : null}
      {!isUser && artifactSteps.length > 0 ? (
        <div
          data-testid={`copilot-artifacts-${message.id}`}
          className="flex w-full max-w-full flex-col gap-2"
        >
          {artifactSteps.map((step) =>
            step.artifactHint ? (
              <CopilotArtifactCard
                key={step.callId}
                hint={step.artifactHint}
                pinned={isArtifactPinned?.(step.callId) ?? false}
                disabled={step.status !== "done"}
                testId={`copilot-artifact-${step.callId}`}
                onPin={
                  onPinArtifact
                    ? () =>
                        onPinArtifact(step.artifactHint!, {
                          messageId: message.id,
                          toolCallId: step.callId,
                        })
                    : undefined
                }
              />
            ) : null,
          )}
        </div>
      ) : null}
      {confirmSteps.length > 0 ? (
        <div className="flex max-w-full flex-col gap-1">
          {confirmSteps.map((step) => (
            <ToolStepChip
              key={step.callId}
              step={step}
              confirmActions={{
                onAccept: () => onResolveConfirm(message.id, step.callId, true),
                onReject: () => onResolveConfirm(message.id, step.callId, false),
                disabled: confirmDisabled,
              }}
            />
          ))}
        </div>
      ) : null}
      {showActions ? (
        <div
          data-testid={`copilot-message-actions-${message.id}`}
          className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <EdgeButton
            type="button"
            variant="secondary"
            data-testid={`copilot-copy-${message.id}`}
            disabled={actionsDisabled || !message.content}
            onClick={onCopy}
          >
            Copy
          </EdgeButton>
          <EdgeButton
            type="button"
            variant="secondary"
            data-testid={`copilot-regenerate-${message.id}`}
            disabled={actionsDisabled}
            onClick={onRegenerate}
          >
            Regenerate
          </EdgeButton>
        </div>
      ) : null}
      {message.error ? (
        <p className="text-xs text-[var(--edge-negative)]" role="alert">
          {message.error}
        </p>
      ) : null}
      {message.status === "cancelled" ? (
        <p className="text-xs text-[var(--edge-text-tertiary)]">Cancelled</p>
      ) : null}
    </div>
  );
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
  const focusRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div
      data-testid="copilot-message-list"
      className="flex flex-1 flex-col gap-5 overflow-y-auto px-[var(--edge-space-4)] py-[var(--edge-space-4)]"
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onResolveConfirm={onResolveConfirm}
          confirmDisabled={confirmDisabled}
          isFocused={focusMessageId === message.id}
          messageRef={focusMessageId === message.id ? focusRef : undefined}
          showActions={message.id === lastAssistantMessageId}
          actionsDisabled={actionsDisabled}
          onCopy={() => {
            if (!message.content || typeof navigator === "undefined") return;
            void navigator.clipboard.writeText(message.content);
          }}
          onRegenerate={onRegenerate}
          onPinArtifact={onPinArtifact}
          isArtifactPinned={isArtifactPinned}
        />
      ))}
    </div>
  );
}
