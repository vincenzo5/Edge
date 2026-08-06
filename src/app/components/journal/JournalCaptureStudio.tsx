"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ActiveChartProvider, useActiveChart } from "@/app/components/ActiveChartContext";
import ChartCell from "@/app/components/ChartCell";
import { ChartSyncProvider } from "@/app/components/ChartSyncContext";
import { MarketDataProvider } from "@/app/components/MarketDataProvider";
import { DataHealthProvider } from "@/app/components/data-health";
import { EdgeButton } from "@/app/components/design-system";
import ChartIntervalMenu from "@/app/components/chart-chrome/ChartIntervalMenu";
import { intervalShortLabel } from "@/lib/chart/chartHeaderMetadata";
import AppChromeProviders from "@/app/components/home/AppChromeProviders";
import {
  publishCaptureCancelled,
  publishCaptureDone,
  publishCaptureFailed,
} from "@/lib/journal/captureChannel";
import { captureTradeChartFork } from "@/lib/journal/captureTradeChartFork";
import { resolveJournalTradeIdForPersistence } from "@/lib/journal/resolveJournalTradeIdForPersistence";
import {
  clearCaptureSeed,
  readCaptureSeed,
  type JournalCaptureSeed,
} from "@/lib/journal/captureSeed";
import {
  DEFAULT_LAYOUT,
  DEFAULT_TOOLBAR_PREFS,
  type CellConfig,
  type ChartLayout,
} from "@/lib/chartConfig";
import type { Interval } from "@edge/chart-core/contracts";

type StudioInnerProps = {
  seed: JournalCaptureSeed;
  token: string;
};

function JournalCaptureStudioInner({ seed, token }: StudioInnerProps) {
  const activeChart = useActiveChart();
  const [cellConfig, setCellConfig] = useState<CellConfig>(() => seed.cellConfig);
  const [toolbarPrefs, setToolbarPrefs] = useState(DEFAULT_TOOLBAR_PREFS);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const layout = useMemo((): ChartLayout => {
    return {
      ...DEFAULT_LAYOUT,
      theme: seed.theme,
      cells: [cellConfig],
      activeCellIndex: 0,
    };
  }, [cellConfig, seed.theme]);

  const closeWindow = useCallback(() => {
    if (typeof window !== "undefined") {
      window.close();
    }
  }, []);

  const handleCancel = useCallback(() => {
    publishCaptureCancelled({ requestId: seed.requestId, tradeId: seed.tradeId });
    clearCaptureSeed(token);
    closeWindow();
  }, [closeWindow, seed.requestId, seed.tradeId, token]);

  const handleCapture = useCallback(async () => {
    if (!activeChart?.chartCommands.canCaptureSnapshot()) {
      setError("Chart is still loading. Wait for candles, then try again.");
      return;
    }

    setCapturing(true);
    setError(null);

    try {
      const resolvedTradeId = await resolveJournalTradeIdForPersistence({
        tradeId: seed.tradeId,
        fillExecIds: seed.fillExecIds,
      });
      if (!resolvedTradeId) {
        const message = "Journal trade not found. Sync journal and try again.";
        publishCaptureFailed({
          requestId: seed.requestId,
          tradeId: seed.tradeId,
          error: message,
        });
        setError(message);
        return;
      }

      const result = await captureTradeChartFork({
        trade: { id: resolvedTradeId, symbol: seed.symbol },
        cellConfig,
        captureScreenshot: () =>
          activeChart.chartCommands.captureSnapshot({ includeCrosshair: false }),
        label: `${seed.symbol} setup`,
      });

      if (!result.ok) {
        publishCaptureFailed({
          requestId: seed.requestId,
          tradeId: seed.tradeId,
          error: result.error,
        });
        setError(result.error);
        return;
      }

      if (!result.screenshotId) {
        publishCaptureFailed({
          requestId: seed.requestId,
          tradeId: seed.tradeId,
          error: "Screenshot upload failed.",
        });
        setError("Screenshot upload failed.");
        return;
      }

      publishCaptureDone({
        requestId: seed.requestId,
        tradeId: resolvedTradeId,
        screenshotId: result.screenshotId,
        snapshotId: result.snapshotId,
      });
      clearCaptureSeed(token);
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 200);
      });
      closeWindow();
    } catch (captureError) {
      const message =
        captureError instanceof Error ? captureError.message : "Chart capture failed.";
      publishCaptureFailed({
        requestId: seed.requestId,
        tradeId: seed.tradeId,
        error: message,
      });
      setError(message);
    } finally {
      setCapturing(false);
    }
  }, [activeChart, cellConfig, closeWindow, seed, token]);

  const handleIntervalChange = useCallback((interval: Interval) => {
    setCellConfig((current) => ({ ...current, interval }));
  }, []);

  return (
    <MarketDataProvider layout={layout}>
      <DataHealthProvider>
        <div
          className="flex h-screen min-h-0 flex-col bg-[var(--edge-background)]"
          data-testid="journal-capture-studio"
        >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--edge-border)] px-4 py-2">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-[var(--edge-text-strong)]">
              Capture {seed.symbol} chart
            </h1>
            <p className="text-xs text-[var(--edge-text-secondary)]">
              Mark up the chart, then capture it to the trade journal. Interval:{" "}
              {intervalShortLabel(cellConfig.interval)}.
            </p>
          </div>
          <ChartIntervalMenu
            theme={seed.theme}
            value={cellConfig.interval}
            onChange={handleIntervalChange}
          />
        </header>

        <div className="relative min-h-0 flex-1">
          <ChartCell
            chartId={`journal-capture-${seed.tradeId}`}
            config={cellConfig}
            theme={seed.theme}
            isActive
            live
            showDrawingRail
            toolbarPrefs={toolbarPrefs}
            onConfigChange={setCellConfig}
            onToolbarPrefsChange={setToolbarPrefs}
          />
        </div>

        {error ? (
          <p
            className="border-t border-[var(--edge-border)] px-4 py-2 text-xs text-[var(--edge-negative)]"
            data-testid="journal-capture-studio-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--edge-border)] px-4 py-3">
          <EdgeButton
            type="button"
            variant="secondary"
            disabled={capturing}
            onClick={handleCancel}
            data-testid="journal-capture-cancel"
          >
            Cancel
          </EdgeButton>
          <EdgeButton
            type="button"
            disabled={capturing}
            onClick={() => void handleCapture()}
            data-testid="journal-capture-save"
          >
            {capturing ? "Capturing…" : "Capture"}
          </EdgeButton>
        </footer>
        </div>
      </DataHealthProvider>
    </MarketDataProvider>
  );
}

export default function JournalCaptureStudio() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const tradeId = searchParams.get("tradeId")?.trim() ?? "";
  const [seed, setSeed] = useState<JournalCaptureSeed | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !tradeId) {
      setSeedError("Missing capture session.");
      return;
    }

    const loaded = readCaptureSeed(token);
    if (!loaded || loaded.tradeId !== tradeId) {
      setSeedError("Capture session expired or is invalid.");
      return;
    }

    setSeed(loaded);
    setSeedError(null);
  }, [token, tradeId]);

  if (seedError) {
    return (
      <div
        className="flex h-screen flex-col items-center justify-center gap-3 bg-[var(--edge-background)] px-6 text-center"
        data-testid="journal-capture-studio-missing-seed"
      >
        <p className="text-sm text-[var(--edge-negative)]">{seedError}</p>
        <EdgeButton type="button" variant="secondary" onClick={() => window.close()}>
          Close
        </EdgeButton>
      </div>
    );
  }

  if (!seed) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-[var(--edge-background)] text-sm text-[var(--edge-text-secondary)]"
        data-testid="journal-capture-studio-loading"
      >
        Loading capture studio…
      </div>
    );
  }

  return (
    <AppChromeProviders>
      <ChartSyncProvider linkCrosshair={false} linkDrawings={false}>
        <ActiveChartProvider>
          <JournalCaptureStudioInner seed={seed} token={token} />
        </ActiveChartProvider>
      </ChartSyncProvider>
    </AppChromeProviders>
  );
}
