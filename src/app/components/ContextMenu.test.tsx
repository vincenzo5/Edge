import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContextMenu, { clampMenuPosition, resolveSubmenuPlacement } from './ContextMenu';

describe('clampMenuPosition', () => {
  it('keeps position when the menu fits in the viewport', () => {
    expect(clampMenuPosition({ x: 10, y: 10 }, 180, 100, 800, 600)).toEqual({
      x: 10,
      y: 10,
    });
  });

  it('clamps right and bottom overflow', () => {
    const pos = clampMenuPosition({ x: 750, y: 550 }, 180, 100, 800, 600);
    expect(pos.x).toBe(612);
    expect(pos.y).toBe(492);
  });

  it('clamps negative coordinates', () => {
    expect(clampMenuPosition({ x: -10, y: -5 }, 180, 100, 800, 600)).toEqual({
      x: 8,
      y: 8,
    });
  });
});

describe('resolveSubmenuPlacement', () => {
  it('opens right when there is enough room', () => {
    expect(resolveSubmenuPlacement({ left: 100, right: 280 }, 200, 800)).toBe('right');
  });

  it('opens left when opening right would overflow', () => {
    expect(resolveSubmenuPlacement({ left: 600, right: 780 }, 200, 800)).toBe('left');
  });

  it('chooses the side with more room when neither side fully fits', () => {
    expect(resolveSubmenuPlacement({ left: 140, right: 320 }, 300, 400)).toBe('left');
  });
});

describe('ContextMenu', () => {
  it('renders at the cursor and clamps within the viewport after layout', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 400,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 300,
    });

    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 180,
      height: 120,
      top: 0,
      left: 0,
      right: 180,
      bottom: 120,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const items = [{ id: 'reset', label: 'Reset chart view', action: vi.fn() }];
    render(
      <ContextMenu
        open
        position={{ x: 350, y: 280 }}
        items={items}
        onClose={() => {}}
      />,
    );

    const button = screen.getByRole('menuitem', { name: 'Reset chart view' });
    const menu = button.closest('.fixed') as HTMLElement;
    expect(menu).toBeTruthy();
    expect(menu.className).toContain('edge-popover-enter');

    const left = parseFloat(menu.style.left);
    const top = parseFloat(menu.style.top);
    expect(left).toBe(212);
    expect(top).toBe(172);

    rectSpy.mockRestore();
  });

  it('does not invoke action when item is disabled', () => {
    const action = vi.fn();
    const items = [
      {
        id: 'reset',
        label: 'Reset chart view',
        disabled: true,
        action,
      },
    ];

    render(
      <ContextMenu
        open
        position={{ x: 10, y: 10 }}
        items={items}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('menuitem', { name: 'Reset chart view' }));
    expect(action).not.toHaveBeenCalled();
  });

  it('closes after a leaf action succeeds', () => {
    const action = vi.fn();
    const onClose = vi.fn();
    render(
      <ContextMenu
        open
        position={{ x: 10, y: 10 }}
        items={[{ id: 'save', label: 'Save layout', action }]}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('menuitem', { name: 'Save layout' }));
    expect(action).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders section header rows for grouped menu sections', () => {
    render(
      <ContextMenu
        open
        position={{ x: 10, y: 10 }}
        items={[
          { id: 'settings', label: 'Settings', action: vi.fn() },
          { id: 'section', label: 'Change panel', sectionHeader: true, action: vi.fn() },
          { id: 'chart', label: 'Chart', action: vi.fn() },
        ]}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('Change panel')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Change panel' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Chart' })).toBeInTheDocument();
  });

  it('supports arrow key navigation between items', () => {
    render(
      <ContextMenu
        open
        position={{ x: 10, y: 10 }}
        items={[
          { id: 'one', label: 'First item', action: vi.fn() },
          { id: 'two', label: 'Second item', action: vi.fn() },
        ]}
        onClose={() => {}}
      />,
    );

    const first = screen.getByRole('menuitem', { name: 'First item' });
    const second = screen.getByRole('menuitem', { name: 'Second item' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(second);
  });
});
