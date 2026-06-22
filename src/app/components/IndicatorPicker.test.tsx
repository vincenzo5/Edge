/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import IndicatorPicker from './IndicatorPicker';

describe('IndicatorPicker', () => {
  beforeEach(() => {
    const storage = {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return storage.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        storage.store[key] = value;
      },
    };
    vi.stubGlobal('localStorage', storage);
  });

  it('renders TradingView-style modal when open', () => {
    render(
      <IndicatorPicker
        open
        active={[]}
        theme="dark"
        onAdd={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Indicators, metrics, and strategies')).toBeTruthy();
    expect(screen.getByTestId('indicator-search')).toBeTruthy();
    expect(screen.getByText('Technicals')).toBeTruthy();
  });

  it('calls onAdd for implemented indicator', () => {
    const onAdd = vi.fn();
    render(
      <IndicatorPicker
        open
        active={[]}
        theme="dark"
        onAdd={onAdd}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'RSI' }));
    expect(onAdd).toHaveBeenCalledWith({ name: 'RSI', pane: 'sub' });
  });

  it('shows favorites section empty state', () => {
    render(
      <IndicatorPicker
        open
        active={[]}
        theme="dark"
        onAdd={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Favorites' }));
    expect(screen.getByText('No favorite indicators yet')).toBeTruthy();
  });
});
