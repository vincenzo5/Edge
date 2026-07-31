"use client";

import { memo, useEffect, useRef, useState, type RefObject } from "react";
import type { ResearchArtifactHint } from "@/lib/research/artifactHint";
import { ChevronDownIcon, CopyIcon } from "../chart-chrome/ChartHeaderIcons";
import {
  formatTraceChipSummary,
  formatTraceDisclosureLabel,
  TRACE_CHIP_OVERFLOW,
  toolStepDisplayName,
  toolStepKind,
  toolStepTargetLabel,
  type ToolStepKind,
} from "@/lib/copilot/toolStepDisplay";
import {
  attachmentToMediaBlock,
  toolStepToActionBlock,
  toolStepToDataBlock,
  toolStepToMediaBlock,
  toolStepsToReferenceBlock,
  workflowPromptsToFollowupsBlock,
} from "@/lib/copilot/chatBlockMapping";
import { CopilotActionBlock } from "./CopilotActionBlock";
import { CopilotArtifactCard } from "./CopilotArtifactCard";
import { CopilotDataBlock } from "./CopilotDataBlock";
import { CopilotFollowupsBlock } from "./CopilotFollowupsBlock";
import { CopilotMediaBlock } from "./CopilotMediaBlock";
import { CopilotReferenceBlock } from "./CopilotReferenceBlock";
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

function stepStatusTone(status: CopilotToolStep["status"]): string {
  switch (status) {
    case "error":
    case "rejected":
      return "text-[var(--edge-negative)]";
    case "running":
      return "text-[var(--edge-text-secondary)]";
    default:
      return "text-[var(--edge-text-tertiary)]";
  }
}

function TraceToolIcon({ kind, status }: { kind: ToolStepKind; status: CopilotToolStep["status"] }) {
  const tone =
    status === "error" || status === "rejected"
      ? "text-[var(--edge-negative)]"
      : status === "running"
        ? "text-[var(--edge-text-secondary)]"
        : "text-[var(--edge-text-tertiary)]";

  return (
    <span className={`copilot-trace-chip-icon shrink-0 ${tone}`} aria-hidden>
      {kind === "read" ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.2" />
          <path d="M6 3.5v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ) : kind === "write" ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 9.5h7M7.5 2.5l2 2-4.5 4.5H3v-2L7.5 2.5z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : kind === "chart" ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 9V5.5M5 9V3M8 9V6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ) : kind === "order" ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 3h7l-1 6H3.5l-1-6zM4.5 6h3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : kind === "search" ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="5.25" cy="5.25" r="2.75" stroke="currentColor" strokeWidth="1.2" />
          <path d="M7.5 7.5L9.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 6h6M6 3v6"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}

function TraceToolChip({ step }: { step: CopilotToolStep }) {
  const [expanded, setExpanded] = useState(false);
  const target = toolStepTargetLabel(step);
  const detail =
    step.summary ??
    (step.status === "running" ? "running…" : step.status === "error" ? "failed" : null);
  const showDetail = expanded && detail != null;

  return (
    <button
      type="button"
      data-testid={`copilot-tool-${step.callId}`}
      data-status={step.status}
      data-expanded={expanded ? "true" : "false"}
      className={`copilot-trace-chip edge-focus-ring flex w-full min-w-0 flex-col gap-0.5 rounded-md border border-[var(--edge-border)] bg-[var(--edge-surface-raised)] px-2 py-1.5 text-left text-[12px] leading-snug ${stepStatusTone(step.status)}`}
      onClick={() => setExpanded((current) => !current)}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <TraceToolIcon kind={toolStepKind(step)} status={step.status} />
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere] break-words">
          <span className="font-normal text-[var(--edge-text-primary)]">
            {toolStepDisplayName(step.name)}
          </span>
          {!expanded && target ? (
            <span className="text-[var(--edge-text-tertiary)]"> · {target}</span>
          ) : null}
        </span>
      </span>
      {showDetail ? (
        <span className="pl-[18px] text-[var(--edge-text-secondary)] opacity-90">{detail}</span>
      ) : null}
    </button>
  );
}

/** Grok-style thin muted disclosure — chevron toggles expandable tool chips. */
function ThoughtsDisclosure({
  steps,
  thoughtDurationSec,
}: {
  steps: CopilotToolStep[];
  thoughtDurationSec?: number;
}) {
  const hasRunning = steps.some((step) => step.status === "running");
  const [open, setOpen] = useState(hasRunning);
  const [showAllChips, setShowAllChips] = useState(false);
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

  const label = formatTraceDisclosureLabel({
    stepCount: steps.length,
    hasRunning,
    durationSec: thoughtDurationSec,
  });
  const chipSummary = formatTraceChipSummary(steps.length);
  const overflowCount = Math.max(0, steps.length - TRACE_CHIP_OVERFLOW);
  const visibleSteps =
    showAllChips || overflowCount === 0 ? steps : steps.slice(0, TRACE_CHIP_OVERFLOW);

  return (
    <details
      data-testid="copilot-thoughts"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="copilot-steps-disclosure w-full min-w-0 max-w-full"
    >
      <summary className="flex w-full min-w-0 cursor-pointer list-none items-center gap-1 text-[12px] font-normal text-[var(--edge-text-tertiary)] marker:content-none hover:text-[var(--edge-text-secondary)] [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 truncate">{label}</span>
        {chipSummary ? (
          <span className="shrink-0 text-[var(--edge-text-tertiary)] opacity-80">{chipSummary}</span>
        ) : null}
        <span
          className={`inline-flex shrink-0 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <ChevronDownIcon size={12} />
        </span>
      </summary>
      <div className="mt-1.5 flex w-full min-w-0 flex-col gap-1 pl-0">
        {visibleSteps.map((step) => (
          <TraceToolChip key={step.callId} step={step} />
        ))}
        {!showAllChips && overflowCount > 0 ? (
          <button
            type="button"
            data-testid="copilot-trace-chip-overflow"
            className="copilot-trace-chip-overflow edge-focus-ring self-start rounded-full border border-[var(--edge-border)] bg-transparent px-2 py-0.5 text-[12px] font-medium text-[var(--edge-text-tertiary)] transition-colors hover:text-[var(--edge-text-secondary)]"
            onClick={() => setShowAllChips(true)}
          >
            +{overflowCount} more
          </button>
        ) : null}
      </div>
    </details>
  );
}

function StreamingPlaceholder({ startedAt }: { startedAt?: number }) {
  return <CopilotWorkingIndicator startedAt={startedAt} />;
}

function renderArtifactStepBlock(
  step: CopilotToolStep,
  options: {
    messageId: string;
    testId: string;
    pinned: boolean;
    disabled: boolean;
    onPinArtifact?: CopilotMessageBubbleProps["onPinArtifact"];
    onOpenHref?: (href: string) => void;
  },
) {
  const dataBlock = toolStepToDataBlock(step);
  if (dataBlock) {
    return (
      <CopilotDataBlock
        block={dataBlock}
        testId={options.testId}
        pinned={options.pinned}
        disabled={options.disabled}
        onPin={
          options.onPinArtifact
            ? () =>
                options.onPinArtifact!(step.artifactHint!, {
                  messageId: options.messageId,
                  toolCallId: step.callId,
                })
            : undefined
        }
        onOpen={options.onOpenHref}
      />
    );
  }

  const mediaBlock = toolStepToMediaBlock(step);
  if (mediaBlock) {
    return (
      <CopilotMediaBlock
        block={mediaBlock}
        testId={options.testId}
        pinned={options.pinned}
        disabled={options.disabled}
        onPin={
          options.onPinArtifact
            ? () =>
                options.onPinArtifact!(step.artifactHint!, {
                  messageId: options.messageId,
                  toolCallId: step.callId,
                })
            : undefined
        }
        onOpen={options.onOpenHref}
      />
    );
  }

  if (!step.artifactHint) return null;

  return (
    <CopilotArtifactCard
      hint={step.artifactHint}
      pinned={options.pinned}
      disabled={options.disabled}
      testId={options.testId}
      onPin={
        options.onPinArtifact
          ? () =>
              options.onPinArtifact!(step.artifactHint!, {
                messageId: options.messageId,
                toolCallId: step.callId,
              })
          : undefined
      }
    />
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
  onOpenHref?: (href: string) => void;
  showFollowups?: boolean;
  onSelectFollowup?: (prompt: string) => void;
  followupsDisabled?: boolean;
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
  if (prev.message.startedAtMs !== next.message.startedAtMs) return false;
  if (prev.message.thoughtDurationSec !== next.message.thoughtDurationSec) return false;
  if (!toolStepsEqual(prev.message.toolSteps, next.message.toolSteps)) return false;
  if (prev.onResolveConfirm !== next.onResolveConfirm) return false;
  if (prev.onCopy !== next.onCopy) return false;
  if (prev.onRegenerate !== next.onRegenerate) return false;
  if (prev.onPinArtifact !== next.onPinArtifact) return false;
  if (prev.isArtifactPinned !== next.isArtifactPinned) return false;
  if (prev.onOpenHref !== next.onOpenHref) return false;
  if (prev.showFollowups !== next.showFollowups) return false;
  if (prev.onSelectFollowup !== next.onSelectFollowup) return false;
  if (prev.followupsDisabled !== next.followupsDisabled) return false;
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
  onOpenHref,
  showFollowups = false,
  onSelectFollowup,
  followupsDisabled = false,
  measureRef,
  virtualIndex,
}: CopilotMessageBubbleProps) {
  const isUser = message.role === "user";
  const { confirmSteps, artifactSteps, disclosureSteps } = splitToolSteps(message.toolSteps);
  const referenceBlock = !isUser ? toolStepsToReferenceBlock(message.toolSteps) : null;
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
      className={`group/message flex w-full min-w-0 max-w-full flex-col gap-2 ${isUser ? "items-end" : "items-start"} ${
        isFocused
          ? "rounded ring-2 ring-[var(--edge-accent)] ring-offset-2 ring-offset-[var(--edge-surface)]"
          : ""
      }`}
    >
      {!isUser && disclosureSteps.length > 0 ? (
        <ThoughtsDisclosure
          steps={disclosureSteps}
          thoughtDurationSec={message.thoughtDurationSec}
        />
      ) : null}
      {isUser && message.attachments?.length ? (
        <div
          data-testid={`copilot-message-attachments-${message.id}`}
          className="flex w-full max-w-full flex-col gap-2"
        >
          {message.attachments.map((attachment) => (
            <CopilotMediaBlock
              key={attachment.id}
              block={attachmentToMediaBlock(attachment)}
              testId={`copilot-media-${attachment.id}`}
              onOpen={onOpenHref}
            />
          ))}
        </div>
      ) : null}
      {isUser ? (
        <div className="flex w-full justify-end">
          <div className={`whitespace-pre-wrap ${bubbleClass}`}>{message.content}</div>
        </div>
      ) : (
        <div
          data-testid="copilot-answer-compose"
          className="copilot-answer-compose flex w-full min-w-0 flex-col gap-2"
        >
          <div className={`whitespace-pre-wrap ${bubbleClass}`}>
            {message.content ? (
              <>
                {message.content}
                {message.status === "streaming" ? (
                  <span
                    className="copilot-streaming-cursor ml-px inline-block w-[2px] align-baseline text-[var(--edge-text-primary)]"
                    aria-hidden
                  >
                    |
                  </span>
                ) : null}
              </>
            ) : message.status === "streaming" ? (
              <StreamingPlaceholder startedAt={message.startedAtMs} />
            ) : message.attachments?.length ? (
              <span className="text-[var(--edge-text-secondary)]">Image attached</span>
            ) : (
              ""
            )}
          </div>
          {referenceBlock ? (
            <CopilotReferenceBlock
              block={referenceBlock}
              testId={`copilot-reference-${message.id}`}
              onOpen={onOpenHref}
              disabled={message.status === "streaming"}
              labeled
            />
          ) : null}
          {showFollowups ? (
            <CopilotFollowupsBlock
              block={workflowPromptsToFollowupsBlock()}
              testId={`copilot-followups-${message.id}`}
              onSelect={onSelectFollowup}
              disabled={followupsDisabled}
              showLabel
            />
          ) : null}
          {showActions ? (
            <div
              data-testid={`copilot-message-actions-${message.id}`}
              data-reveal={actionsReveal}
              className={`flex items-center gap-0.5 ${
                actionsReveal === "always"
                  ? ""
                  : "opacity-0 transition-opacity group-hover/message:opacity-100 group-focus-within/message:opacity-100"
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
        </div>
      )}
      {!isUser && artifactSteps.length > 0 ? (
        <div
          data-testid={`copilot-artifacts-${message.id}`}
          className="flex w-full max-w-full flex-col gap-2"
        >
          {artifactSteps.map((step) =>
            step.artifactHint ? (
              <div key={step.callId}>
                {renderArtifactStepBlock(step, {
                  messageId: message.id,
                  testId: `copilot-artifact-${step.callId}`,
                  pinned: isArtifactPinned?.(step.callId) ?? false,
                  disabled: step.status !== "done",
                  onPinArtifact,
                  onOpenHref,
                })}
              </div>
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
