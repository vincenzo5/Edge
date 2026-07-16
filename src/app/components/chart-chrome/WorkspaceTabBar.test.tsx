import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createDefaultWorkspaceTabs, createTab, getTabPrimarySymbol } from '@/lib/app/workspaceTabs';
import WorkspaceTabBar from './WorkspaceTabBar';

const quotesMock = vi.hoisted(() => ({
  quotes: [] as Array<{
    symbol: string;
    regularMarketPrice: number | null;
    regularMarketChangePercent: number | null;
  }>,
}));

vi.mock('../MarketDataProvider', () => ({
  useMarketDataQuotesForSymbols: () => ({
    quotes: quotesMock.quotes,
    loading: false,
    error: null,
  }),
}));

describe('WorkspaceTabBar', () => {
  it('renders tabs and create button', () => {
    quotesMock.quotes = [];
    render(
      <WorkspaceTabBar
        workspaceTabs={createDefaultWorkspaceTabs()}
        onTabSelect={vi.fn()}
        onTabCreate={vi.fn()}
        onTabClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('tablist', { name: 'Workspace tabs' })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-tab-create')).toBeInTheDocument();
  });

  it('selects tab and creates a new tab', () => {
    quotesMock.quotes = [];
    const onTabSelect = vi.fn();
    const onTabCreate = vi.fn();
    const tabs = createTab(createDefaultWorkspaceTabs(), { id: 'tab-2', title: 'Second' });

    render(
      <WorkspaceTabBar
        workspaceTabs={tabs}
        onTabSelect={onTabSelect}
        onTabCreate={onTabCreate}
        onTabClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId(`workspace-tab-${tabs.tabs[0]!.id}`));
    expect(onTabSelect).toHaveBeenCalledWith(tabs.tabs[0]!.id);

    fireEvent.click(screen.getByTestId('workspace-tab-create'));
    expect(onTabCreate).toHaveBeenCalled();
  });

  it('hides close control when only one tab remains', () => {
    quotesMock.quotes = [];
    render(
      <WorkspaceTabBar
        workspaceTabs={createDefaultWorkspaceTabs()}
        onTabSelect={vi.fn()}
        onTabCreate={vi.fn()}
        onTabClose={vi.fn()}
      />,
    );

    expect(screen.queryByTestId(/workspace-tab-close-/)).toBeNull();
  });

  it('renders TradingView-style quote strip: price, direction, and percent separately', () => {
    const tabs = createDefaultWorkspaceTabs();
    const symbol = getTabPrimarySymbol(tabs.tabs[0]!);
    quotesMock.quotes = [
      {
        symbol,
        regularMarketPrice: 178.44,
        regularMarketChangePercent: -1.72,
      },
    ];

    render(
      <WorkspaceTabBar
        workspaceTabs={tabs}
        onTabSelect={vi.fn()}
        onTabCreate={vi.fn()}
        onTabClose={vi.fn()}
      />,
    );

    const tab = screen.getByTestId(`workspace-tab-${tabs.activeTabId}`);
    expect(tab).toHaveTextContent(symbol);
    expect(tab).toHaveTextContent('178.44');
    expect(tab).toHaveTextContent('-1.72%');
    expect(tab).toHaveTextContent('▼');
    expect(tab).toHaveTextContent(`/ ${tabs.tabs[0]!.title}`);
  });

  it('color-codes flat percent as muted without a direction marker', () => {
    const tabs = createDefaultWorkspaceTabs();
    const symbol = getTabPrimarySymbol(tabs.tabs[0]!);
    quotesMock.quotes = [
      {
        symbol,
        regularMarketPrice: 10,
        regularMarketChangePercent: 0,
      },
    ];

    render(
      <WorkspaceTabBar
        workspaceTabs={tabs}
        onTabSelect={vi.fn()}
        onTabCreate={vi.fn()}
        onTabClose={vi.fn()}
      />,
    );

    const tab = screen.getByTestId(`workspace-tab-${tabs.activeTabId}`);
    expect(tab).toHaveTextContent('10.00');
    expect(tab).toHaveTextContent('0.00%');
    expect(tab).not.toHaveTextContent('▲');
    expect(tab).not.toHaveTextContent('▼');
  });
});
