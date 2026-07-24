"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ChartCell from "../ChartCell";
import { EdgeButton } from "../design-system";
import EdgeModalShell from "../design-system/EdgeModalShell";
import { useAppThemeOptional } from "../AppThemeProvider";
import { DEFAULT_LAYOUT, DEFAULT_TOOLBAR_PREFS, type CellConfig } from "@/lib/chartConfig";
import { buildJournalExecutionMarkers } from "@/lib/journal/journalExecutionMarkers";
import type { JournalTrade } from "@/lib/journal/types";
import type { JournalFillResponse, JournalTradeResponse } from "@/lib/persistence/schemas/journal";
import type { JournalChartSnapshotResponse } from "@/lib/persistence/schemas/journal";
import { patchJournalTradeChartSnapshotRemote } from "@/lib/persistence/client/journalClient";

type Props = {
  open: boolean;
  onClose: () => void;
  trade: JournalTradeResponse;
  fills: JournalFillResponse[];
  snapshot: JournalChartSnapshotResponse;
  onSnapshotUpdated?: (snapshot: JournalChartSnapshotResponse) => void;
};

const SAVE_DEBOUNCE_MS = 800;

export default function TradeChartForkModal({
  open,
  onClose,
  trade,
  fills,
  snapshot,
  onSnapshotUpdated,
}: Props) {
  const theme = useAppThemeOptional()?.theme ?? DEFAULT_LAYOUT.theme;
  const [cellConfig, setCellConfig] = useState<CellConfig>(
    () => snapshot.cellConfig as CellConfig,
  );
  const [toolbarPrefs, setToolbarPrefs] = useState(DEFAULT_TOOLBAR_PREFS);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimerRef = useRef<number | null>(null);
  const pendingConfigRef = useRef<CellConfig | null>(null);

  useEffect(() => {
    if (!open) return;
    setCellConfig(snapshot.cellConfig as CellConfig);
    setSaveState("idle");
  }, [open, snapshot.id, snapshot.updatedAt, snapshot.cellConfig]);

  const markers = useMemo(
    () => buildJournalExecutionMarkers(trade as JournalTrade, fills),
    [trade, fills],
  );

  const flushSave = useCallback(async () => {
    const nextConfig = pendingConfigRef.current;
    if (!nextConfig) return;
    pendingConfigRef.current = null;
    setSaveState("saving");
    const updated = await patchJournalTradeChartSnapshotRemote(trade.id, snapshot.id, {
      cellConfig: nextConfig,
    });
    if (!updated) {
      setSaveState("error");
      return;
    }
    setSaveState("saved");
    onSnapshotUpdated?.(updated);
  }, [onSnapshotUpdated, snapshot.id, trade.id]);

  const scheduleSave = useCallback(
    (next: CellConfig) => {
      pendingConfigRef.current = next;
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        void flushSave();
      }, SAVE_DEBOUNCE_MS);
    },
    [flushSave],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const handleConfigChange = useCallback(
    (next: CellConfig) => {
      setCellConfig(next);
      scheduleSave(next);
    },
    [scheduleSave],
  );

  async function handleResetToCapture() {
    const updated = await patchJournalTradeChartSnapshotRemote(trade.id, snapshot.id, {
      resetToOriginal: true,
    });
    if (!updated) {
      setSaveState("error");
      return;
    }
    setCellConfig(updated.cellConfig as CellConfig);
    setSaveState("saved");
    onSnapshotUpdated?.(updated);
  }

  return (
    <EdgeModalShell
      open={open}
      onClose={onClose}
      title={`${trade.symbol} trade chart`}
      subtitle="Editable fork — live data with capture-time markup. Entry/exit markers from fills."
      maxWidth="full"
      align="center"
      testId="trade-chart-fork-modal"
      headerActions={
        <span className="rounded border border-[var(--edge-border)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
          Trade chart fork
        </span>
      }
      footer={
        <>
          <span className="mr-auto text-[10px] text-[var(--edge-text-secondary)]">
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved"
                : saveState === "error"
                  ? "Save failed"
                  : "Edits save automatically"}
          </span>
          <EdgeButton type="button" variant="secondary" onClick={() => void handleResetToCapture()}>
            Reset to capture
          </EdgeButton>
          <EdgeButton type="button" onClick={onClose}>
            Close
          </EdgeButton>
        </>
      }
    >
      <div className="h-[min(72vh,820px)] min-h-[420px] border-t border-[var(--edge-border)]">
        <ChartCell
          chartId={`trade-fork-${snapshot.id}`}
          config={cellConfig}
          theme={theme}
          compact
          isActive={false}
          live
          showDrawingRail={false}
          toolbarPrefs={toolbarPrefs}
          onConfigChange={handleConfigChange}
          onToolbarPrefsChange={setToolbarPrefs}
          journalAnnotationMarkersOverride={markers}
        />
      </div>
    </EdgeModalShell>
  );
}
