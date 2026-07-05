import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createDefaultWorkspaceTabs, createTab } from '@/lib/app/workspaceTabs';
import * as lastModule from '@/lib/app/lastModule';
import WorkspaceTabBar from './WorkspaceTabBar';

vi.mock('../MarketDataProvider', () => ({
  useMarketDataQuotesForSymbols: () => ({ quotes: [], loading: false, error: null }),
}));

describe('WorkspaceTabBar', () => {
  beforeEach(() => {
    vi.spyOn(lastModule, 'recordLastModule').mockImplementation(() => {});
  });

  it('renders home link, tabs, and create button', () => {
    render(
      <WorkspaceTabBar
        workspaceTabs={createDefaultWorkspaceTabs()}
        onTabSelect={vi.fn()}
        onTabCreate={vi.fn()}
        onTabClose={vi.fn()}
      />,
    );

    expect(screen.getByTestId('workspace-tab-home')).toHaveAttribute('href', '/home');
    expect(screen.getByRole('tablist', { name: 'Workspace tabs' })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-tab-create')).toBeInTheDocument();
  });

  it('records home module when home link is clicked', () => {
    render(
      <WorkspaceTabBar
        workspaceTabs={createDefaultWorkspaceTabs()}
        onTabSelect={vi.fn()}
        onTabCreate={vi.fn()}
        onTabClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('workspace-tab-home'));
    expect(lastModule.recordLastModule).toHaveBeenCalledWith('home');
  });

  it('selects tab and creates a new tab', () => {
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
});
