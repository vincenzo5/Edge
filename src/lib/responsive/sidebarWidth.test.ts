import { describe, expect, it } from 'vitest';
import {
  clampSidebarPanelWidth,
  migrateSidebarWidth,
  resolveSidebarPanelWidth,
} from './sidebarWidth';
import { LAYOUT_DIMENSIONS } from './layoutConstants';

describe('sidebarWidth', () => {
  it('clamps widths to configured min and max', () => {
    expect(clampSidebarPanelWidth(100)).toBe(LAYOUT_DIMENSIONS.sidebarPanelWidthMin);
    expect(clampSidebarPanelWidth(900)).toBe(LAYOUT_DIMENSIONS.sidebarPanelWidthMax);
    expect(clampSidebarPanelWidth(340.6)).toBe(341);
  });

  it('returns default width when no shared width is stored', () => {
    expect(resolveSidebarPanelWidth(undefined)).toBe(
      LAYOUT_DIMENSIONS.sidebarPanelWidth,
    );
    expect(resolveSidebarPanelWidth(Number.NaN)).toBe(
      LAYOUT_DIMENSIONS.sidebarPanelWidth,
    );
  });

  it('returns stored shared width', () => {
    expect(resolveSidebarPanelWidth(420)).toBe(420);
    expect(resolveSidebarPanelWidth(700)).toBe(560);
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
  });
});
