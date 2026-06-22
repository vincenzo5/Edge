/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChartTopBar from './ChartTopBar';

vi.mock('../SearchBar', () => ({
  default: ({ initial }: { initial: string }) => (
    <div data-testid="symbol-search-input">{initial}</div>
  ),
}));

vi.mock('./ChartIntervalMenu', () => ({
  default: ({ onChange }: { onChange: (v: string) => void }) => (
    <button type="button" data-testid="chart-interval-trigger" onClick={() => onChange('5m')}>
      D
    </button>
  ),
}));

vi.mock('./ChartTypeMenu', () => ({
  default: ({ onChange }: { onChange: (v: string) => void }) => (
    <button type="button" data-testid="chart-type-trigger" onClick={() => onChange('area')}>
      type
    </button>
  ),
}));

vi.mock('./ChartIndicatorFavoritesMenu', () => ({
  default: () => <button type="button" data-testid="indicator-favorites-trigger" />,
}));

vi.mock('./ChartTemplateMenu', () => ({
  default: () => <button type="button" data-testid="template-menu-trigger" />,
}));

const baseActions = {
  onSymbolSelect: vi.fn(),
  onIntervalChange: vi.fn(),
  onChartTypeChange: vi.fn(),
  onOpenIndicators: vi.fn(),
  onAddFavoriteIndicator: vi.fn(),
  onSaveStudyTemplate: vi.fn(),
  onOpenTemplate: vi.fn(),
  onOpenSettings: vi.fn(),
  onToggleReplay: vi.fn(),
  onUndo: vi.fn(),
  onRedo: vi.fn(),
};

describe('ChartTopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders symbol and interval in compact mode only', () => {
    render(
      <ChartTopBar
        theme="dark"
        compact
        symbol="AAPL"
        interval="1d"
        chartType="candle_solid"
        indicatorFavorites={[]}
        actions={baseActions}
      />,
    );

    expect(screen.getByTestId('symbol-search-input')).toHaveTextContent('AAPL');
    expect(screen.getByTestId('chart-interval-trigger')).toBeTruthy();
    expect(screen.queryByTestId('indicators-trigger')).toBeNull();
    expect(screen.queryByTestId('settings-trigger')).toBeNull();
  });

  it('renders full header controls when not compact', () => {
    render(
      <ChartTopBar
        theme="dark"
        symbol="IONQ"
        interval="1d"
        chartType="candle_solid"
        indicatorFavorites={['RSI']}
        canUndo
        canRedo={false}
        actions={baseActions}
      />,
    );

    expect(screen.getByTestId('indicators-trigger')).toBeTruthy();
    expect(screen.getByTestId('settings-trigger')).toBeTruthy();
    expect(screen.getByTestId('replay-trigger')).toBeTruthy();
    expect(screen.getByTestId('undo-trigger')).toBeTruthy();
    expect(screen.getByTestId('redo-trigger')).toBeTruthy();
  });

  it('wires interval and chart type changes', () => {
    render(
      <ChartTopBar
        theme="dark"
        symbol="AAPL"
        interval="1d"
        chartType="candle_solid"
        indicatorFavorites={[]}
        actions={baseActions}
      />,
    );

    fireEvent.click(screen.getByTestId('chart-interval-trigger'));
    expect(baseActions.onIntervalChange).toHaveBeenCalledWith('5m');

    fireEvent.click(screen.getByTestId('chart-type-trigger'));
    expect(baseActions.onChartTypeChange).toHaveBeenCalledWith('area');
  });

  it('opens indicators and settings', () => {
    render(
      <ChartTopBar
        theme="dark"
        symbol="AAPL"
        interval="1d"
        chartType="candle_solid"
        indicatorFavorites={[]}
        actions={baseActions}
      />,
    );

    fireEvent.click(screen.getByTestId('indicators-trigger'));
    expect(baseActions.onOpenIndicators).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('settings-trigger'));
    expect(baseActions.onOpenSettings).toHaveBeenCalled();
  });
});
