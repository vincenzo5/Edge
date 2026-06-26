/**
 * Layout shell smoke tests for multi-chart grid modes.
 *
 * Manual CDP QA (run in devtools after layout changes):
 * ({ mode: document.querySelector('header select')?.value,
 *    gridH: document.querySelector('[data-testid="chart-grid"]')?.getBoundingClientRect().height,
 *    vh: innerHeight,
 *    scroll: document.documentElement.scrollHeight - innerHeight,
 *    charts: [...document.querySelectorAll('[data-edge-chart]')].map(c => c.getBoundingClientRect().height) })
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChartGrid from './ChartGrid';
import {
  DEFAULT_CELL,
  DEFAULT_TOOLBAR_PREFS,
  GRID_MODES,
  cellCountFor,
  type GridMode,
} from '@/lib/chartConfig';

vi.mock('./ChartCell', () => ({
  default: ({ chartId }: { chartId: string }) => (
    <div data-edge-chart={chartId} data-testid={`chart-${chartId}`} />
  ),
}));

const cells = Array.from({ length: 4 }, () => ({ ...DEFAULT_CELL }));

describe('ChartGrid layout shell', () => {
  it.each(GRID_MODES.map((m) => [m.value, m.label] as const))(
    'renders grid mode %s with %i cells',
    (gridMode: GridMode) => {
      render(
        <ChartGrid
          gridMode={gridMode}
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
      expect(charts.length).toBe(cellCountFor(gridMode));
    },
  );

  it('uses fractional row utilities for multi-row modes', () => {
    render(
      <ChartGrid
        gridMode="2x2"
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
    expect(grid.className).toMatch(/chart-grid-rows-2/);
    expect(grid.className).toMatch(/grid-cols-2/);
  });
});
