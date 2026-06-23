import { describe, it, expect } from 'vitest';
import { SIDEBAR_PANELS, SIDEBAR_PANEL_MAP } from './registry';

describe('sidebar registry', () => {
  it('includes object-tree panel', () => {
    expect(SIDEBAR_PANEL_MAP['object-tree']).toBeDefined();
    expect(SIDEBAR_PANEL_MAP['object-tree'].scope).toBe('active-chart');
  });

  it('includes watchlist panel as app-scoped', () => {
    expect(SIDEBAR_PANEL_MAP['watchlist']).toBeDefined();
    expect(SIDEBAR_PANEL_MAP['watchlist'].scope).toBe('app');
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
