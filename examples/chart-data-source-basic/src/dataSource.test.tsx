import { describe, expect, it } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { createRef } from 'react';
import { createDefaultChartState } from '@edge/chart-core';
import EdgeChart, { type EdgeChartHandle } from '@edge/chart-react';
import App from './App.js';
import { createFixtureMarketDataSource } from './fixtureDataSource.js';

describe('chart-data-source-basic', () => {
  it('loads candles through MarketDataSource and renders EdgeChart', async () => {
    const dataSource = createFixtureMarketDataSource();
    const response = await dataSource.getCandles({
      symbol: 'DEMO',
      range: '1y',
      interval: '1d',
    });
    expect(response.candles.length).toBeGreaterThan(0);

    const ref = createRef<EdgeChartHandle>();
    const { unmount } = render(
      <EdgeChart
        ref={ref}
        candles={response.candles}
        state={createDefaultChartState()}
        theme="dark"
        symbol="DEMO"
        loading={false}
      />,
    );

    await waitFor(() => {
      expect(ref.current?.getRawCandleCount()).toBe(response.candles.length);
    });

    unmount();
    cleanup();
  });

  it('App switches symbols via fixture MarketDataSource', async () => {
    const { findByText, getByRole } = render(
      <App dataSource={createFixtureMarketDataSource()} initialSymbol="DEMO" />,
    );

    await findByText(/Loaded \d+ bar\(s\) for DEMO/i);

    getByRole('button', { name: /Switch symbol/i }).click();

    await findByText(/Loaded \d+ bar\(s\) for ALT/i);
  });
});
