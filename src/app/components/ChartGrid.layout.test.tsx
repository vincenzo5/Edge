/**
 * Layout shell smoke tests for multi-chart templates.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChartGrid from './ChartGrid';
import {
  DEFAULT_CELL,
  DEFAULT_TOOLBAR_PREFS,
  LAYOUT_TEMPLATES,
  cellCountFor,
  type LayoutTemplateId,
} from '@/lib/chartConfig';

vi.mock('./ChartCell', () => ({
  default: ({ chartId }: { chartId: string }) => (
    <div data-edge-chart={chartId} data-testid={`chart-${chartId}`} />
  ),
}));

const cells = Array.from({ length: 16 }, () => ({ ...DEFAULT_CELL }));

describe('ChartGrid layout shell', () => {
  it.each(LAYOUT_TEMPLATES.map((t) => [t.id, t.paneCount] as const))(
    'renders template %s with %i cells',
    (layoutId: LayoutTemplateId) => {
      render(
        <ChartGrid
          layoutId={layoutId}
          linkCrosshair={false}
          linkDrawings={false}
          theme="light"
          cells={cells}
          activeCellIndex={0}
          toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
          onCellChange={vi.fn()}
          onActiveCellChange={vi.fn()}
          onToolbarPrefsChange={vi.fn()}
        />,
      );

      const grid = screen.getByTestId('chart-grid');
      expect(grid.className).toMatch(/min-h-0/);
      expect(grid.className).toMatch(/overflow-hidden/);
      expect(grid.className).toMatch(/flex-1/);

      const charts = document.querySelectorAll('[data-edge-chart]');
      expect(charts.length).toBe(cellCountFor(layoutId));
    },
  );

  it('uses template-driven grid styles for multi-cell layouts', () => {
    render(
      <ChartGrid
        layoutId="n4-grid-2x2"
        linkCrosshair={false}
        linkDrawings={false}
        theme="light"
        cells={cells}
        activeCellIndex={0}
        toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
        onCellChange={vi.fn()}
        onActiveCellChange={vi.fn()}
        onToolbarPrefsChange={vi.fn()}
      />,
    );

    const grid = screen.getByTestId('chart-grid');
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    expect(grid.style.gridTemplateRows).toBe('repeat(2, minmax(0, 1fr))');
  });

  it('highlights the active cell in multi-pane layouts', () => {
    render(
      <ChartGrid
        layoutId="n2-cols"
        linkCrosshair={false}
        linkDrawings={false}
        theme="light"
        cells={cells}
        activeCellIndex={1}
        toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
        onCellChange={vi.fn()}
        onActiveCellChange={vi.fn()}
        onToolbarPrefsChange={vi.fn()}
      />,
    );

    const activeWrappers = document.querySelectorAll('[data-active-cell="true"]');
    expect(activeWrappers.length).toBe(1);
    expect(
      activeWrappers[0]?.querySelector('[data-testid="chart-cell-active-outline"]'),
    ).not.toBeNull();
  });

  it('renders one shared drawing toolbar in multi-pane layouts', () => {
    render(
      <ChartGrid
        layoutId="n2-cols"
        linkCrosshair={false}
        linkDrawings={false}
        theme="light"
        cells={cells}
        activeCellIndex={0}
        toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
        onCellChange={vi.fn()}
        onActiveCellChange={vi.fn()}
        onToolbarPrefsChange={vi.fn()}
      />,
    );

    expect(document.querySelectorAll('[data-testid="chart-drawing-rail"]')).toHaveLength(1);
  });

  it('does not highlight cells in single-pane layout', () => {
    render(
      <ChartGrid
        layoutId="n1"
        linkCrosshair={false}
        linkDrawings={false}
        theme="light"
        cells={cells}
        activeCellIndex={0}
        toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
        onCellChange={vi.fn()}
        onActiveCellChange={vi.fn()}
        onToolbarPrefsChange={vi.fn()}
      />,
    );

    expect(document.querySelector('[data-active-cell="true"]')).toBeNull();
  });
});
