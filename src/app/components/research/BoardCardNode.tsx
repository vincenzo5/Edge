"use client";

import { researchCardSubtitle, researchCardTitle } from "@/lib/research/cardFromHint";
import { canOpenResearchCard, openResearchCardHref } from "@/lib/research/openResearchCard";
import { canPromoteResearchCard } from "@/lib/research/promote";
import type { ResearchCardSketch } from "@/lib/research/sessionSketch";
import { EdgeButton } from "../design-system";
import BoardChartCardHost from "./BoardChartCardHost";
import BoardJournalDraftCardHost from "./BoardJournalDraftCardHost";
import BoardScreenerCardHost from "./BoardScreenerCardHost";

const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 120;
const CHART_WIDTH = 320;
const CHART_HEIGHT = 220;

export function boardCardDimensions(card: ResearchCardSketch): {
  width: number;
  height: number;
} {
  if (card.type === "chart") {
    return {
      width: card.position?.width ?? CHART_WIDTH,
      height: card.position?.height ?? CHART_HEIGHT,
    };
  }
  return {
    width: card.position?.width ?? DEFAULT_WIDTH,
    height: card.position?.height ?? DEFAULT_HEIGHT,
  };
}

type Props = {
  card: ResearchCardSketch;
  selected: boolean;
  linkSource: boolean;
  mountLiveChart: boolean;
  onSelect: (cardId: string, shiftKey: boolean) => void;
  onDragStart: (cardId: string, event: React.PointerEvent<HTMLElement>) => void;
  onOpen: (href: string) => void;
  onPromote: (cardId: string) => void;
  onRemove: (cardId: string) => void;
};

export default function BoardCardNode({
  card,
  selected,
  linkSource,
  mountLiveChart,
  onSelect,
  onDragStart,
  onOpen,
  onPromote,
  onRemove,
}: Props) {
  const { width, height } = boardCardDimensions(card);
  const x = card.position?.x ?? 80;
  const y = card.position?.y ?? 80;
  const href = openResearchCardHref(card);
  const openable = canOpenResearchCard(card);
  const promotable = canPromoteResearchCard(card);
  const subtitle = researchCardSubtitle(card);
  const title = researchCardTitle(card);

  return (
    <article
      data-testid={`research-board-card-${card.id}`}
      data-card-type={card.type}
      data-selected={selected ? "true" : "false"}
      data-link-source={linkSource ? "true" : "false"}
      data-chart-mounted={card.type === "chart" && mountLiveChart ? "true" : "false"}
      className={`research-board-card absolute flex flex-col rounded border bg-[var(--edge-surface-raised)] shadow-sm ${
        selected || linkSource
          ? "border-[var(--edge-accent)] ring-1 ring-[var(--edge-accent-muted)]"
          : "border-[var(--edge-border)]"
      }`}
      style={{
        left: x,
        top: y,
        width,
        minHeight: height,
      }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("[data-board-card-action]")) return;
        onSelect(card.id, event.shiftKey);
        onDragStart(card.id, event);
      }}
    >
      <header className="flex items-start justify-between gap-2 border-b border-[var(--edge-border)] px-3 py-2">
        <div className="min-w-0">
          {subtitle ? (
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-tertiary)]">
              {subtitle}
            </p>
          ) : null}
          <p className="truncate text-sm font-medium text-[var(--edge-text-primary)]">{title}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1" data-board-card-action>
          {promotable ? (
            <EdgeButton
              type="button"
              variant="secondary"
              data-testid={`research-board-promote-${card.id}`}
              onClick={() => onPromote(card.id)}
            >
              Promote
            </EdgeButton>
          ) : null}
          {openable && href ? (
            <EdgeButton
              type="button"
              variant="secondary"
              data-testid={`research-board-open-${card.id}`}
              onClick={() => onOpen(href)}
            >
              Open
            </EdgeButton>
          ) : null}
          <EdgeButton
            type="button"
            variant="link"
            data-testid={`research-board-remove-${card.id}`}
            onClick={() => onRemove(card.id)}
          >
            Remove
          </EdgeButton>
        </div>
      </header>
      <div className="min-h-0 flex-1 px-3 py-2 text-xs text-[var(--edge-text-secondary)]">
        {card.type === "note" ? (
          <p className="line-clamp-4 whitespace-pre-wrap">{card.body}</p>
        ) : null}
        {card.type === "aiCallout" ? (
          <p className="line-clamp-4">{card.summary}</p>
        ) : null}
        {card.type === "chart" ? (
          <BoardChartCardHost
            card={card}
            chartId={`board-${card.id}`}
            mountLive={mountLiveChart}
          />
        ) : null}
        {card.type === "screener" ? <BoardScreenerCardHost card={card} /> : null}
        {card.type === "journalDraft" ? <BoardJournalDraftCardHost card={card} /> : null}
        {card.type === "deskLink" ? (
          <p>{card.label ?? "Desk workspace link"}</p>
        ) : null}
        {card.type === "researchRun" ? (
          <div className="space-y-1">
            <p className="line-clamp-3">{card.summary}</p>
            <p className="font-mono text-[10px] text-[var(--edge-text-tertiary)]">
              {card.jobId.slice(0, 12)} · {card.runFingerprint.slice(0, 12)}
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export { DEFAULT_WIDTH as BOARD_DEFAULT_CARD_WIDTH, DEFAULT_HEIGHT as BOARD_DEFAULT_CARD_HEIGHT };

export function boardCardCenter(card: ResearchCardSketch): { x: number; y: number } {
  const { width, height } = boardCardDimensions(card);
  const x = card.position?.x ?? 80;
  const y = card.position?.y ?? 80;
  return { x: x + width / 2, y: y + height / 2 };
}
