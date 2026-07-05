'use client';

import { useMemo } from 'react';
import { getTabPrimarySymbol, type WorkspaceTabsState } from '@/lib/app/workspaceTabs';
import { useMarketDataQuotesForSymbols } from '../MarketDataProvider';

type Props = {
  workspaceTabs: WorkspaceTabsState;
  onTabSelect: (tabId: string) => void;
  onTabCreate: () => void;
  onTabClose: (tabId: string) => void;
};

function formatPrice(value: number | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value.toFixed(2);
}

function formatChangePct(value: number | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export default function WorkspaceTabBar({
  workspaceTabs,
  onTabSelect,
  onTabCreate,
  onTabClose,
}: Props) {
  const symbols = useMemo(
    () => workspaceTabs.tabs.map((tab) => getTabPrimarySymbol(tab)),
    [workspaceTabs.tabs],
  );
  const { quotes } = useMarketDataQuotesForSymbols(symbols);
  const quotesBySymbol = useMemo(() => {
    const map = new Map<string, (typeof quotes)[number]>();
    for (const quote of quotes) {
      map.set(quote.symbol.toUpperCase(), quote);
    }
    return map;
  }, [quotes]);

  const canClose = workspaceTabs.tabs.length > 1;

  return (
    <div
      className="flex h-8 shrink-0 items-end gap-0.5 overflow-x-auto bg-[var(--edge-surface-active)] px-1"
      role="tablist"
      aria-label="Workspace tabs"
      data-testid="workspace-tab-bar"
    >
      {workspaceTabs.tabs.map((tab) => {
        const selected = tab.id === workspaceTabs.activeTabId;
        const symbol = getTabPrimarySymbol(tab);
        const quote = quotesBySymbol.get(symbol.toUpperCase());
        const price = formatPrice(quote?.regularMarketPrice ?? undefined);
        const changePct = formatChangePct(quote?.regularMarketChangePercent ?? undefined);
        const changeUp = (quote?.regularMarketChangePercent ?? 0) >= 0;

        return (
          <div
            key={tab.id}
            className={`group relative flex min-w-0 max-w-[220px] shrink-0 items-center rounded-t-[var(--edge-radius-sm)] transition-colors ${
              selected
                ? 'z-10 h-8 bg-[var(--edge-surface-toolbar)]'
                : 'mb-0.5 h-7 bg-transparent hover:bg-[var(--edge-surface-hover)]'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              data-testid={`workspace-tab-${tab.id}`}
              className="edge-focus-ring flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1 text-left"
              onClick={() => onTabSelect(tab.id)}
            >
              <span
                className={`truncate text-xs font-semibold ${
                  selected
                    ? 'text-[var(--edge-text-strong)]'
                    : 'text-[var(--edge-text-secondary)]'
                }`}
              >
                {symbol}
              </span>
              {price ? (
                <span
                  className={`truncate text-[11px] tabular-nums ${
                    changeUp ? 'text-[var(--edge-positive)]' : 'text-[var(--edge-negative)]'
                  }`}
                >
                  {price}
                  {changePct ? ` ${changePct}` : ''}
                </span>
              ) : null}
              <span
                className={`truncate text-[11px] ${
                  selected
                    ? 'text-[var(--edge-text-muted)]'
                    : 'text-[var(--edge-text-muted)]/80'
                }`}
              >
                / {tab.title}
              </span>
            </button>
            {canClose ? (
              <button
                type="button"
                aria-label={`Close ${tab.title}`}
                data-testid={`workspace-tab-close-${tab.id}`}
                className="edge-focus-ring mr-1 hidden rounded-[var(--edge-radius-sm)] px-1 text-[var(--edge-text-muted)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)] group-hover:inline-flex"
                onClick={(event) => {
                  event.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                ×
              </button>
            ) : null}
          </div>
        );
      })}
      <button
        type="button"
        aria-label="New workspace tab"
        data-testid="workspace-tab-create"
        className="edge-focus-ring mb-0.5 inline-flex shrink-0 items-center rounded-[var(--edge-radius-sm)] px-2 py-1 text-sm text-[var(--edge-text-muted)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)]"
        onClick={onTabCreate}
      >
        +
      </button>
    </div>
  );
}
