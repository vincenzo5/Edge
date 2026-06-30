/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SidebarPanelShell from './SidebarPanelShell';

describe('SidebarPanelShell', () => {
  it('renders inline panel without backdrop', () => {
    render(
      <SidebarPanelShell panelId="watchlist" mode="inline" width={320}>
        <div>Panel content</div>
      </SidebarPanelShell>,
    );

    expect(screen.getByTestId('sidebar-panel')).toHaveAttribute('data-sidebar-mode', 'inline');
    expect(screen.getByTestId('sidebar-panel')).toHaveStyle({ width: '320px' });
    expect(screen.queryByTestId('sidebar-overlay-backdrop')).toBeNull();
    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });

  it('renders overlay panel with backdrop and closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <SidebarPanelShell panelId="watchlist" mode="overlay" width={320} onClose={onClose}>
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

  it('renders resize handle and calls onWidthChange from keyboard', () => {
    const onWidthChange = vi.fn();
    render(
      <SidebarPanelShell
        panelId="watchlist"
        mode="inline"
        width={300}
        onWidthChange={onWidthChange}
      >
        <div>Panel content</div>
      </SidebarPanelShell>,
    );

    const handle = screen.getByTestId('sidebar-resize-handle');
    expect(handle).toBeInTheDocument();
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(onWidthChange).toHaveBeenCalledWith(316);
  });

  it('previews width immediately during pointer drag and commits once on pointerup', () => {
    const onWidthChange = vi.fn();

    render(
      <SidebarPanelShell
        panelId="watchlist"
        mode="inline"
        width={300}
        onWidthChange={onWidthChange}
      >
        <div>Panel content</div>
      </SidebarPanelShell>,
    );

    const handle = screen.getByTestId('sidebar-resize-handle');
    const panel = screen.getByTestId('sidebar-panel');

    fireEvent.pointerDown(handle, { button: 0, clientX: 300, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 280, pointerId: 1 });

    expect(panel).toHaveStyle({ width: '320px' });
    expect(onWidthChange).not.toHaveBeenCalled();

    fireEvent.pointerUp(handle, { clientX: 280, pointerId: 1 });

    expect(onWidthChange).toHaveBeenCalledTimes(1);
    expect(onWidthChange).toHaveBeenCalledWith(320);
  });
});
