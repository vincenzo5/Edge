import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SidebarRail from './SidebarRail';

describe('SidebarRail', () => {
  it('renders the icon rail', () => {
    render(
      <SidebarRail
        theme="dark"
        activePanel={null}
        onTogglePanel={vi.fn()}
      />,
    );

    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail-object-tree')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail-watchlist')).toBeInTheDocument();
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
