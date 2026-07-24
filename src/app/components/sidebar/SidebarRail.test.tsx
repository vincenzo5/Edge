import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SidebarRail from './SidebarRail';

describe('SidebarRail', () => {
  it('renders the icon rail in the specified order without a theme toggle', () => {
    render(
      <SidebarRail
        theme="dark"
        activePanel={null}
        onTogglePanel={vi.fn()}
      />,
    );

    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail')).toHaveStyle({ width: '44px' });

    const orderedIds = [
      'watchlist',
      'options',
      'screener',
      'patterns',
      'object-tree',
      'trade',
      'account',
      'settings',
    ];
    for (const id of orderedIds) {
      expect(screen.getByTestId(`sidebar-rail-${id}`)).toBeInTheDocument();
    }

    expect(screen.queryByTestId('sidebar-rail-theme-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail-settings')).toHaveAttribute('aria-label', 'Risk calculator');
  });

  it('opens the object tree panel when rail icon is clicked', () => {
    const onTogglePanel = vi.fn();

    render(
      <SidebarRail
        theme="dark"
        activePanel={null}
        onTogglePanel={onTogglePanel}
      />,
    );

    fireEvent.click(screen.getByTestId('sidebar-rail-object-tree'));
    expect(onTogglePanel).toHaveBeenCalledWith('object-tree');
  });
});
