import { describe, it, expect } from 'vitest';
import {
  createInitialLayout,
  applyBoundaryResize,
  computePaneBoundaries,
  MIN_PRICE_HEIGHT,
  PANE_SEPARATOR_HEIGHT,
} from './panes';

describe('createInitialLayout', () => {
  it('gives price pane full container height when no sub-panes', () => {
    const layout = createInitialLayout([], 400, new Set(), null);
    expect(layout.pricePane.height).toBe(400);
    expect(layout.subPanes).toHaveLength(0);
    expect(layout.stack).toHaveLength(1);
  });

  it('allocates remainder to price pane when sub-panes are present', () => {
    const layout = createInitialLayout(['macd'], 400, new Set(), null);
    expect(layout.pricePane.height).toBe(400 - PANE_SEPARATOR_HEIGHT - 100);
    expect(layout.subPanes[0].height).toBe(100);
    expect(layout.subPanes[0].top).toBe(layout.pricePane.height + PANE_SEPARATOR_HEIGHT);
  });

  it('collapses price pane height when price is in collapsed set', () => {
    const layout = createInitialLayout(['macd'], 400, new Set(['price']), null);
    expect(layout.pricePane.height).toBe(28);
    expect(layout.pricePane.isCollapsed).toBe(true);
    expect(layout.subPanes[0].height).toBe(400 - PANE_SEPARATOR_HEIGHT - 28);
  });

  it('expands price pane when a sub-pane is collapsed', () => {
    const layout = createInitialLayout(['macd'], 400, new Set(['macd']), null);
    expect(layout.subPanes[0].height).toBe(28);
    expect(layout.subPanes[0].isCollapsed).toBe(true);
    expect(layout.pricePane.height).toBe(400 - PANE_SEPARATOR_HEIGHT - 28);
  });

  it('expands price pane and collapses subs when price is maximized', () => {
    const layout = createInitialLayout(['macd', 'rsi'], 400, new Set(), 'price');
    expect(layout.pricePane.isMaximized).toBe(true);
    expect(layout.pricePane.height).toBeGreaterThan(300);
    expect(layout.subPanes.every((p) => p.height === 28)).toBe(true);
  });

  it('orders stack by paneOrder', () => {
    const layout = createInitialLayout(
      ['macd::sub', 'rsi::sub'],
      400,
      new Set(),
      null,
      undefined,
      ['macd::sub', 'price', 'rsi::sub']
    );
    expect(layout.stack.map((p) => p.key)).toEqual(['macd::sub', 'price', 'rsi::sub']);
    expect(layout.stack[0].top).toBe(0);
    expect(layout.stack[1].top).toBe(100 + PANE_SEPARATOR_HEIGHT);
  });

  it('uses custom sub-pane heights when provided', () => {
    const layout = createInitialLayout(['macd::sub'], 400, new Set(), null, { 'macd::sub': 150 });
    expect(layout.subPanes[0].height).toBe(150);
    expect(layout.pricePane.height).toBe(400 - PANE_SEPARATOR_HEIGHT - 150);
  });

  it('clamps price pane height and shrinks sub-panes in a short container', () => {
    const layout = createInitialLayout(['macd', 'rsi'], 150, new Set(), null);
    expect(layout.pricePane.height).toBeGreaterThanOrEqual(MIN_PRICE_HEIGHT);
    const sepSpace = 2 * PANE_SEPARATOR_HEIGHT;
    expect(layout.pricePane.height + layout.subPanes.reduce((s, p) => s + p.height, 0) + sepSpace).toBeLessThanOrEqual(
      150
    );
    expect(layout.subPanes.every((p) => p.height >= 28)).toBe(true);
  });

  it('never assigns zero or negative price pane height with multiple sub-panes', () => {
    const layout = createInitialLayout(['macd', 'rsi', 'stoch'], 120, new Set(), null);
    expect(layout.pricePane.height).toBeGreaterThan(0);
    expect(layout.pricePane.height).toBeGreaterThanOrEqual(MIN_PRICE_HEIGHT);
  });
});

describe('applyBoundaryResize', () => {
  it('transfers height between price and first sub-pane', () => {
    const next = applyBoundaryResize(['macd::sub'], {}, 0, -20, 400, new Set(), null);
    expect(next).not.toBeNull();
    expect(next!['macd::sub']).toBe(120);
  });

  it('transfers height between adjacent sub-panes', () => {
    const next = applyBoundaryResize(
      ['macd::sub', 'rsi::sub'],
      { 'macd::sub': 100, 'rsi::sub': 100 },
      1,
      30,
      400,
      new Set(),
      null
    );
    expect(next).not.toBeNull();
    expect(next!['macd::sub']).toBe(130);
    expect(next!['rsi::sub']).toBe(70);
  });

  it('returns null when resize would violate minimum heights', () => {
    const next = applyBoundaryResize(['macd::sub'], { 'macd::sub': 48 }, 0, 200, 400, new Set(), null);
    expect(next).toBeNull();
  });
});

describe('computePaneBoundaries', () => {
  it('returns one boundary per sub-pane', () => {
    const layout = createInitialLayout(['macd::sub', 'rsi::sub'], 400, new Set(), null);
    const boundaries = computePaneBoundaries(layout);
    expect(boundaries).toHaveLength(2);
    expect(boundaries[0].index).toBe(0);
    expect(boundaries[1].index).toBe(1);
  });
});
