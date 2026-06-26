import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DEFAULT_CELL,
  DEFAULT_TOOLBAR_PREFS,
} from '@/lib/chartConfig';

vi.mock('@/lib/responsive/useElementSize', () => ({
  useElementSize: vi.fn(() => [vi.fn(), { width: 500, height: 600 }]),
}));

vi.mock('./ChartCell', () => ({
  default: ({ chartId }: { chartId: string }) => (
    <div data-edge-chart={chartId} data-testid={`chart-${chartId}`} />
  ),
}));

import ChartGrid from './ChartGrid';

const cells = Array.from({ length: 4 }, () => ({ ...DEFAULT_CELL }));

describe('ChartGrid responsive layout', () => {
  it('stacks two-column grid modes when container width is narrow', () => {
    render(
      <ChartGrid
        gridMode="1x2"
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
    expect(grid).toHaveAttribute('data-grid-stacked', 'true');
    expect(grid.className).toMatch(/grid-cols-1/);
    expect(grid.className).toMatch(/chart-grid-rows-2/);
  });
});
