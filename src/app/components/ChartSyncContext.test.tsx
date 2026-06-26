import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEffect } from 'react';
import type { SerializedDrawing } from '@/lib/chartConfig';
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

const sampleDrawing: SerializedDrawing = {
  id: 'd1',
  name: 'trend_line',
  label: 'TL',
  points: [{ timestamp: 1, value: 100 }],
  visible: true,
  locked: false,
  zLevel: 0,
};

function DrawingSyncProbe({
  chartId,
  onReceive,
}: {
  chartId: string;
  onReceive: (drawings: SerializedDrawing[]) => void;
}) {
  const sync = useChartSync();

  useEffect(() => {
    if (!sync) return;
    return sync.subscribeDrawings(chartId, onReceive);
  }, [sync, chartId, onReceive]);

  return (
    <button
      type="button"
      data-testid={`draw-${chartId}`}
      onClick={() => sync?.broadcastDrawings(chartId, [sampleDrawing])}
    >
      draw-{chartId}
    </button>
  );
}

describe('ChartSyncContext', () => {
  it('broadcasts to peer charts when linked', () => {
    const peerReceive = vi.fn();
    const sourceReceive = vi.fn();

    render(
      <ChartSyncProvider linkCrosshair linkDrawings={false}>
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
      <ChartSyncProvider linkCrosshair={false} linkDrawings={false}>
        <SyncProbe chartId="cell-0" onReceive={vi.fn()} />
        <SyncProbe chartId="cell-1" onReceive={peerReceive} />
      </ChartSyncProvider>,
    );

    act(() => {
      document.querySelector('button')?.click();
    });

    expect(peerReceive).not.toHaveBeenCalled();
  });

  it('broadcasts drawings to peer charts when linkDrawings is enabled', () => {
    const peerReceive = vi.fn();
    const sourceReceive = vi.fn();

    render(
      <ChartSyncProvider linkCrosshair={false} linkDrawings>
        <DrawingSyncProbe chartId="cell-0" onReceive={sourceReceive} />
        <DrawingSyncProbe chartId="cell-1" onReceive={peerReceive} />
      </ChartSyncProvider>,
    );

    act(() => {
      document.querySelector('[data-testid="draw-cell-0"]')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });

    expect(peerReceive).toHaveBeenCalledWith([sampleDrawing]);
    expect(sourceReceive).not.toHaveBeenCalled();
  });

  it('does not broadcast drawings when linkDrawings is disabled', () => {
    const peerReceive = vi.fn();

    render(
      <ChartSyncProvider linkCrosshair={false} linkDrawings={false}>
        <DrawingSyncProbe chartId="cell-0" onReceive={vi.fn()} />
        <DrawingSyncProbe chartId="cell-1" onReceive={peerReceive} />
      </ChartSyncProvider>,
    );

    act(() => {
      document.querySelector('[data-testid="draw-cell-0"]')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });

    expect(peerReceive).not.toHaveBeenCalled();
  });
});
