'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { IndicatorConfig } from '@/lib/chartConfig';
import { PRICE_PANE_KEY } from '@/lib/chartConfig';
import { indicatorKey, type IndicatorKey } from './EdgeChart';

/** Hover strip at the top of each pane — must not cover the plot (blocks canvas drag/zoom). */
const PANE_HEADER_HIT_HEIGHT = 28;

export type PaneRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type Props = {
  indicators: IndicatorConfig[];
  onRemove?: (name: string, pane: 'main' | 'sub') => void;
  onCollapse?: (key: IndicatorKey) => void;
  onMaximize?: (key: IndicatorKey) => void;
  onMoveUp?: (key: IndicatorKey) => void;
  onMoveDown?: (key: IndicatorKey) => void;
  collapsedKeys: Set<IndicatorKey>;
  maximizedKey: IndicatorKey | null;
  paneRects: Map<IndicatorKey, PaneRect>;
  lastPaneRects: Map<IndicatorKey, PaneRect>;
  paneOrder?: string[];
  subPaneKeys?: string[];
};

export default function PaneControls({
  indicators,
  onRemove,
  onCollapse,
  onMaximize,
  onMoveUp,
  onMoveDown,
  collapsedKeys,
  maximizedKey,
  paneRects,
  lastPaneRects,
  paneOrder,
  subPaneKeys,
}: Props) {
  const visibleIndicators = indicators.filter((i) => i.visible !== false);
  const mainPaneIndicators = visibleIndicators.filter((i) => i.pane === 'main');
  const subPaneIndicators = visibleIndicators.filter((i) => i.pane === 'sub');

  const order: string[] =
    paneOrder && paneOrder.length > 0
      ? [...paneOrder]
      : [PRICE_PANE_KEY, ...(subPaneKeys ?? subPaneIndicators.map((i) => indicatorKey(i)))];

  const getPos = (key: string) => {
    const idx = order.indexOf(key);
    return idx === -1 ? order.length : idx;
  };
  const orderLen = order.length;

  return (
    <>
      {subPaneIndicators.map((ind) => {
        const key = indicatorKey(ind);
        const rect = paneRects.get(key) || lastPaneRects.get(key);
        if (!rect) return null;
        const isCollapsed = collapsedKeys.has(key);
        const hitHeight = isCollapsed ? 24 : PANE_HEADER_HIT_HEIGHT;
        const hitAreaStyle: CSSProperties = {
          position: 'absolute',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: hitHeight,
          zIndex: 15,
          pointerEvents: 'auto',
        };
        const pos = getPos(key);
        return (
          <div key={`hit-${key}`} style={hitAreaStyle} className="group">
            <IndicatorControlRow
              name={ind.name}
              style={{ position: 'absolute', top: 4, right: 4 }}
              isSubPane
              isCollapsed={isCollapsed}
              isMaximized={maximizedKey === key}
              subCount={orderLen}
              index={pos}
              onRemove={() => onRemove?.(ind.name, 'sub')}
              onCollapse={() => onCollapse?.(key)}
              onMaximize={() => onMaximize?.(key)}
              onMoveUp={() => onMoveUp?.(key)}
              onMoveDown={() => onMoveDown?.(key)}
            />
          </div>
        );
      })}

      {(() => {
        const priceKey = PRICE_PANE_KEY as IndicatorKey;
        const rect = paneRects.get(priceKey) || lastPaneRects.get(priceKey);
        if (!rect) return null;
        const isCollapsed = collapsedKeys.has(priceKey);
        const hitHeight = isCollapsed ? 24 : PANE_HEADER_HIT_HEIGHT;
        const hitAreaStyle: CSSProperties = {
          position: 'absolute',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: hitHeight,
          zIndex: 15,
          pointerEvents: 'auto',
        };
        const pos = getPos(priceKey);
        return (
          <div key="hit-price" style={hitAreaStyle} className="group">
            <IndicatorControlRow
              name="PRICE"
              style={{ position: 'absolute', top: 4, right: 4 }}
              isSubPane={false}
              isCollapsed={isCollapsed}
              isMaximized={maximizedKey === priceKey}
              subCount={orderLen}
              index={pos}
              onRemove={() => {}}
              onCollapse={() => onCollapse?.(priceKey)}
              onMaximize={() => onMaximize?.(priceKey)}
              onMoveUp={() => onMoveUp?.(priceKey)}
              onMoveDown={() => onMoveDown?.(priceKey)}
            />
          </div>
        );
      })()}

      {mainPaneIndicators.map((ind, i) => {
        const key = indicatorKey(ind);
        const pos = getPos(key);
        return (
          <IndicatorControlRow
            key={`main-${key}`}
            name={ind.name}
            style={{ position: 'absolute', top: `${2 + i * 18}px`, right: 0 }}
            isSubPane={false}
            isCollapsed={false}
            isMaximized={false}
            subCount={orderLen}
            index={pos}
            onRemove={() => onRemove?.(ind.name, 'main')}
            onMoveUp={() => onMoveUp?.(key)}
            onMoveDown={() => onMoveDown?.(key)}
          />
        );
      })}
    </>
  );
}

function IndicatorControlRow({
  name,
  onRemove,
  onCollapse,
  onMaximize,
  onMoveUp,
  onMoveDown,
  style,
  isSubPane,
  isCollapsed,
  isMaximized,
  subCount,
  index,
}: {
  name: string;
  onRemove: () => void;
  onCollapse?: () => void;
  onMaximize?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  style?: CSSProperties;
  isSubPane: boolean;
  isCollapsed: boolean;
  isMaximized: boolean;
  subCount: number;
  index: number;
}) {
  return (
    <div
      style={{ ...style, zIndex: 20, pointerEvents: 'auto' }}
      className="flex items-center justify-end px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100"
    >
      <span className="inline-flex items-center gap-0.5 rounded border border-gray-200 bg-white/90 px-1 py-0.5 text-[10px] font-medium leading-none text-gray-700 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300">
        <span className="mr-0.5">{name}</span>

        {isSubPane && onCollapse && (
          <IconButton
            title={isCollapsed ? 'Uncollapse' : 'Collapse'}
            onClick={onCollapse}
            className="hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
          >
            {isCollapsed ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <rect x="2" y="4" width="6" height="1.5" rx="0.5" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <rect x="4" y="2" width="1.5" height="6" rx="0.5" />
                <rect x="2" y="4" width="6" height="1.5" rx="0.5" />
              </svg>
            )}
          </IconButton>
        )}

        {isSubPane && onMaximize && (
          <IconButton
            title={isMaximized ? 'Restore' : 'Maximize'}
            onClick={onMaximize}
            className="hover:bg-yellow-100 hover:text-yellow-700 dark:hover:bg-yellow-900/30 dark:hover:text-yellow-400"
          >
            {isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <rect x="2.5" y="2" width="5.5" height="6" rx="1" />
                <rect x="1.5" y="3" width="5.5" height="6" rx="1" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="1.5" y="1.5" width="7" height="7" rx="1" />
              </svg>
            )}
          </IconButton>
        )}

        {onMoveUp && (
          <IconButton
            title="Move up"
            onClick={onMoveUp}
            disabled={index === 0}
            className="hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300 disabled:opacity-30"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M5 2L2 6h6L5 2z" />
            </svg>
          </IconButton>
        )}

        {onMoveDown && (
          <IconButton
            title="Move down"
            onClick={onMoveDown}
            disabled={index === subCount - 1}
            className="hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300 disabled:opacity-30"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M5 8L2 4h6L5 8z" />
            </svg>
          </IconButton>
        )}

        <IconButton
          title={`Remove ${name}`}
          onClick={onRemove}
          className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
        >
          ×
        </IconButton>
      </span>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  className: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] leading-none transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
