"use client";

import Link from "next/link";
import { useVirtualizer, observeElementOffset, type Virtualizer } from "@tanstack/react-virtual";
import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { EdgeButton, EdgeEmptyState } from "@/app/components/design-system";
import { useValueFlash } from "@/lib/design-system/useValueFlash";
import {
  JOURNAL_FILTERED_EMPTY_MESSAGE,
  JOURNAL_GLOBAL_EMPTY_MESSAGE,
  JOURNAL_LIST_CARD_EMPTY_MESSAGES,
} from "@/lib/journal/journalEmptyCopy";
import type { JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import { buildChartDeepLink } from "@/lib/journal/chartDeepLink";
import { computeRMultiple } from "@/lib/journal/rMultiple";
import {
  deriveTradeOutcomeStatus,
  formatTradeMoney,
  formatTradePrice,
  pnlToneClass,
} from "@/lib/journal/journalTradeDisplay";
import {
  JOURNAL_TRADES_HEADER_DRAG_HOLD_MS,
  resolveHeaderDropIndex,
  shouldActivateHeaderDrag,
} from "@/lib/journal/journalTradesColumnHeaderDrag";
import {
  reorderJournalTradesVisibleColumns,
  resolveOrderedVisibleColumnDefs,
  sortIndicator,
  sortAriaValue,
  toggleJournalTradesTableSort,
  type JournalTradesTableColumnDef,
  type JournalTradesTableColumnId,
  type JournalTradesTableSort,
} from "@/lib/journal/journalTradesTableControls";
import JournalTradeStatusBadge from "@/app/components/journal/JournalTradeStatusBadge";

export type JournalTradesTableEmptyVariant = "none" | "no-trades" | "filtered" | "no-open";

type Props = {
  trades: JournalTradeResponse[];
  selectedTradeId: string | null;
  onSelectTrade: (tradeId: string) => void;
  sort: JournalTradesTableSort;
  onSortChange: (sort: JournalTradesTableSort) => void;
  visibleColumns: JournalTradesTableColumnId[];
  columnOrder: JournalTradesTableColumnId[];
  onColumnOrderChange: (order: JournalTradesTableColumnId[]) => void;
  emptyVariant: JournalTradesTableEmptyVariant;
  onClearFilters?: () => void;
  openPositionsMode?: boolean;
  liveUnrealizedByTradeId?: Readonly<Record<string, number | null>>;
};

const ROW_TEXT_CLASS = "text-xs";
const CELL_CLASS = "px-3 py-2";
const ESTIMATED_ROW_HEIGHT = 37;
const VIRTUAL_OVERSCAN = 8;

function observeJournalTradesScrollRect<T extends Element>(
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

function capturePointerTarget(target: HTMLElement, pointerId: number): void {
  if (typeof target.setPointerCapture === "function") {
    target.setPointerCapture(pointerId);
  }
}

function releasePointerTarget(target: HTMLElement, pointerId: number): void {
  if (
    typeof target.hasPointerCapture === "function" &&
    typeof target.releasePointerCapture === "function" &&
    target.hasPointerCapture(pointerId)
  ) {
    target.releasePointerCapture(pointerId);
  }
}

type DragSession = {
  columnId: JournalTradesTableColumnId;
  fromIndex: number;
  startX: number;
  startY: number;
  startedAt: number;
  active: boolean;
  dropIndex: number;
  pointerId: number;
};

type DragVisualState = {
  fromIndex: number;
  dropIndex: number;
  pointerX: number;
  ghostTop: number;
  ghostWidth: number;
  ghostHeight: number;
  label: string;
};

function insertionMarkerX(
  dropIndex: number,
  fromIndex: number,
  headerRefs: Array<HTMLTableCellElement | null>,
): number | null {
  const dropEl = headerRefs[dropIndex];
  if (!dropEl) return null;
  const rect = dropEl.getBoundingClientRect();
  if (dropIndex === fromIndex) return rect.left;
  return dropIndex > fromIndex ? rect.right : rect.left;
}

function resolveTradeNetPnL(
  trade: JournalTradeResponse,
  openPositionsMode: boolean,
  liveUnrealizedByTradeId: Readonly<Record<string, number | null>> | undefined,
): number | null {
  if (openPositionsMode && trade.status === "open") {
    return liveUnrealizedByTradeId?.[trade.id] ?? null;
  }
  return trade.netPnL ?? null;
}

function TradeNetPnLCell({
  trade,
  openPositionsMode,
  liveUnrealizedByTradeId,
}: {
  trade: JournalTradeResponse;
  openPositionsMode: boolean;
  liveUnrealizedByTradeId: Readonly<Record<string, number | null>> | undefined;
}) {
  const value = resolveTradeNetPnL(trade, openPositionsMode, liveUnrealizedByTradeId);
  const flash = useValueFlash(openPositionsMode && trade.status === "open" ? value : null);
  const toneClass =
    openPositionsMode && trade.status === "open"
      ? flash.toneClass || pnlToneClass(value)
      : pnlToneClass(value);

  return (
    <span
      data-testid={`journal-trades-pnl-${trade.id}`}
      data-flash={openPositionsMode && trade.status === "open" ? flash.flash : undefined}
      className={
        openPositionsMode && trade.status === "open"
          ? `transition-colors duration-[2000ms] motion-reduce:transition-none ${toneClass}`
          : toneClass
      }
    >
      {formatTradeMoney(value)}
    </span>
  );
}

function renderTradeCell(
  trade: JournalTradeResponse,
  columnId: JournalTradesTableColumnId,
  openPositionsMode: boolean,
  liveUnrealizedByTradeId: Readonly<Record<string, number | null>> | undefined,
) {
  switch (columnId) {
    case "openDate":
      return trade.openedAt.slice(0, 10);
    case "symbol":
      return (
        <span className="inline-flex items-center gap-1.5">
          {trade.symbol}
          {trade.ignored ? (
            <span
              data-testid={`journal-trade-ignored-badge-${trade.id}`}
              className="rounded border border-[var(--edge-border-subtle)] px-1 py-0.5 text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]"
            >
              Ignored
            </span>
          ) : null}
        </span>
      );
    case "status":
      return <JournalTradeStatusBadge status={deriveTradeOutcomeStatus(trade)} />;
    case "closeDate":
      return trade.closedAt?.slice(0, 10) ?? "—";
    case "entry":
      return formatTradePrice(trade.avgEntry);
    case "exit":
      return formatTradePrice(trade.avgExit);
    case "r": {
      const r = computeRMultiple(trade);
      return r != null ? `${r.toFixed(2)}R` : "—";
    }
    case "setup":
      return trade.setup ?? "—";
    case "tags":
      return (trade.tags ?? []).join(", ") || "—";
    case "netPnL":
      return (
        <TradeNetPnLCell
          trade={trade}
          openPositionsMode={openPositionsMode}
          liveUnrealizedByTradeId={liveUnrealizedByTradeId}
        />
      );
    case "direction":
      return trade.direction;
    case "secType":
      return trade.secType;
    case "activity":
      return (trade.closedAt ?? trade.openedAt).slice(0, 10);
    case "chart":
      return (
        <Link
          href={buildChartDeepLink(trade)}
          data-testid={`journal-trades-chart-${trade.id}`}
          className="text-[var(--edge-accent-blue)] hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          Open
        </Link>
      );
    default:
      return "—";
  }
}

function cellClassName(
  columnId: JournalTradesTableColumnId,
  trade: JournalTradeResponse,
  openPositionsMode: boolean,
  liveUnrealizedByTradeId: Readonly<Record<string, number | null>> | undefined,
): string {
  const classes = [CELL_CLASS];
  if (columnId === "symbol") classes.push("font-medium");
  if (columnId === "setup" || columnId === "direction") classes.push("capitalize");
  if (columnId === "netPnL") {
    if (openPositionsMode && trade.status === "open") {
      return classes.join(" ");
    }
    classes.push(pnlToneClass(resolveTradeNetPnL(trade, openPositionsMode, liveUnrealizedByTradeId)));
  }
  return classes.join(" ");
}

function renderHeaderLabel(column: JournalTradesTableColumnDef, sort: JournalTradesTableSort) {
  if (column.sortable && column.sortKey) {
    return (
      <>
        <span>{column.label}</span>
        <span aria-hidden className="text-[10px] opacity-70">
          {sortIndicator(sort, column.id)}
        </span>
      </>
    );
  }
  return column.label;
}

export default function JournalTradesTable({
  trades,
  selectedTradeId,
  onSelectTrade,
  sort,
  onSortChange,
  visibleColumns,
  columnOrder,
  onColumnOrderChange,
  emptyVariant,
  onClearFilters,
  openPositionsMode = false,
  liveUnrealizedByTradeId,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRefs = useRef<Array<HTMLTableCellElement | null>>([]);
  const holdTimerRef = useRef<number | null>(null);
  const sessionRef = useRef<DragSession | null>(null);
  const [dragVisual, setDragVisual] = useState<DragVisualState | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: trades.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN,
    getItemKey: (index) => trades[index]?.id ?? index,
    observeElementRect: observeJournalTradesScrollRect,
    observeElementOffset,
  });

  useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, trades.length, visibleColumns.length, columnOrder.length]);

  const virtualRows = rowVirtualizer.getVirtualItems();
  const isVirtualized = virtualRows.length > 0;
  const paddingTop = isVirtualized && virtualRows.length > 0 ? virtualRows[0]!.start : 0;
  const paddingBottom =
    isVirtualized && virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1]!.end
      : 0;

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const resetDragSession = useCallback(() => {
    clearHoldTimer();
    sessionRef.current = null;
    setDragVisual(null);
  }, [clearHoldTimer]);

  const getDraggableHeaderMetrics = useCallback((headerColumns: JournalTradesTableColumnDef[]) => {
    return headerColumns
      .map((column, index) => {
        if (column.id === "chart") return null;
        const element = headerRefs.current[index];
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { index, left: rect.left, width: rect.width };
      })
      .filter((entry): entry is { index: number; left: number; width: number } => entry != null);
  }, []);

  const updateDropIndex = useCallback(
    (clientX: number, headerColumns: JournalTradesTableColumnDef[]) => {
      const session = sessionRef.current;
      if (!session?.active) return;
      const metrics = getDraggableHeaderMetrics(headerColumns);
      const dropIndex = resolveHeaderDropIndex(
        clientX,
        metrics.map((entry) => ({ left: entry.left, width: entry.width })),
      );
      const mappedDropIndex = metrics[dropIndex]?.index ?? session.fromIndex;
      session.dropIndex = mappedDropIndex;
      setDragVisual((prev) =>
        prev
          ? {
              ...prev,
              pointerX: clientX,
              dropIndex: mappedDropIndex,
            }
          : null,
      );
    },
    [getDraggableHeaderMetrics],
  );

  const activateDrag = useCallback(
    (headerColumns: JournalTradesTableColumnDef[], pointerX: number) => {
      const session = sessionRef.current;
      if (!session || session.active) return;
      session.active = true;
      session.dropIndex = session.fromIndex;

      const headerEl = headerRefs.current[session.fromIndex];
      const rect = headerEl?.getBoundingClientRect();
      const column = headerColumns[session.fromIndex];

      setDragVisual({
        fromIndex: session.fromIndex,
        dropIndex: session.fromIndex,
        pointerX,
        ghostTop: rect?.top ?? 0,
        ghostWidth: rect?.width ?? 96,
        ghostHeight: rect?.height ?? 32,
        label: column?.label ?? "",
      });
      updateDropIndex(pointerX, headerColumns);
    },
    [updateDropIndex],
  );

  if (emptyVariant === "no-trades") {
    return (
      <div data-testid="journal-trades-empty">
        <EdgeEmptyState message={JOURNAL_GLOBAL_EMPTY_MESSAGE} />
      </div>
    );
  }

  if (emptyVariant === "no-open") {
    return (
      <div data-testid="journal-open-positions-empty">
        <EdgeEmptyState message={JOURNAL_LIST_CARD_EMPTY_MESSAGES.open} />
      </div>
    );
  }

  if (emptyVariant === "filtered") {
    return (
      <div data-testid="journal-trades-filtered-empty">
        <EdgeEmptyState
          message={JOURNAL_FILTERED_EMPTY_MESSAGE}
          action={
            onClearFilters ? (
              <EdgeButton variant="chrome" onClick={onClearFilters}>
                Clear filters
              </EdgeButton>
            ) : undefined
          }
        />
      </div>
    );
  }

  const headerColumns = resolveOrderedVisibleColumnDefs(columnOrder, visibleColumns);

  const handleHeaderPointerDown = (
    event: ReactPointerEvent<HTMLTableCellElement>,
    column: JournalTradesTableColumnDef,
    index: number,
  ) => {
    if (column.id === "chart") return;
    if (event.button !== 0) return;

    clearHoldTimer();
    sessionRef.current = {
      columnId: column.id,
      fromIndex: index,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: performance.now(),
      active: false,
      dropIndex: index,
      pointerId: event.pointerId,
    };
    capturePointerTarget(event.currentTarget, event.pointerId);

    holdTimerRef.current = window.setTimeout(() => {
      activateDrag(headerColumns, sessionRef.current?.startX ?? 0);
    }, JOURNAL_TRADES_HEADER_DRAG_HOLD_MS);
  };

  const handleHeaderPointerMove = (event: ReactPointerEvent<HTMLTableCellElement>) => {
    const session = sessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - session.startX;
    const deltaY = event.clientY - session.startY;
    if (
      !session.active &&
      shouldActivateHeaderDrag(deltaX, deltaY, performance.now() - session.startedAt)
    ) {
      clearHoldTimer();
      activateDrag(headerColumns, event.clientX);
    }
    if (session.active) {
      event.preventDefault();
      updateDropIndex(event.clientX, headerColumns);
    }
  };

  const handleHeaderPointerUp = (
    event: ReactPointerEvent<HTMLTableCellElement>,
    column: JournalTradesTableColumnDef,
  ) => {
    const session = sessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    clearHoldTimer();
    releasePointerTarget(event.currentTarget, event.pointerId);

    if (session.active) {
      if (session.fromIndex !== session.dropIndex) {
        onColumnOrderChange(
          reorderJournalTradesVisibleColumns(
            columnOrder,
            visibleColumns,
            session.fromIndex,
            session.dropIndex,
          ),
        );
      }
      resetDragSession();
      return;
    }

    resetDragSession();
    if (column.sortable && column.sortKey) {
      const next = toggleJournalTradesTableSort(sort, column.id);
      if (next) onSortChange(next);
    }
  };

  const handleHeaderPointerCancel = (event: ReactPointerEvent<HTMLTableCellElement>) => {
    if (sessionRef.current?.pointerId !== event.pointerId) return;
    releasePointerTarget(event.currentTarget, event.pointerId);
    resetDragSession();
  };

  const markerX =
    dragVisual != null
      ? insertionMarkerX(dragVisual.dropIndex, dragVisual.fromIndex, headerRefs.current)
      : null;

  function renderTradeRow(trade: JournalTradeResponse, rowIndex: number, measureRef?: (node: Element | null) => void) {
    return (
      <tr
        key={trade.id}
        ref={measureRef}
        data-index={rowIndex}
        data-testid={`journal-trades-row-${trade.id}`}
        className={`cursor-pointer border-t border-[var(--edge-border-subtle)] hover:bg-[var(--edge-surface-panel)] ${
          selectedTradeId === trade.id ? "bg-[var(--edge-surface-panel)]" : ""
        }`}
        onClick={() => onSelectTrade(trade.id)}
      >
        {headerColumns.map((column) => (
          <td
            key={column.id}
            className={cellClassName(
              column.id,
              trade,
              openPositionsMode,
              liveUnrealizedByTradeId,
            )}
          >
            {renderTradeCell(trade, column.id, openPositionsMode, liveUnrealizedByTradeId)}
          </td>
        ))}
      </tr>
    );
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded border border-[var(--edge-border)]"
        data-testid="journal-trades-table"
      >
        <table className={`min-w-full text-left ${ROW_TEXT_CLASS}`}>
          <thead className="sticky top-0 z-10 bg-[var(--edge-surface-panel)] text-[var(--edge-text-secondary)]">
            <tr>
              {headerColumns.map((column, index) => {
                const isDragging = dragVisual?.fromIndex === index;
                const isDropTarget =
                  dragVisual != null &&
                  dragVisual.dropIndex === index &&
                  dragVisual.fromIndex !== index;
                const draggable = column.id !== "chart";
                const sortable = Boolean(column.sortable && column.sortKey);

                return (
                  <th
                    key={column.id}
                    ref={(element) => {
                      headerRefs.current[index] = element;
                    }}
                    data-testid={`journal-trades-header-${column.id}`}
                    aria-sort={sortable ? sortAriaValue(sort, column.id) : undefined}
                    className={`${CELL_CLASS} select-none ${
                      isDragging
                        ? "border border-dashed border-[var(--edge-accent-blue)] bg-[var(--edge-surface-panel)]/40 text-transparent"
                        : draggable
                          ? "cursor-grab"
                          : ""
                    } ${isDropTarget ? "bg-[var(--edge-surface-elevated)]/60" : ""}`}
                    style={isDragging ? { touchAction: "none" } : undefined}
                    onPointerDown={
                      draggable
                        ? (event) => handleHeaderPointerDown(event, column, index)
                        : undefined
                    }
                    onPointerMove={draggable ? handleHeaderPointerMove : undefined}
                    onPointerUp={
                      draggable ? (event) => handleHeaderPointerUp(event, column) : undefined
                    }
                    onPointerCancel={draggable ? handleHeaderPointerCancel : undefined}
                  >
                    <span
                      className={`inline-flex items-center gap-1 ${
                        sortable ? "hover:text-[var(--edge-text-primary)]" : ""
                      }`}
                      data-testid={sortable ? `journal-trades-sort-${column.id}` : undefined}
                    >
                      {renderHeaderLabel(column, sort)}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isVirtualized && paddingTop > 0 ? (
              <tr aria-hidden="true">
                <td
                  colSpan={headerColumns.length}
                  style={{ height: paddingTop, padding: 0, border: 0 }}
                />
              </tr>
            ) : null}
            {isVirtualized
              ? virtualRows.map((virtualRow) =>
                  renderTradeRow(
                    trades[virtualRow.index]!,
                    virtualRow.index,
                    rowVirtualizer.measureElement,
                  ),
                )
              : trades.map((trade, index) => renderTradeRow(trade, index))}
            {isVirtualized && paddingBottom > 0 ? (
              <tr aria-hidden="true">
                <td
                  colSpan={headerColumns.length}
                  style={{ height: paddingBottom, padding: 0, border: 0 }}
                />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {dragVisual ? (
        <>
          {markerX != null ? (
            <div
              aria-hidden
              data-testid="journal-trades-column-drop-marker"
              className="pointer-events-none fixed z-[60] w-0.5 bg-[var(--edge-accent-blue)] shadow-[0_0_6px_var(--edge-accent-blue)]"
              style={{
                left: markerX,
                top: dragVisual.ghostTop,
                height: dragVisual.ghostHeight,
                transform: "translateX(-50%)",
              }}
            />
          ) : null}
          <div
            aria-hidden
            data-testid="journal-trades-column-drag-ghost"
            className="pointer-events-none fixed z-[70] flex items-center gap-1 rounded border border-[var(--edge-accent-blue)] bg-[var(--edge-surface-panel)] px-3 py-2 text-xs text-[var(--edge-text-primary)] shadow-lg ring-1 ring-[var(--edge-accent-blue)]/40"
            style={{
              left: dragVisual.pointerX,
              top: dragVisual.ghostTop,
              width: dragVisual.ghostWidth,
              minHeight: dragVisual.ghostHeight,
              transform: "translateX(-50%)",
            }}
          >
            <span className="font-medium">{dragVisual.label}</span>
          </div>
        </>
      ) : null}
    </>
  );
}
