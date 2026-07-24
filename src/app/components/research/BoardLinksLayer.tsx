"use client";

import type { ResearchCardSketch, ResearchLinkSketch } from "@/lib/research/sessionSketch";

import { boardCardCenter } from "./BoardCardNode";

type Props = {
  cards: ResearchCardSketch[];
  links: ResearchLinkSketch[];
  selectedLinkId: string | null;
  onSelectLink: (linkId: string) => void;
};

function linkPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const cx = from.x + dx * 0.4;
  const cy = from.y + dy * 0.15;
  const cx2 = from.x + dx * 0.6;
  const cy2 = to.y - dy * 0.15;
  return `M ${from.x} ${from.y} C ${cx} ${cy}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
}

export default function BoardLinksLayer({ cards, links, selectedLinkId, onSelectLink }: Props) {
  const cardById = new Map(cards.map((card) => [card.id, card]));

  return (
    <svg
      data-testid="research-board-links"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden
    >
      <defs>
        <marker
          id="research-board-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--edge-accent)" />
        </marker>
      </defs>
      {links.map((link) => {
        const fromCard = cardById.get(link.fromCardId);
        const toCard = cardById.get(link.toCardId);
        if (!fromCard || !toCard) return null;

        const from = boardCardCenter(fromCard);
        const to = boardCardCenter(toCard);
        const selected = selectedLinkId === link.id;

        return (
          <g key={link.id} className="pointer-events-auto">
            <path
              data-testid={`research-board-link-hit-${link.id}`}
              d={linkPath(from, to)}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              onClick={(event) => {
                event.stopPropagation();
                onSelectLink(link.id);
              }}
            />
            <path
              data-testid={`research-board-link-${link.id}`}
              d={linkPath(from, to)}
              fill="none"
              stroke={selected ? "var(--edge-accent)" : "var(--edge-border-strong)"}
              strokeWidth={selected ? 2.5 : 1.5}
              markerEnd="url(#research-board-arrow)"
            />
          </g>
        );
      })}
    </svg>
  );
}
