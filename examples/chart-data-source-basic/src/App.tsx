import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createDefaultChartState,
  type SerializedChartState,
} from '@edge/chart-core';
import EdgeChart, { type EdgeChartHandle } from '@edge/chart-react';
import type { Candle } from '@edge/chart-core';
import type { MarketDataSource } from '@edge/chart-core/data-source';
import {
  createFixtureMarketDataSource,
  defaultFixtureInterval,
  defaultFixtureRange,
  type FixtureSymbol,
} from './fixtureDataSource.js';

type AppProps = {
  dataSource?: MarketDataSource;
  initialSymbol?: FixtureSymbol;
};

export default function App({
  dataSource = createFixtureMarketDataSource(),
  initialSymbol = 'DEMO',
}: AppProps) {
  const chartRef = useRef<EdgeChartHandle>(null);
  const [symbol, setSymbol] = useState<FixtureSymbol>(initialSymbol);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [state, setState] = useState<SerializedChartState>(() =>
    createDefaultChartState({ chartType: 'candle_solid' }),
  );
  const [status, setStatus] = useState('Loading fixture candles via MarketDataSource…');
  const [loading, setLoading] = useState(true);

  const loadSymbol = useCallback(
    async (nextSymbol: FixtureSymbol) => {
      setLoading(true);
      setStatus(`Loading ${nextSymbol} via MarketDataSource…`);
      const response = await dataSource.getCandles({
        symbol: nextSymbol,
        range: defaultFixtureRange(),
        interval: defaultFixtureInterval(),
      });
      setCandles(response.candles);
      setSymbol(nextSymbol);
      setLoading(false);
      setStatus(
        `Loaded ${response.candles.length} bar(s) for ${response.symbol} (${response.interval}).`,
      );
    },
    [dataSource],
  );

  useEffect(() => {
    void loadSymbol(initialSymbol);
  }, [initialSymbol, loadSymbol]);

  const handleSwitchSymbol = () => {
    const next = symbol === 'DEMO' ? 'ALT' : 'DEMO';
    void loadSymbol(next);
  };

  const handleLoadOlder = async () => {
    const first = candles[0];
    if (!first) return;
    setStatus('Paginating older bars…');
    const page = await dataSource.getCandles({
      symbol,
      interval: defaultFixtureInterval(),
      beforeTimestamp: first.t,
      barCount: 2,
    });
    if (page.candles.length === 0) {
      setStatus('No older fixture bars available.');
      return;
    }
    setCandles((prev) => [...page.candles, ...prev]);
    setStatus(`Prepended ${page.candles.length} older bar(s).`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 16, gap: 12 }}>
      <header>
        <h1 style={{ margin: '0 0 4px', fontSize: 20 }}>@edge/chart-react + MarketDataSource</h1>
        <p style={{ margin: 0, opacity: 0.75, fontSize: 14 }}>
          Caller-provided data through the public contract — no Yahoo, no Edge API routes.
        </p>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" onClick={handleSwitchSymbol} disabled={loading}>
          Switch symbol ({symbol})
        </button>
        <button type="button" onClick={() => void handleLoadOlder()} disabled={loading}>
          Load older bars
        </button>
      </div>

      <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>{status}</p>

      <div
        style={{
          flex: 1,
          minHeight: 420,
          border: '1px solid #30363d',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {!loading && candles.length > 0 ? (
          <EdgeChart
            ref={chartRef}
            candles={candles}
            state={state}
            theme="dark"
            symbol={symbol}
            range={defaultFixtureRange()}
            interval={defaultFixtureInterval()}
            loading={false}
            onStateChange={setState}
          />
        ) : (
          <div style={{ padding: 24, opacity: 0.6 }}>
            {loading ? 'Loading…' : 'No candles'}
          </div>
        )}
      </div>
    </div>
  );
}
