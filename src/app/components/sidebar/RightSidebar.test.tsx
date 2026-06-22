import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RightSidebar from './RightSidebar';

describe('RightSidebar', () => {
  it('renders the icon rail', () => {
    render(
      <RightSidebar
        theme="dark"
        activePanel={null}
        onTogglePanel={vi.fn()}
        onClosePanel={vi.fn()}
      />,
    );

    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail-object-tree')).toBeInTheDocument();
  });

  it('opens the object tree panel when rail icon is clicked', () => {
    const onTogglePanel = vi.fn();

    render(
      <RightSidebar
        theme="dark"
        activePanel={null}
        onTogglePanel={onTogglePanel}
        onClosePanel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('sidebar-rail-object-tree'));
    expect(onTogglePanel).toHaveBeenCalledWith('object-tree');
  });

  it('shows panel shell when a panel is active', () => {
    render(
      <RightSidebar
        theme="dark"
        activePanel="object-tree"
        onTogglePanel={vi.fn()}
        onClosePanel={vi.fn()}
      />,
    );

    expect(screen.getByTestId('sidebar-panel')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-panel-object-tree')).toBeInTheDocument();
    expect(screen.getByText('Object tree')).toBeInTheDocument();
  });

  it('closes panel when close button is clicked', () => {
    const onClosePanel = vi.fn();

    render(
      <RightSidebar
        theme="dark"
        activePanel="object-tree"
        onTogglePanel={vi.fn()}
        onClosePanel={onClosePanel}
      />,
    );

    fireEvent.click(screen.getByLabelText('Close panel'));
    expect(onClosePanel).toHaveBeenCalledOnce();
  });
});
