import { describe, expect, it } from 'vitest';
import {
  clampSidebarPanelWidth,
  resolveSidebarPanelWidth,
} from './sidebarWidth';
import { LAYOUT_DIMENSIONS } from './layoutConstants';

describe('sidebarWidth', () => {
  it('clamps widths to configured min and max', () => {
    expect(clampSidebarPanelWidth(100)).toBe(LAYOUT_DIMENSIONS.sidebarPanelWidthMin);
    expect(clampSidebarPanelWidth(900)).toBe(LAYOUT_DIMENSIONS.sidebarPanelWidthMax);
    expect(clampSidebarPanelWidth(340.6)).toBe(341);
  });

  it('returns default width when panel has no stored width', () => {
    expect(resolveSidebarPanelWidth('watchlist', {})).toBe(
      LAYOUT_DIMENSIONS.sidebarPanelWidth,
    );
    expect(resolveSidebarPanelWidth(null, { watchlist: 420 })).toBe(
      LAYOUT_DIMENSIONS.sidebarPanelWidth,
    );
  });

  it('returns stored width per panel', () => {
    expect(
      resolveSidebarPanelWidth('options', { options: 420, watchlist: 280 }),
    ).toBe(420);
  });
});
