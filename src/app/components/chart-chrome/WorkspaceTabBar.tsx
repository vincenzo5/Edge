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

/** ~75% of chart header `h-9` (36px), with room for tab content to fill the track. */
const TAB_BAR_HEIGHT_CLASS = 'h-[27px]';

type ChangeTone = 'up' | 'down' | 'flat';

function formatPrice(value: number | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value.toFixed(2);
}

function formatChangePct(value: number | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function changeTone(value: number | null | undefined): ChangeTone | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'flat';
}

function toneClass(tone: ChangeTone): string {
  if (tone === 'up') return 'text-[var(--edge-positive)]';
  if (tone === 'down') return 'text-[var(--edge-negative)]';
  return 'text-[var(--edge-text-muted)]';
}

function symbolMonogram(symbol: string): string {
  const clean = symbol.replace(/[^A-Za-z0-9]/g, '');
  return (clean.slice(0, 2) || '?').toUpperCase();
}

function SymbolBadge({ symbol }: { symbol: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[var(--edge-surface-active)] text-[7px] font-bold leading-none text-[var(--edge-text-secondary)]"
    >
      {symbolMonogram(symbol)}
    </span>
  );
}

function ChangeDirection({ tone }: { tone: ChangeTone }) {
  if (tone === 'flat') return null;
  return (
    <span aria-hidden className={`inline-flex shrink-0 text-[8px] leading-none ${toneClass(tone)}`}>
      {tone === 'up' ? '▲' : '▼'}
    </span>
  );
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
      className={`flex ${TAB_BAR_HEIGHT_CLASS} shrink-0 items-stretch gap-px overflow-x-auto bg-[var(--edge-surface-active)] pr-1`}
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
        const tone = changeTone(quote?.regularMarketChangePercent);

        return (
          <div
            key={tab.id}
            className={`group relative flex min-w-0 max-w-[280px] shrink-0 items-stretch rounded-t-[var(--edge-radius-sm)] transition-colors ${
              selected
                ? 'z-10 bg-[var(--edge-surface-toolbar)]'
                : 'bg-transparent hover:bg-[var(--edge-surface-hover)]'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              data-testid={`workspace-tab-${tab.id}`}
              className="edge-focus-ring flex min-w-0 flex-1 items-center gap-1 px-2 text-left"
              onClick={() => onTabSelect(tab.id)}
            >
              <SymbolBadge symbol={symbol} />
              <span
                className={`shrink-0 text-[11px] font-semibold leading-none ${
                  selected
                    ? 'text-[var(--edge-text-strong)]'
                    : 'text-[var(--edge-text-secondary)]'
                }`}
              >
                {symbol}
              </span>
              {tone ? <ChangeDirection tone={tone} /> : null}
              {price ? (
                <span
                  className={`shrink-0 text-[11px] tabular-nums leading-none ${
                    selected
                      ? 'text-[var(--edge-text-strong)]'
                      : 'text-[var(--edge-text-primary)]'
                  }`}
                >
                  {price}
                </span>
              ) : null}
              {changePct && tone ? (
                <span className={`shrink-0 text-[11px] tabular-nums leading-none ${toneClass(tone)}`}>
                  {changePct}
                </span>
              ) : null}
              <span
                className={`min-w-0 truncate text-[11px] leading-none ${
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
                className="edge-focus-ring mr-0.5 hidden shrink-0 self-center rounded-[var(--edge-radius-sm)] px-1 text-[11px] leading-none text-[var(--edge-text-muted)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)] group-hover:inline-flex"
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
        className="edge-focus-ring inline-flex shrink-0 items-center self-stretch rounded-t-[var(--edge-radius-sm)] px-2 text-sm leading-none text-[var(--edge-text-muted)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-strong)]"
        onClick={onTabCreate}
      >
        +
      </button>
    </div>
  );
}
