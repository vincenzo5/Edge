import { describe, expect, it } from 'vitest';
import { computeChartAnchoredPopoverLayout, isSameChartAnchoredPopoverLayout } from './chartAnchoredPopoverLayout';

describe('computeChartAnchoredPopoverLayout', () => {
  it('uses natural height when content fits below the anchor', () => {
    const layout = computeChartAnchoredPopoverLayout(
      { top: 40, bottom: 64, left: 100, right: 132 },
      280,
      420,
      'start',
      1440,
      900,
    );

    expect(layout.y).toBe(68);
    expect(layout.maxHeight).toBe(420);
    expect(layout.scrollable).toBe(false);
  });

  it('scrolls when content exceeds available viewport space below', () => {
    const layout = computeChartAnchoredPopoverLayout(
      { top: 40, bottom: 64, left: 100, right: 132 },
      280,
      900,
      'start',
      1440,
      700,
    );

    expect(layout.scrollable).toBe(true);
    expect(layout.maxHeight).toBeLessThan(900);
    expect(layout.y + layout.maxHeight).toBeLessThanOrEqual(700 - 8);
  });

  it('opens upward when there is more room above', () => {
    const layout = computeChartAnchoredPopoverLayout(
      { top: 520, bottom: 544, left: 100, right: 132 },
      280,
      900,
      'start',
      1440,
      900,
    );

    expect(layout.y).toBeLessThan(520);
    expect(layout.scrollable).toBe(true);
  });

  it('detects equivalent layouts for commit guard', () => {
    const layout = computeChartAnchoredPopoverLayout(
      { top: 40, bottom: 64, left: 100, right: 132 },
      280,
      420,
      'start',
      1440,
      900,
    );
    expect(isSameChartAnchoredPopoverLayout(layout, { ...layout })).toBe(true);
    expect(isSameChartAnchoredPopoverLayout(layout, { ...layout, y: layout.y + 1 })).toBe(false);
    expect(isSameChartAnchoredPopoverLayout(null, null)).toBe(true);
  });
});
