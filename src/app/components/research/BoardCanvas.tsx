"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { shouldMountBoardChart } from "@/lib/research/boardChartMountPolicy";
import {
  getBoardFocusedCardId,
  setBoardFocusedCardId,
  subscribeBoardFocus,
} from "@/lib/research/boardFocusStore";
import type { ResearchCardSketch, ResearchLinkSketch } from "@/lib/research/sessionSketch";

import BoardCardNode from "./BoardCardNode";
import BoardLinksLayer from "./BoardLinksLayer";
import BoardEmptyState from "./BoardEmptyState";

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.08;

type Props = {
  cards: ResearchCardSketch[];
  links: ResearchLinkSketch[];
  evidenceCount?: number;
  onMoveCard: (
    cardId: string,
    position: { x: number; y: number; width?: number; height?: number },
  ) => void;
  onRemoveCard: (cardId: string) => void;
  onLinkCards: (fromCardId: string, toCardId: string) => void;
  onRemoveLink: (linkId: string) => void;
  onImportEvidence: () => void;
  onPromoteCard: (cardId: string) => void;
};

type DragMode =
  | { kind: "pan"; startX: number; startY: number; originX: number; originY: number }
  | {
      kind: "card";
      cardId: string;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    };

export default function BoardCanvas({
  cards,
  links,
  evidenceCount = 0,
  onMoveCard,
  onRemoveCard,
  onLinkCards,
  onRemoveLink,
  onImportEvidence,
  onPromoteCard,
}: Props) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const focusedCardId = useSyncExternalStore(
    subscribeBoardFocus,
    getBoardFocusedCardId,
    () => null,
  );
  const [visibleCardIds, setVisibleCardIds] = useState<Set<string>>(() => new Set());
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const dragRef = useRef<DragMode | null>(null);

  const handleSelectCard = useCallback(
    (cardId: string, shiftKey: boolean) => {
      setSelectedLinkId(null);
      if (shiftKey && linkSourceId && linkSourceId !== cardId) {
        onLinkCards(linkSourceId, cardId);
        setLinkSourceId(null);
        setSelectedCardId(cardId);
        setBoardFocusedCardId(cardId);
        return;
      }
      if (shiftKey) {
        setLinkSourceId(cardId);
        setSelectedCardId(cardId);
        setBoardFocusedCardId(cardId);
        return;
      }
      setLinkSourceId(null);
      setSelectedCardId(cardId);
      setBoardFocusedCardId(cardId);
    },
    [linkSourceId, onLinkCards],
  );

  const updateVisibleCards = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const viewportRect = viewport.getBoundingClientRect();
    const next = new Set<string>();
    for (const [cardId, element] of cardRefs.current.entries()) {
      const rect = element.getBoundingClientRect();
      const intersects =
        rect.right >= viewportRect.left &&
        rect.left <= viewportRect.right &&
        rect.bottom >= viewportRect.top &&
        rect.top <= viewportRect.bottom;
      if (intersects) next.add(cardId);
    }
    setVisibleCardIds(next);
  }, []);

  useEffect(() => {
    updateVisibleCards();
  }, [cards, pan, zoom, updateVisibleCards]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      () => {
        updateVisibleCards();
      },
      { root: viewport, threshold: 0.08 },
    );

    for (const element of cardRefs.current.values()) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [cards, updateVisibleCards]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = (event.clientX - drag.startX) / zoom;
      const dy = (event.clientY - drag.startY) / zoom;

      if (drag.kind === "pan") {
        setPan({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY });
        return;
      }

      onMoveCard(drag.cardId, {
        x: drag.originX + dx,
        y: drag.originY + dy,
      });
    },
    [onMoveCard, zoom],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;

      if (selectedLinkId) {
        onRemoveLink(selectedLinkId);
        setSelectedLinkId(null);
        event.preventDefault();
        return;
      }
      if (selectedCardId) {
        onRemoveCard(selectedCardId);
        setSelectedCardId(null);
        setLinkSourceId(null);
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onRemoveCard, onRemoveLink, selectedCardId, selectedLinkId]);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;

    setZoom((currentZoom) => {
      const direction = event.deltaY > 0 ? -1 : 1;
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom + direction * ZOOM_STEP));
      const scale = nextZoom / currentZoom;

      setPan((currentPan) => ({
        x: cursorX - scale * (cursorX - currentPan.x),
        y: cursorY - scale * (cursorY - currentPan.y),
      }));

      return nextZoom;
    });
  }, []);

  const startPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      kind: "pan",
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
  };

  const startCardDrag = (cardId: string, event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const card = cards.find((entry) => entry.id === cardId);
    if (!card) return;
    dragRef.current = {
      kind: "card",
      cardId,
      startX: event.clientX,
      startY: event.clientY,
      originX: card.position?.x ?? 80,
      originY: card.position?.y ?? 80,
    };
  };

  if (cards.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <BoardEmptyState onImportEvidence={onImportEvidence} evidenceCount={evidenceCount} />
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      data-testid="research-board-canvas"
      className="relative min-h-0 flex-1 overflow-hidden bg-[var(--edge-surface-canvas)]"
      onWheel={handleWheel}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          setSelectedCardId(null);
          setBoardFocusedCardId(null);
          setSelectedLinkId(null);
          setLinkSourceId(null);
          startPan(event);
        }
      }}
    >
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <div
          ref={surfaceRef}
          className="relative h-[2400px] w-[3200px]"
          data-testid="research-board-surface"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedCardId(null);
              setBoardFocusedCardId(null);
              setSelectedLinkId(null);
              setLinkSourceId(null);
              startPan(event);
            }
          }}
        >
          <BoardLinksLayer
            cards={cards}
            links={links}
            selectedLinkId={selectedLinkId}
            onSelectLink={(linkId) => {
              setSelectedLinkId(linkId);
              setSelectedCardId(null);
              setLinkSourceId(null);
            }}
          />
          {cards.map((card) => (
            <div
              key={card.id}
              ref={(element) => {
                if (element) cardRefs.current.set(card.id, element);
                else cardRefs.current.delete(card.id);
              }}
            >
              <BoardCardNode
                card={card}
                selected={selectedCardId === card.id}
                linkSource={linkSourceId === card.id}
                mountLiveChart={
                  card.type === "chart" &&
                  shouldMountBoardChart(card.id, focusedCardId, visibleCardIds)
                }
                onSelect={handleSelectCard}
                onDragStart={startCardDrag}
                onOpen={(href) => router.push(href)}
                onPromote={onPromoteCard}
                onRemove={onRemoveCard}
              />
            </div>
          ))}
        </div>
      </div>
      {linkSourceId ? (
        <p
          data-testid="research-board-link-hint"
          className="pointer-events-none absolute bottom-3 left-3 rounded bg-[var(--edge-surface-toolbar)] px-2 py-1 text-xs text-[var(--edge-text-secondary)] shadow"
        >
          Shift+click another card to link
        </p>
      ) : null}
    </div>
  );
}
