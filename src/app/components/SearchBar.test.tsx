/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SearchBar from './SearchBar';

const results = [
  { symbol: 'IONQ', name: 'IonQ, Inc.', exchange: 'NYSE' },
  { symbol: 'IONX', name: 'Defiance Daily Target 2X Long IONQ ETF', exchange: 'NASDAQ' },
];

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ results }),
      })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('opens a TradingView-style symbol modal when compact search is focused', async () => {
    const onSelect = vi.fn();
    render(<SearchBar compact initial="IONQ" theme="dark" onSelect={onSelect} />);

    fireEvent.focus(screen.getByTestId('symbol-search-input'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByRole('dialog', { name: 'Symbol search' })).toBeTruthy();
    expect(screen.getByTestId('symbol-search-modal-input')).toHaveValue('IONQ');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(screen.getByText('IonQ, Inc.')).toBeTruthy();

    fireEvent.keyDown(screen.getByTestId('symbol-search-modal-input'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByTestId('symbol-search-modal-input'), { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith(results[1]);
  });
});
