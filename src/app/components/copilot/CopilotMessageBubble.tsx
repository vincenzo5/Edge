"use client";

import { memo, useEffect, useRef, useState, type RefObject } from "react";
import type { ResearchArtifactHint } from "@/lib/research/artifactHint";
import { ChevronDownIcon, CopyIcon } from "../chart-chrome/ChartHeaderIcons";
import { copilotAttachmentDisplayUrl } from "@/lib/persistence/client/copilotAttachmentsClient";
import { formatStepsDisclosureLabel, toolStepDisplayName } from "@/lib/copilot/toolStepDisplay";
import { toolStepToActionBlock } from "@/lib/copilot/chatBlockMapping";
import { CopilotActionBlock } from "./CopilotActionBlock";
import { CopilotArtifactCard } from "./CopilotArtifactCard";
import { CopilotWorkingIndicator } from "./CopilotWorkingIndicator";
import type { CopilotMessage, CopilotToolStep } from "./useCopilotThread";

function RegenerateIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M12.8 6.2A4.8 4.8 0 0 0 4.4 4.9"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M12.2 3.2v3.1h-3.1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.2 9.8a4.8 4.8 0 0 0 8.4 1.3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M3.8 12.8V9.7h3.1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


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

function stepStatusGlyph(status: CopilotToolStep["status"]): string {
  switch (status) {
    case "running":
      return "◌";
    case "error":
    case "rejected":
      return "✗";
    case "done":
    case "pending-confirm":
    default:
      return "✓";
  }
}

function ThoughtStepRow({ step }: { step: CopilotToolStep }) {
  const detail =
    step.summary ??
    (step.status === "running" ? "running…" : step.status === "error" ? "failed" : null);
  const tone =
    step.status === "error" || step.status === "rejected"
      ? "text-[var(--edge-negative)]"
      : step.status === "running"
        ? "text-[var(--edge-text-secondary)]"
        : "text-[var(--edge-text-tertiary)]";

  return (
    <div
      data-testid={`copilot-tool-${step.callId}`}
      data-status={step.status}
      className={`flex w-full min-w-0 items-start gap-x-1.5 text-[12px] leading-snug ${tone}`}
    >
      <span className="mt-px w-3 shrink-0 text-center opacity-70" aria-hidden>
        {stepStatusGlyph(step.status)}
      </span>
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere] break-words">
        <span className="font-normal">{toolStepDisplayName(step.name)}</span>
        {detail ? <span className="opacity-80"> · {detail}</span> : null}
      </span>
    </div>
  );
}

/** Grok-style thin muted disclosure — no button chrome; chevron toggles tool steps. */
function ThoughtsDisclosure({ steps }: { steps: CopilotToolStep[] }) {
  const hasRunning = steps.some((step) => step.status === "running");
  const [open, setOpen] = useState(hasRunning);
  const wasRunningRef = useRef(hasRunning);

  useEffect(() => {
    if (hasRunning) {
      setOpen(true);
    } else if (wasRunningRef.current) {
      setOpen(false);
    }
    wasRunningRef.current = hasRunning;
  }, [hasRunning]);

  if (steps.length === 0) return null;

  const label = formatStepsDisclosureLabel(steps.length, hasRunning);

  return (
    <details
      data-testid="copilot-thoughts"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="copilot-steps-disclosure w-full min-w-0 max-w-full"
    >
      <summary className="flex w-full min-w-0 cursor-pointer list-none items-center gap-1 text-[12px] font-normal text-[var(--edge-text-tertiary)] marker:content-none hover:text-[var(--edge-text-secondary)] [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 truncate">{label}</span>
        <span
          className={`inline-flex shrink-0 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <ChevronDownIcon size={12} />
        </span>
      </summary>
      <div className="mt-1.5 flex w-full min-w-0 flex-col gap-1 pl-0">
        {steps.map((step) => (
          <ThoughtStepRow key={step.callId} step={step} />
        ))}
      </div>
    </details>
  );
}

function StreamingPlaceholder() {
  return <CopilotWorkingIndicator />;
}

function MessageAttachments({
  messageId,
  attachments,
}: {
  messageId: string;
  attachments: NonNullable<CopilotMessage["attachments"]>;
}) {
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

export type CopilotMessageBubbleProps = {
  message: CopilotMessage;
  onResolveConfirm: (messageId: string, callId: string, accepted: boolean) => void;
  confirmDisabled?: boolean;
  isFocused?: boolean;
  messageRef?: RefObject<HTMLDivElement | null>;
  showActions?: boolean;
  /** Latest reply stays visible; older replies reveal on message hover. */
  actionsReveal?: "always" | "hover";
  onCopy?: () => void;
  onRegenerate?: () => void;
  actionsDisabled?: boolean;
  onPinArtifact?: (
    hint: ResearchArtifactHint,
    provenance: { messageId: string; toolCallId: string },
  ) => void;
  isArtifactPinned?: (toolCallId: string) => boolean;
  measureRef?: (node: Element | null) => void;
  virtualIndex?: number;
};

function toolStepsEqual(left: CopilotToolStep[], right: CopilotToolStep[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index]!;
    const b = right[index]!;
    if (
      a.callId !== b.callId ||
      a.status !== b.status ||
      a.summary !== b.summary ||
      a.confirmReason !== b.confirmReason ||
      a.name !== b.name
    ) {
      return false;
    }
  }
  return true;
}

function copilotMessageBubblePropsAreEqual(
  prev: CopilotMessageBubbleProps,
  next: CopilotMessageBubbleProps,
): boolean {
  if (prev.virtualIndex !== next.virtualIndex) return false;
  if (prev.isFocused !== next.isFocused) return false;
  if (prev.showActions !== next.showActions) return false;
  if (prev.actionsReveal !== next.actionsReveal) return false;
  if (prev.actionsDisabled !== next.actionsDisabled) return false;
  if (prev.confirmDisabled !== next.confirmDisabled) return false;
  if (prev.message.id !== next.message.id) return false;
  if (prev.message.role !== next.message.role) return false;
  if (prev.message.content !== next.message.content) return false;
  if (prev.message.status !== next.message.status) return false;
  if (prev.message.error !== next.message.error) return false;
  if (!toolStepsEqual(prev.message.toolSteps, next.message.toolSteps)) return false;
  if (prev.onResolveConfirm !== next.onResolveConfirm) return false;
  if (prev.onCopy !== next.onCopy) return false;
  if (prev.onRegenerate !== next.onRegenerate) return false;
  if (prev.onPinArtifact !== next.onPinArtifact) return false;
  if (prev.isArtifactPinned !== next.isArtifactPinned) return false;
  return true;
}

function CopilotMessageBubble({
  message,
  onResolveConfirm,
  confirmDisabled,
  isFocused,
  messageRef,
  showActions,
  actionsReveal = "hover",
  onCopy,
  onRegenerate,
  actionsDisabled,
  onPinArtifact,
  isArtifactPinned,
  measureRef,
  virtualIndex,
}: CopilotMessageBubbleProps) {
  const isUser = message.role === "user";
  const { confirmSteps, artifactSteps, disclosureSteps } = splitToolSteps(message.toolSteps);
  const bubbleClass = isUser
    ? "copilot-user-bubble"
    : "w-full bg-transparent py-1 text-[length:var(--copilot-message-body-size)] leading-relaxed text-[var(--edge-text-primary)]";

  return (
    <div
      ref={(node) => {
        measureRef?.(node);
        if (messageRef) {
          messageRef.current = node;
        }
      }}
      data-index={virtualIndex}
      data-testid={`copilot-message-${message.id}`}
      data-role={message.role}
      data-focused={isFocused ? "true" : undefined}
      className={`group flex w-full min-w-0 max-w-full flex-col gap-2 ${isUser ? "items-end" : "items-start"} ${
        isFocused
          ? "rounded ring-2 ring-[var(--edge-accent)] ring-offset-2 ring-offset-[var(--edge-surface)]"
          : ""
      }`}
    >
      {!isUser && disclosureSteps.length > 0 ? (
        <ThoughtsDisclosure steps={disclosureSteps} />
      ) : null}
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
        <div className="flex max-w-full flex-col gap-2">
          {confirmSteps.map((step) => {
            const actionBlock = toolStepToActionBlock(step);
            if (!actionBlock) return null;
            return (
              <CopilotActionBlock
                key={step.callId}
                block={actionBlock}
                disabled={confirmDisabled}
                onPrimary={() => onResolveConfirm(message.id, step.callId, true)}
                onSecondary={() => onResolveConfirm(message.id, step.callId, false)}
              />
            );
          })}
        </div>
      ) : null}
      {showActions ? (
        <div
          data-testid={`copilot-message-actions-${message.id}`}
          data-reveal={actionsReveal}
          className={`flex items-center gap-0.5 ${
            actionsReveal === "always"
              ? ""
              : "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          }`}
        >
          <button
            type="button"
            className="copilot-message-action-btn edge-focus-ring"
            data-testid={`copilot-copy-${message.id}`}
            aria-label="Copy"
            title="Copy"
            disabled={actionsDisabled || !message.content || !onCopy}
            onClick={onCopy}
          >
            <CopyIcon size={16} />
          </button>
          {onRegenerate ? (
            <button
              type="button"
              className="copilot-message-action-btn edge-focus-ring"
              data-testid={`copilot-regenerate-${message.id}`}
              aria-label="Regenerate"
              title="Regenerate"
              disabled={actionsDisabled}
              onClick={onRegenerate}
            >
              <RegenerateIcon size={16} />
            </button>
          ) : null}
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

export default memo(CopilotMessageBubble, copilotMessageBubblePropsAreEqual);
