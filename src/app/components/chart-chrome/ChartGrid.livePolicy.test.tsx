import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChartGrid from './ChartGrid';
import {
  DEFAULT_CELL,
  DEFAULT_TOOLBAR_PREFS,
} from '@/lib/chartConfig';

vi.mock('../chart-cell/ChartCell', () => ({
  default: ({
    chartId,
    live,
    isActive,
  }: {
    chartId: string;
    live?: boolean;
    isActive?: boolean;
  }) => (
    <div
      data-edge-chart={chartId}
      data-testid={`chart-${chartId}`}
      data-live={live ? 'true' : 'false'}
      data-active={isActive ? 'true' : 'false'}
    />
  ),
}));

const cells = [
  { ...DEFAULT_CELL, symbol: 'AAPL' },
  { ...DEFAULT_CELL, symbol: 'MSFT' },
];

function liveForCell(index: number): string | null {
  return screen.getByTestId(`chart-cell-${index}`).getAttribute('data-live');
}

describe('ChartGrid inactive cell live policy', () => {
  it('streams only the active cell on the primary chart tile', () => {
    render(
      <ChartGrid
        layoutId="n2-cols"
        linkCrosshair={false}
        linkDrawings={false}
        theme="light"
        cells={cells}
        activeCellIndex={1}
        isPrimaryChart
        toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
        onCellChange={vi.fn()}
        onActiveCellChange={vi.fn()}
        onToolbarPrefsChange={vi.fn()}
      />,
    );

    expect(liveForCell(0)).toBe('false');
    expect(liveForCell(1)).toBe('true');
  });

  it('does not stream any cell on a non-primary chart tile', () => {
    render(
      <ChartGrid
        layoutId="n2-cols"
        linkCrosshair={false}
        linkDrawings={false}
        theme="light"
        cells={cells}
        activeCellIndex={0}
        isPrimaryChart={false}
        toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
        onCellChange={vi.fn()}
        onActiveCellChange={vi.fn()}
        onToolbarPrefsChange={vi.fn()}
      />,
    );

    expect(liveForCell(0)).toBe('false');
    expect(liveForCell(1)).toBe('false');
  });
});
