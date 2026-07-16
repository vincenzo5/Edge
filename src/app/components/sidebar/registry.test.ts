import { describe, it, expect } from 'vitest';
import { SIDEBAR_PANELS, SIDEBAR_PANEL_MAP, SIDEBAR_MAIN_PANELS, SIDEBAR_FOOTER_PANELS } from './registry';

describe('sidebar registry', () => {
  it('includes object-tree panel', () => {
    expect(SIDEBAR_PANEL_MAP['object-tree']).toBeDefined();
    expect(SIDEBAR_PANEL_MAP['object-tree'].scope).toBe('active-chart');
  });

  it('includes watchlist panel as app-scoped', () => {
    expect(SIDEBAR_PANEL_MAP['watchlist']).toBeDefined();
    expect(SIDEBAR_PANEL_MAP['watchlist'].scope).toBe('app');
  });

  it('includes account panel as app-scoped', () => {
    expect(SIDEBAR_PANEL_MAP['account']).toBeDefined();
    expect(SIDEBAR_PANEL_MAP['account'].scope).toBe('app');
  });

  it('includes settings panel as app-scoped footer entry', () => {
    expect(SIDEBAR_PANEL_MAP['settings']).toBeDefined();
    expect(SIDEBAR_PANEL_MAP['settings'].scope).toBe('app');
    expect(SIDEBAR_PANEL_MAP['settings'].label).toBe('Settings');
    expect(SIDEBAR_FOOTER_PANELS.map((panel) => panel.id)).toEqual(['settings']);
  });

  it('orders main panels watchlist → options → screener → object-tree → trade → account', () => {
    expect(SIDEBAR_MAIN_PANELS.map((panel) => panel.id)).toEqual([
      'watchlist',
      'options',
      'screener',
      'object-tree',
      'trade',
      'account',
    ]);
  });

  it('includes trade panel as active-chart scoped', () => {
    expect(SIDEBAR_PANEL_MAP.trade).toBeDefined();
    expect(SIDEBAR_PANEL_MAP.trade.scope).toBe('active-chart');
  });

  it('uses unique panel ids', () => {
    const ids = SIDEBAR_PANELS.map((panel) => panel.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses valid scope values', () => {
    for (const panel of SIDEBAR_PANELS) {
      expect(['active-chart', 'app']).toContain(panel.scope);
    }
  });
});
