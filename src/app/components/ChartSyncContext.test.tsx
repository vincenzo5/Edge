import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEffect } from 'react';
import { ChartSyncProvider, useChartSync } from './ChartSyncContext';

function SyncProbe({
  chartId,
  onReceive,
}: {
  chartId: string;
  onReceive: (ts: number | null) => void;
}) {
  const sync = useChartSync();

  useEffect(() => {
    if (!sync) return;
    return sync.subscribe(chartId, onReceive);
  }, [sync, chartId, onReceive]);

  return (
    <button type="button" onClick={() => sync?.broadcast(chartId, 12345)}>
      fire-{chartId}
    </button>
  );
}

describe('ChartSyncContext', () => {
  it('broadcasts to peer charts when linked', () => {
    const peerReceive = vi.fn();
    const sourceReceive = vi.fn();

    render(
      <ChartSyncProvider linked>
        <SyncProbe chartId="cell-0" onReceive={sourceReceive} />
        <SyncProbe chartId="cell-1" onReceive={peerReceive} />
      </ChartSyncProvider>,
    );

    act(() => {
      document.querySelector('button')?.click();
    });

    expect(peerReceive).toHaveBeenCalledWith(12345);
    expect(sourceReceive).not.toHaveBeenCalled();
  });

  it('does not broadcast when unlinked', () => {
    const peerReceive = vi.fn();

    render(
      <ChartSyncProvider linked={false}>
        <SyncProbe chartId="cell-0" onReceive={vi.fn()} />
        <SyncProbe chartId="cell-1" onReceive={peerReceive} />
      </ChartSyncProvider>,
    );

    act(() => {
      document.querySelector('button')?.click();
    });

    expect(peerReceive).not.toHaveBeenCalled();
  });
});
