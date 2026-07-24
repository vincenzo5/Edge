"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useActiveChart } from "@/app/components/ActiveChartContext";
import { EdgeButton } from "@/app/components/design-system";
import {
  SnapshotCaptureError,
  snapshotErrorMessage,
} from "@/lib/chart/chartSnapshot";
import {
  JOURNAL_SCREENSHOT_MAX_PER_TRADE,
  normalizeScreenshotFile,
} from "@/lib/journal/localScreenshotStore";
import type { JournalScreenshotResponse } from "@/lib/persistence/schemas/journal";
import {
  deleteJournalTradeScreenshotRemote,
  fetchJournalTradeScreenshots,
  journalTradeScreenshotImageUrl,
  patchJournalTradeScreenshotRemote,
  resolveJournalTradeScreenshotBlobUrl,
  uploadJournalTradeScreenshot,
} from "@/lib/persistence/client/journalClient";

type Props = {
  tradeId: string;
};

type ThumbnailState = JournalScreenshotResponse & {
  previewUrl: string;
};

export default function JournalTradeScreenshots({ tradeId }: Props) {
  const activeChart = useActiveChart();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenshots, setScreenshots] = useState<ThumbnailState[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const previewUrlsRef = useRef<string[]>([]);
  const pendingRevokeRef = useRef<string[]>([]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const revokePreviewUrls = useCallback((urls: string[]) => {
    for (const url of urls) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const loadScreenshots = useCallback(async () => {
    setLoading(true);
    setError(null);
    const previousUrls = previewUrlsRef.current;
    try {
      const rows = await fetchJournalTradeScreenshots(tradeId);
      const withUrls: ThumbnailState[] = [];
      const nextPreviewUrls: string[] = [];
      for (const row of rows) {
        const previewUrl =
          (await resolveJournalTradeScreenshotBlobUrl(tradeId, row.id)) ??
          journalTradeScreenshotImageUrl(tradeId, row.id);
        if (previewUrl.startsWith("blob:")) {
          nextPreviewUrls.push(previewUrl);
        }
        withUrls.push({ ...row, previewUrl });
      }
      previewUrlsRef.current = nextPreviewUrls;
      pendingRevokeRef.current = previousUrls;
      setScreenshots(withUrls);
    } catch {
      setError("Could not load screenshots.");
      setScreenshots([]);
      previewUrlsRef.current = [];
      pendingRevokeRef.current = previousUrls;
    } finally {
      setLoading(false);
    }
  }, [tradeId]);

  // Revoke superseded blob URLs only after the new <img src> values have painted.
  useEffect(() => {
    const toRevoke = pendingRevokeRef.current;
    if (toRevoke.length === 0) return;
    pendingRevokeRef.current = [];
    const frame = requestAnimationFrame(() => {
      revokePreviewUrls(toRevoke);
    });
    return () => cancelAnimationFrame(frame);
  }, [screenshots, revokePreviewUrls]);

  useEffect(() => {
    void loadScreenshots();
    return () => {
      revokePreviewUrls(previewUrlsRef.current);
      previewUrlsRef.current = [];
      revokePreviewUrls(pendingRevokeRef.current);
      pendingRevokeRef.current = [];
    };
  }, [loadScreenshots, revokePreviewUrls]);

  async function handleUpload(file: Blob, source: "upload" | "paste" | "chart_capture") {
    if (screenshots.length >= JOURNAL_SCREENSHOT_MAX_PER_TRADE) {
      setError(`Maximum ${JOURNAL_SCREENSHOT_MAX_PER_TRADE} screenshots per trade.`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const normalized = normalizeScreenshotFile(file);
      const created = await uploadJournalTradeScreenshot(tradeId, normalized.blob, {
        source,
        filename: source === "chart_capture" ? "chart-capture.png" : "screenshot.png",
      });
      if (!created) {
        setError("Screenshot upload failed.");
        return;
      }
      await loadScreenshots();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Screenshot upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(screenshotId: string) {
    const deleted = await deleteJournalTradeScreenshotRemote(tradeId, screenshotId);
    if (!deleted) {
      setError("Could not delete screenshot.");
      return;
    }
    if (lightboxId === screenshotId) setLightboxId(null);
    await loadScreenshots();
  }

  async function handleCaptionChange(screenshotId: string, caption: string) {
    const updated = await patchJournalTradeScreenshotRemote(tradeId, screenshotId, {
      caption: caption.trim() || null,
    });
    if (!updated) return;
    setScreenshots((prev) =>
      prev.map((row) => (row.id === screenshotId ? { ...row, caption: updated.caption ?? null } : row)),
    );
  }

  async function handleCaptureChart() {
    if (!activeChart?.chartCommands.canCaptureSnapshot()) {
      setError("No chart available to capture.");
      return;
    }
    try {
      const blob = await activeChart.chartCommands.captureSnapshot({ includeCrosshair: false });
      await handleUpload(blob, "chart_capture");
    } catch (captureError) {
      if (captureError instanceof SnapshotCaptureError) {
        setError(snapshotErrorMessage(captureError.reason));
        return;
      }
      setError("Chart capture failed.");
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (!item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (!file) continue;
      event.preventDefault();
      void handleUpload(file, "paste");
      return;
    }
  }

  const canCapture = activeChart?.chartCommands.canCaptureSnapshot() ?? false;
  const lightbox = lightboxId ? screenshots.find((row) => row.id === lightboxId) ?? null : null;
  const heroShot = screenshots[0] ?? null;
  const thumbShots = screenshots.slice(1);
  const atLimit = screenshots.length >= JOURNAL_SCREENSHOT_MAX_PER_TRADE;

  return (
    <section
      className="space-y-3"
      data-testid="journal-trade-screenshots"
      onPaste={handlePaste}
      tabIndex={0}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
          Screenshots
        </div>
        <div className="text-[10px] text-[var(--edge-text-secondary)]">
          {screenshots.length}/{JOURNAL_SCREENSHOT_MAX_PER_TRADE}
        </div>
      </div>

      {loading ? (
        <div
          className="flex aspect-video items-center justify-center rounded border border-dashed border-[var(--edge-border-subtle)] bg-[var(--edge-surface-elevated)]"
          data-testid="journal-trade-screenshots-loading"
        >
          <p className="text-xs text-[var(--edge-text-secondary)]">Loading screenshots…</p>
        </div>
      ) : heroShot ? (
        <div
          className="group relative overflow-hidden rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-elevated)]"
          data-testid="journal-trade-screenshots-hero"
        >
          <button
            type="button"
            className="block w-full px-1 py-1"
            onClick={() => setLightboxId(heroShot.id)}
            aria-label="Open screenshot preview"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroShot.previewUrl}
              alt={heroShot.caption ?? "Trade screenshot"}
              className="mx-auto max-h-80 w-full object-contain"
            />
          </button>
          <button
            type="button"
            className="absolute right-2 top-2 rounded bg-[var(--edge-surface-panel)]/90 px-2 py-1 text-[10px] text-[var(--edge-text-secondary)] opacity-0 transition group-hover:opacity-100"
            onClick={() => void handleDelete(heroShot.id)}
            aria-label="Delete screenshot"
          >
            Delete
          </button>
          <input
            className="w-full border-t border-[var(--edge-border-subtle)] bg-transparent px-2 py-1.5 text-xs text-[var(--edge-text-primary)]"
            placeholder="Caption"
            defaultValue={heroShot.caption ?? ""}
            onBlur={(event) => void handleCaptionChange(heroShot.id, event.target.value)}
          />
        </div>
      ) : (
        <div
          className="flex aspect-video flex-col items-center justify-center gap-3 rounded border border-dashed border-[var(--edge-border-subtle)] bg-[var(--edge-surface-elevated)] px-4 text-center"
          data-testid="journal-trade-screenshots-empty"
        >
          <p className="text-sm text-[var(--edge-text-secondary)]">Add a screenshot to remember this trade</p>
          <div className="flex flex-wrap justify-center gap-2">
            <EdgeButton
              variant="secondary"
              disabled={uploading || atLimit}
              onClick={() => fileInputRef.current?.click()}
              data-testid="journal-trade-screenshots-upload"
            >
              Upload
            </EdgeButton>
            <EdgeButton
              variant="secondary"
              disabled={uploading || atLimit || !canCapture}
              onClick={() => void handleCaptureChart()}
              data-testid="journal-trade-screenshots-capture"
              title={canCapture ? "Capture active chart" : "Open a chart to capture"}
            >
              Capture chart
            </EdgeButton>
          </div>
          <p className="text-[10px] text-[var(--edge-text-secondary)]">
            Paste an image while this section is focused. PNG, JPEG, or WebP up to 5 MB each.
          </p>
        </div>
      )}

      {error ? (
        <p className="text-xs text-[var(--edge-negative)]" data-testid="journal-trade-screenshots-error">
          {error}
        </p>
      ) : null}

      {heroShot ? (
        <>
          {thumbShots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {thumbShots.map((shot) => (
                <div
                  key={shot.id}
                  className="group relative overflow-hidden rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-elevated)]"
                  data-testid={`journal-trade-screenshot-${shot.id}`}
                >
                  <button
                    type="button"
                    className="block aspect-[4/3] w-full"
                    onClick={() => setLightboxId(shot.id)}
                    aria-label="Open screenshot preview"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shot.previewUrl}
                      alt={shot.caption ?? "Trade screenshot"}
                      className="h-full w-full bg-[var(--edge-surface-panel)] object-contain"
                    />
                  </button>
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded bg-[var(--edge-surface-panel)]/90 px-1.5 py-0.5 text-[10px] text-[var(--edge-text-secondary)] opacity-0 transition group-hover:opacity-100"
                    onClick={() => void handleDelete(shot.id)}
                    aria-label="Delete screenshot"
                  >
                    Delete
                  </button>
                  <input
                    className="w-full border-t border-[var(--edge-border-subtle)] bg-transparent px-1.5 py-1 text-[10px] text-[var(--edge-text-primary)]"
                    placeholder="Caption"
                    defaultValue={shot.caption ?? ""}
                    onBlur={(event) => void handleCaptionChange(shot.id, event.target.value)}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void handleUpload(file, "upload");
              }}
            />
            <EdgeButton
              variant="secondary"
              disabled={uploading || atLimit}
              onClick={() => fileInputRef.current?.click()}
              data-testid="journal-trade-screenshots-upload"
            >
              Upload
            </EdgeButton>
            <EdgeButton
              variant="secondary"
              disabled={uploading || atLimit || !canCapture}
              onClick={() => void handleCaptureChart()}
              data-testid="journal-trade-screenshots-capture"
              title={canCapture ? "Capture active chart" : "Open a chart to capture"}
            >
              Capture chart
            </EdgeButton>
          </div>
          <p className="text-[10px] text-[var(--edge-text-secondary)]">
            Paste an image while this section is focused. PNG, JPEG, or WebP up to 5 MB each.
          </p>
        </>
      ) : (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void handleUpload(file, "upload");
          }}
        />
      )}

      {lightbox && portalReady
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 sm:p-8"
              data-testid="journal-trade-screenshots-lightbox"
              onClick={() => setLightboxId(null)}
            >
              <div
                className="flex max-h-[96vh] w-full max-w-[96vw] flex-col items-center"
                onClick={(event) => event.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightbox.previewUrl}
                  alt={lightbox.caption ?? "Trade screenshot"}
                  className="max-h-[88vh] max-w-full object-contain"
                />
                {lightbox.caption ? (
                  <p className="mt-3 text-center text-sm text-white">{lightbox.caption}</p>
                ) : null}
                <div className="mt-3 flex justify-center">
                  <EdgeButton variant="secondary" onClick={() => setLightboxId(null)}>
                    Close
                  </EdgeButton>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
