import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SidebarRail from './SidebarRail';

describe('SidebarRail', () => {
  const onThemeChange = vi.fn();

  it('renders the icon rail in the specified order', () => {
    render(
      <SidebarRail
        theme="dark"
        activePanel={null}
        onTogglePanel={vi.fn()}
        onThemeChange={onThemeChange}
      />,
    );

    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail')).toHaveStyle({ width: '44px' });

    const orderedIds = [
      'watchlist',
      'options',
      'screener',
      'object-tree',
      'account',
      'settings',
    ];
    for (const id of orderedIds) {
      expect(screen.getByTestId(`sidebar-rail-${id}`)).toBeInTheDocument();
    }

    expect(screen.getByTestId('sidebar-rail-theme-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail-theme-toggle').compareDocumentPosition(
      screen.getByTestId('sidebar-rail-settings'),
    )).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    expect(screen.getByTestId('sidebar-rail-watchlist').compareDocumentPosition(
      screen.getByTestId('sidebar-rail-options'),
    )).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByTestId('sidebar-rail-options').compareDocumentPosition(
      screen.getByTestId('sidebar-rail-screener'),
    )).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByTestId('sidebar-rail-screener').compareDocumentPosition(
      screen.getByTestId('sidebar-rail-object-tree'),
    )).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByTestId('sidebar-rail-object-tree').compareDocumentPosition(
      screen.getByTestId('sidebar-rail-account'),
    )).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByTestId('sidebar-rail-account').compareDocumentPosition(
      screen.getByTestId('sidebar-rail-settings'),
    )).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('opens the object tree panel when rail icon is clicked', () => {
    const onTogglePanel = vi.fn();

    render(
      <SidebarRail
        theme="dark"
        activePanel={null}
        onTogglePanel={onTogglePanel}
        onThemeChange={onThemeChange}
      />,
    );

    fireEvent.click(screen.getByTestId('sidebar-rail-object-tree'));
    expect(onTogglePanel).toHaveBeenCalledWith('object-tree');
  });

  it('toggles theme from the footer rail button', () => {
    onThemeChange.mockClear();

    render(
      <SidebarRail
        theme="dark"
        activePanel={null}
        onTogglePanel={vi.fn()}
        onThemeChange={onThemeChange}
      />,
    );

    fireEvent.click(screen.getByTestId('sidebar-rail-theme-toggle'));
    expect(onThemeChange).toHaveBeenCalledWith('light');
  });
});
