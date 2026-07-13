import { describe, expect, it } from 'vitest';
import {
  clampSidebarPanelWidth,
  clampSidebarWidthOnPanelLeave,
  computeScreenerExpandedSidebarWidth,
  migrateSidebarWidth,
  resolveScreenerSidebarPanelMax,
  resolveSidebarPanelMaxWidth,
  resolveSidebarPanelWidth,
} from './sidebarWidth';
import { LAYOUT_DIMENSIONS } from './layoutConstants';

describe('sidebarWidth', () => {
  it('clamps widths to configured min and max for non-screener panels', () => {
    expect(clampSidebarPanelWidth(100)).toBe(LAYOUT_DIMENSIONS.sidebarPanelWidthMin);
    expect(clampSidebarPanelWidth(900)).toBe(LAYOUT_DIMENSIONS.sidebarPanelWidthMax);
    expect(clampSidebarPanelWidth(340.6)).toBe(341);
  });

  it('allows wider widths when screener is active', () => {
    const viewport = 1600;
    const screenerMax = resolveScreenerSidebarPanelMax(viewport);
    expect(screenerMax).toBeGreaterThan(LAYOUT_DIMENSIONS.sidebarPanelWidthMax);
    expect(clampSidebarPanelWidth(900, 'screener', viewport)).toBe(900);
    expect(clampSidebarPanelWidth(2000, 'screener', viewport)).toBe(screenerMax);
  });

  it('computes screener expanded width from viewport minus rail', () => {
    const viewport = 1440;
    expect(computeScreenerExpandedSidebarWidth(viewport)).toBe(
      clampSidebarPanelWidth(viewport - LAYOUT_DIMENSIONS.sidebarRailWidth, 'screener', viewport),
    );
  });

  it('clamps stored width when leaving screener', () => {
    expect(clampSidebarWidthOnPanelLeave(1200)).toBe(LAYOUT_DIMENSIONS.sidebarPanelWidthMax);
    expect(clampSidebarWidthOnPanelLeave(420)).toBe(420);
  });

  it('returns default width when no shared width is stored', () => {
    expect(resolveSidebarPanelWidth(undefined)).toBe(
      LAYOUT_DIMENSIONS.sidebarPanelWidth,
    );
    expect(resolveSidebarPanelWidth(Number.NaN)).toBe(
      LAYOUT_DIMENSIONS.sidebarPanelWidth,
    );
  });

  it('returns stored shared width with panel-aware max', () => {
    expect(resolveSidebarPanelWidth(420)).toBe(420);
    expect(resolveSidebarPanelWidth(700)).toBe(560);
    expect(resolveSidebarPanelWidth(700, 'screener', 1600)).toBe(700);
  });

  it('resolves panel max width by active panel', () => {
    expect(resolveSidebarPanelMaxWidth('watchlist', 1600)).toBe(
      LAYOUT_DIMENSIONS.sidebarPanelWidthMax,
    );
    expect(resolveSidebarPanelMaxWidth('screener', 1600)).toBe(
      resolveScreenerSidebarPanelMax(1600),
    );
  });

  it('migrates legacy per-panel widths to one shared width', () => {
    expect(
      migrateSidebarWidth({
        activePanel: 'options',
        panelWidths: { options: 420, watchlist: 280 },
      }),
    ).toBe(420);
    expect(
      migrateSidebarWidth({
        activePanel: null,
        panelWidths: { watchlist: 360 },
      }),
    ).toBe(360);
    expect(
      migrateSidebarWidth({
        width: 380,
        panelWidths: { watchlist: 360 },
      }),
    ).toBe(380);
    expect(
      migrateSidebarWidth({
        width: 900,
      }),
    ).toBe(560);
  });
});
