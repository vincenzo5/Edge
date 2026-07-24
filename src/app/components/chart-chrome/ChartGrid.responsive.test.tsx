import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChartGrid from './ChartGrid';
import {
  DEFAULT_CELL,
  DEFAULT_TOOLBAR_PREFS,
} from '@/lib/chartConfig';
import { SidebarPanelWidthProvider } from '../sidebar/SidebarPanelWidthContext';
import type { SidebarPanelWidthContextValue } from '../sidebar/SidebarPanelWidthContext';

vi.mock('../chart-cell/ChartCell', () => ({
  default: ({ chartId }: { chartId: string }) => (
    <div data-edge-chart={chartId} data-testid={`chart-${chartId}`} />
  ),
}));

let mockWidth = 1440;

vi.mock('@/lib/responsive/useElementSize', () => ({
  useElementSize: () => {
    const ref = { current: null };
    return [ref, { width: mockWidth, height: 800 }] as const;
  },
}));

const cells = Array.from({ length: 4 }, () => ({ ...DEFAULT_CELL }));

function widthContext(
  overrides: Partial<SidebarPanelWidthContextValue> = {},
): SidebarPanelWidthContextValue {
  return {
    panelWidth: 360,
    overlayInsetPx: 0,
    setWidthPreview: vi.fn(),
    viewportWidth: 1440,
    isExpanded: false,
    canExpand: false,
    expand: vi.fn(),
    collapse: vi.fn(),
    ...overrides,
  };
}

describe('ChartGrid responsive stacking', () => {
  beforeEach(() => {
    mockWidth = 1440;
  });

  it('stacks multi-column templates on narrow widths', () => {
    mockWidth = 500;
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

    const grid = screen.getByTestId('chart-grid');
    expect(grid.dataset.gridStacked).toBe('true');
    expect(grid.style.gridTemplateColumns).toBe('minmax(0, 1fr)');
  });

  it('preserves desktop grid on wide widths', () => {
    mockWidth = 900;
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

    const grid = screen.getByTestId('chart-grid');
    expect(grid.dataset.gridStacked).toBe('false');
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
  });

  it('pads the chart host when a docked overlay panel inset is active', () => {
    render(
      <SidebarPanelWidthProvider value={widthContext({ overlayInsetPx: 360 })}>
        <ChartGrid
          layoutId="s"
          linkCrosshair={false}
          linkDrawings={false}
          theme="light"
          cells={cells}
          activeCellIndex={0}
          toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
          onCellChange={vi.fn()}
          onActiveCellChange={vi.fn()}
          onToolbarPrefsChange={vi.fn()}
        />
      </SidebarPanelWidthProvider>,
    );

    const host = screen.getByTestId('chart-grid-host');
    expect(host.dataset.overlayInset).toBe('360');
    expect(host.style.paddingRight).toBe('360px');
  });

  it('does not pad the chart host when overlay inset is 0', () => {
    render(
      <SidebarPanelWidthProvider value={widthContext({ overlayInsetPx: 0 })}>
        <ChartGrid
          layoutId="s"
          linkCrosshair={false}
          linkDrawings={false}
          theme="light"
          cells={cells}
          activeCellIndex={0}
          toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
          onCellChange={vi.fn()}
          onActiveCellChange={vi.fn()}
          onToolbarPrefsChange={vi.fn()}
        />
      </SidebarPanelWidthProvider>,
    );

    const host = screen.getByTestId('chart-grid-host');
    expect(host.dataset.overlayInset).toBeUndefined();
    expect(host.style.paddingRight).toBe('');
  });
});
