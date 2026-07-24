"use client";

import type { ResearchArtifactHint } from "@/lib/research/artifactHint";
import { researchCardSubtitle, researchCardTitle } from "@/lib/research/cardFromHint";
import { canOpenResearchCard, openResearchCardHref } from "@/lib/research/openResearchCard";
import type { ResearchCardSketch } from "@/lib/research/sessionSketch";
import { EdgeButton } from "../design-system";

type ArtifactCardProps = {
  hint: ResearchArtifactHint;
  pinned?: boolean;
  onPin?: () => void;
  disabled?: boolean;
  testId?: string;
};

export function artifactHintTitle(hint: ResearchArtifactHint): string {
  if (hint.title?.trim()) return hint.title.trim();
  switch (hint.type) {
    case "chart":
      return `${hint.symbol} · ${hint.interval}`;
    case "screener":
      return hint.screenName ?? hint.queryLabel ?? "Screener results";
    case "journalDraft":
      return hint.summary ?? "Journal draft";
    case "note":
      return hint.title ?? hint.body.slice(0, 80);
    case "aiCallout":
      return hint.summary.slice(0, 120);
    default: {
      const _exhaustive: never = hint;
      return _exhaustive;
    }
  }
}

function artifactHintKind(hint: ResearchArtifactHint): string {
  switch (hint.type) {
    case "chart":
      return "Chart";
    case "screener":
      return "Screener";
    case "journalDraft":
      return "Journal";
    case "note":
      return "Note";
    case "aiCallout":
      return "AI callout";
    default: {
      const _exhaustive: never = hint;
      return _exhaustive;
    }
  }
}

export function CopilotArtifactCard({
  hint,
  pinned = false,
  onPin,
  disabled = false,
  testId,
}: ArtifactCardProps) {
  return (
    <div
      data-testid={testId ?? "copilot-artifact-card"}
      data-artifact-type={hint.type}
      className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-raised)] px-3 py-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-tertiary)]">
            {artifactHintKind(hint)}
          </p>
          <p className="truncate text-sm font-medium text-[var(--edge-text-primary)]">
            {artifactHintTitle(hint)}
          </p>
          {hint.type === "aiCallout" || hint.type === "note" ? (
            <p className="mt-1 line-clamp-3 text-xs text-[var(--edge-text-secondary)]">
              {hint.type === "note" ? hint.body : hint.summary}
            </p>
          ) : null}
        </div>
        {onPin ? (
          <EdgeButton
            type="button"
            variant={pinned ? "secondary" : "primary"}
            data-testid={pinned ? "copilot-artifact-pinned" : "copilot-artifact-pin"}
            disabled={disabled || pinned}
            onClick={onPin}
          >
            {pinned ? "Pinned" : "Pin"}
          </EdgeButton>
        ) : null}
      </div>
    </div>
  );
}

type EvidenceCardProps = {
  card: ResearchCardSketch;
  index: number;
  total: number;
  onUnpin: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOpen: (href: string) => void;
  onSendToBoard?: () => void;
};

export function ResearchEvidenceCardRow({
  card,
  index,
  total,
  onUnpin,
  onMoveUp,
  onMoveDown,
  onOpen,
  onSendToBoard,
}: EvidenceCardProps) {
  const href = openResearchCardHref(card);
  const openable = canOpenResearchCard(card);

  return (
    <div
      data-testid={`research-evidence-card-${card.id}`}
      data-card-type={card.type}
      className="rounded border border-[var(--edge-border)] bg-[var(--edge-surface-raised)] px-3 py-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-tertiary)]">
            {researchCardSubtitle(card)}
          </p>
          <p className="truncate text-sm font-medium text-[var(--edge-text-primary)]">
            {researchCardTitle(card)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {onSendToBoard ? (
            <EdgeButton
              type="button"
              variant="primary"
              data-testid={`research-evidence-send-board-${card.id}`}
              onClick={onSendToBoard}
            >
              Send to board
            </EdgeButton>
          ) : null}
          {openable && href ? (
            <EdgeButton
              type="button"
              variant="secondary"
              data-testid={`research-evidence-open-${card.id}`}
              onClick={() => onOpen(href)}
            >
              Open
            </EdgeButton>
          ) : null}
          <EdgeButton
            type="button"
            variant="link"
            data-testid={`research-evidence-unpin-${card.id}`}
            onClick={onUnpin}
          >
            Unpin
          </EdgeButton>
        </div>
      </div>
      <div className="mt-2 flex gap-1">
        <EdgeButton
          type="button"
          variant="secondary"
          data-testid={`research-evidence-up-${card.id}`}
          disabled={index === 0}
          onClick={onMoveUp}
          aria-label="Move up"
        >
          ↑
        </EdgeButton>
        <EdgeButton
          type="button"
          variant="secondary"
          data-testid={`research-evidence-down-${card.id}`}
          disabled={index >= total - 1}
          onClick={onMoveDown}
          aria-label="Move down"
        >
          ↓
        </EdgeButton>
      </div>
    </div>
  );
}
