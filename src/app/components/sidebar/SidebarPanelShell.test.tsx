/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SidebarPanelShell from './SidebarPanelShell';

describe('SidebarPanelShell', () => {
  it('renders inline panel without backdrop', () => {
    render(
      <SidebarPanelShell panelId="watchlist" mode="inline">
        <div>Panel content</div>
      </SidebarPanelShell>,
    );

    expect(screen.getByTestId('sidebar-panel')).toHaveAttribute('data-sidebar-mode', 'inline');
    expect(screen.queryByTestId('sidebar-overlay-backdrop')).toBeNull();
    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });

  it('renders overlay panel with backdrop and closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <SidebarPanelShell panelId="watchlist" mode="overlay" onClose={onClose}>
        <div>Panel content</div>
      </SidebarPanelShell>,
    );

    expect(screen.getByTestId('sidebar-panel')).toHaveAttribute('data-sidebar-mode', 'overlay');
    expect(screen.getByTestId('sidebar-overlay-backdrop')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('sidebar-overlay-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
