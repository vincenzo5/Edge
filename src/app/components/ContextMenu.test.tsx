import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContextMenu, { clampMenuPosition } from './ContextMenu';

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

    const button = screen.getByRole('button', { name: 'Reset chart view' });
    const menu = button.closest('.fixed') as HTMLElement;
    expect(menu).toBeTruthy();

    const left = parseFloat(menu.style.left);
    const top = parseFloat(menu.style.top);
    expect(left).toBe(212);
    expect(top).toBe(172);

    rectSpy.mockRestore();
  });
});
