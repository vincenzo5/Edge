"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useActiveChart } from "@/app/components/ActiveChartContext";
import { useAppThemeOptional } from "@/app/components/AppThemeProvider";
import {
  CaptionIcon,
  CheckIcon,
  CloseIcon,
  TrashIcon,
} from "@/app/components/chart-chrome/ChartHeaderIcons";
import { EdgeButton } from "@/app/components/design-system";
import EdgeIconButton from "@/app/components/design-system/EdgeIconButton";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import {
  subscribeCaptureChannel,
  type CaptureDoneMessage,
} from "@/lib/journal/captureChannel";
import {
  buildJournalCaptureSeed,
  createCaptureToken,
  writeCaptureSeed,
} from "@/lib/journal/captureSeed";
import {
  JOURNAL_SCREENSHOT_MAX_PER_TRADE,
  normalizeScreenshotFile,
} from "@/lib/journal/localScreenshotStore";
import { openJournalCaptureWindow } from "@/lib/journal/openJournalCaptureWindow";
import { resolveJournalTradeIdForPersistence } from "@/lib/journal/resolveJournalTradeIdForPersistence";
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
  symbol: string;
  openedAt?: string;
  closedAt?: string | null;
  fillExecIds?: string[];
};

type ThumbnailState = JournalScreenshotResponse & {
  previewUrl: string;
};

export default function JournalTradeScreenshots({
  tradeId,
  symbol,
  openedAt,
  closedAt,
  fillExecIds,
}: Props) {
  const activeChart = useActiveChart();
  const theme = useAppThemeOptional()?.theme ?? DEFAULT_LAYOUT.theme;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRequestIdRef = useRef<string | null>(null);
  const captureWindowRef = useRef<Window | null>(null);
  const [effectiveTradeId, setEffectiveTradeId] = useState(tradeId);
  const effectiveTradeIdRef = useRef(tradeId);
  const [screenshots, setScreenshots] = useState<ThumbnailState[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openingCapture, setOpeningCapture] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [activeScreenshotId, setActiveScreenshotId] = useState<string | null>(null);
  const [captionPopoverOpen, setCaptionPopoverOpen] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [captionSaving, setCaptionSaving] = useState(false);
  const captionEditorRef = useRef<HTMLDivElement>(null);
  const previousActiveScreenshotIdRef = useRef<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const previewUrlsRef = useRef<string[]>([]);
  const pendingRevokeRef = useRef<string[]>([]);
  const loadSequenceRef = useRef(0);

  useEffect(() => {
    if (screenshots.length === 0) {
      setActiveScreenshotId(null);
      return;
    }
    setActiveScreenshotId((current) =>
      current && screenshots.some((row) => row.id === current) ? current : screenshots[0]!.id,
    );
  }, [screenshots]);

  useEffect(() => {
    const previousActiveScreenshotId = previousActiveScreenshotIdRef.current;
    previousActiveScreenshotIdRef.current = activeScreenshotId;
    if (
      previousActiveScreenshotId !== null &&
      previousActiveScreenshotId !== activeScreenshotId
    ) {
      setCaptionPopoverOpen(false);
    }
  }, [activeScreenshotId]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const revokePreviewUrls = useCallback((urls: string[]) => {
    for (const url of urls) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const loadScreenshots = useCallback(
    async (
      overrideTradeId?: string,
      options?: {
        preserveExistingOnEmpty?: boolean;
        background?: boolean;
      },
    ) => {
    const persistedTradeId = overrideTradeId ?? effectiveTradeIdRef.current;
    const loadSequence = ++loadSequenceRef.current;
    const background = options?.background ?? false;
    if (!background) {
      setLoading(true);
      setError(null);
    }
    const previousUrls = previewUrlsRef.current;
    try {
      const rows = await fetchJournalTradeScreenshots(persistedTradeId);
      const withUrls: ThumbnailState[] = [];
      const nextPreviewUrls: string[] = [];
      for (const row of rows) {
        const previewUrl =
          (await resolveJournalTradeScreenshotBlobUrl(persistedTradeId, row.id)) ??
          journalTradeScreenshotImageUrl(persistedTradeId, row.id);
        if (previewUrl.startsWith("blob:")) {
          nextPreviewUrls.push(previewUrl);
        }
        withUrls.push({ ...row, previewUrl });
      }
      if (loadSequence !== loadSequenceRef.current) {
        revokePreviewUrls(nextPreviewUrls);
        return;
      }
      if (withUrls.length === 0 && options?.preserveExistingOnEmpty) {
        return;
      }
      previewUrlsRef.current = nextPreviewUrls;
      pendingRevokeRef.current = previousUrls;
      setScreenshots(withUrls);
    } catch {
      if (loadSequence !== loadSequenceRef.current) return;
      if (options?.preserveExistingOnEmpty) return;
      setError("Could not load screenshots.");
      setScreenshots([]);
      previewUrlsRef.current = [];
      pendingRevokeRef.current = previousUrls;
    } finally {
      if (loadSequence === loadSequenceRef.current && !background) setLoading(false);
    }
  },
    [revokePreviewUrls],
  );

  const applyCaptureDone = useCallback(
    async (message: CaptureDoneMessage) => {
      pendingRequestIdRef.current = null;
      captureWindowRef.current = null;
      setOpeningCapture(false);
      setError(null);
      effectiveTradeIdRef.current = message.tradeId;
      setEffectiveTradeId(message.tradeId);

      const previewUrl =
        (await resolveJournalTradeScreenshotBlobUrl(message.tradeId, message.screenshotId)) ??
        journalTradeScreenshotImageUrl(message.tradeId, message.screenshotId);

      const optimistic: ThumbnailState = {
        id: message.screenshotId,
        tradeId: message.tradeId,
        sortIndex: 0,
        caption: null,
        mimeType: "image/png",
        byteSize: 0,
        width: null,
        height: null,
        source: "chart_capture",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        previewUrl,
      };

      setScreenshots((prev) => {
        if (prev.some((row) => row.id === message.screenshotId)) return prev;
        return [optimistic, ...prev];
      });

      void loadScreenshots(message.tradeId, {
        preserveExistingOnEmpty: true,
        background: true,
      });
    },
    [loadScreenshots],
  );

  useEffect(() => {
    let cancelled = false;
    effectiveTradeIdRef.current = tradeId;
    setEffectiveTradeId(tradeId);

    void (async () => {
      const resolved = await resolveJournalTradeIdForPersistence({ tradeId, fillExecIds });
      if (!cancelled && resolved) {
        effectiveTradeIdRef.current = resolved;
        setEffectiveTradeId(resolved);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tradeId, fillExecIds]);

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
  }, [effectiveTradeId, loadScreenshots, revokePreviewUrls]);

  useEffect(() => {
    return subscribeCaptureChannel((message) => {
      const pendingRequestId = pendingRequestIdRef.current;
      if (pendingRequestId) {
        if (message.requestId !== pendingRequestId) return;
      } else if (
        message.tradeId !== effectiveTradeIdRef.current &&
        message.tradeId !== tradeId
      ) {
        return;
      }

      if (message.type === "captureDone") {
        void applyCaptureDone(message);
        return;
      }

      if (message.type === "captureFailed") {
        pendingRequestIdRef.current = null;
        captureWindowRef.current = null;
        setOpeningCapture(false);
        setError(message.error);
        return;
      }

      if (message.type === "captureCancelled") {
        pendingRequestIdRef.current = null;
        captureWindowRef.current = null;
        setOpeningCapture(false);
      }
    });
  }, [applyCaptureDone, loadScreenshots, tradeId]);

  useEffect(() => {
    if (!openingCapture) return;

    const pollCaptureWindow = window.setInterval(() => {
      const captureWindow = captureWindowRef.current;
      if (captureWindow && !captureWindow.closed) return;
      if (!pendingRequestIdRef.current) return;

      void (async () => {
        const resolvedTradeId = await resolveJournalTradeIdForPersistence({
          tradeId,
          fillExecIds,
        });
        const persistedTradeId = resolvedTradeId ?? effectiveTradeIdRef.current;
        effectiveTradeIdRef.current = persistedTradeId;
        setEffectiveTradeId(persistedTradeId);
        await loadScreenshots(persistedTradeId);
        pendingRequestIdRef.current = null;
        captureWindowRef.current = null;
        setOpeningCapture(false);
      })();
    }, 400);

    return () => window.clearInterval(pollCaptureWindow);
  }, [fillExecIds, loadScreenshots, openingCapture, tradeId]);

  useEffect(() => {
    const refreshAfterPopupActivity = () => {
      if (!pendingRequestIdRef.current) return;
      window.setTimeout(() => {
        void (async () => {
          const resolvedTradeId = await resolveJournalTradeIdForPersistence({
            tradeId,
            fillExecIds,
          });
          const persistedTradeId = resolvedTradeId ?? effectiveTradeIdRef.current;
          effectiveTradeIdRef.current = persistedTradeId;
          setEffectiveTradeId(persistedTradeId);
          await loadScreenshots(persistedTradeId);

          if (!captureWindowRef.current || captureWindowRef.current.closed) {
            pendingRequestIdRef.current = null;
            captureWindowRef.current = null;
            setOpeningCapture(false);
          }
        })();
      }, 100);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshAfterPopupActivity();
    };

    window.addEventListener("focus", refreshAfterPopupActivity);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", refreshAfterPopupActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fillExecIds, loadScreenshots, tradeId]);

  async function handleUpload(file: Blob, source: "upload" | "paste" | "chart_capture") {
    if (screenshots.length >= JOURNAL_SCREENSHOT_MAX_PER_TRADE) {
      setError(`Maximum ${JOURNAL_SCREENSHOT_MAX_PER_TRADE} screenshots per trade.`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const normalized = normalizeScreenshotFile(file);
      const created = await uploadJournalTradeScreenshot(effectiveTradeId, normalized.blob, {
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
    const deleted = await deleteJournalTradeScreenshotRemote(effectiveTradeId, screenshotId);
    if (!deleted) {
      setError("Could not delete screenshot.");
      return;
    }
    if (lightboxId === screenshotId) setLightboxId(null);
    if (activeScreenshotId === screenshotId) setActiveScreenshotId(null);
    await loadScreenshots();
  }

  async function handleCaptionChange(screenshotId: string, caption: string) {
    const updated = await patchJournalTradeScreenshotRemote(effectiveTradeId, screenshotId, {
      caption: caption.trim() || null,
    });
    if (!updated) return false;
    setScreenshots((prev) =>
      prev.map((row) => (row.id === screenshotId ? { ...row, caption: updated.caption ?? null } : row)),
    );
    return true;
  }

  async function saveCaptionDraft() {
    if (!activeShot) {
      setCaptionPopoverOpen(false);
      return;
    }
    const trimmed = captionDraft.trim();
    if (trimmed !== (activeShot.caption ?? "").trim()) {
      setCaptionSaving(true);
      setError(null);
      try {
        const saved = await handleCaptionChange(activeShot.id, captionDraft);
        if (!saved) {
          setError("Could not save screenshot caption.");
          return;
        }
      } catch {
        setError("Could not save screenshot caption.");
        return;
      } finally {
        setCaptionSaving(false);
      }
    }
    setCaptionPopoverOpen(false);
  }

  function cancelCaptionDraft() {
    setCaptionDraft(activeShot?.caption ?? "");
    setCaptionPopoverOpen(false);
  }

  useEffect(() => {
    if (!captionPopoverOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (captionEditorRef.current?.contains(target)) return;
      setCaptionPopoverOpen(false);
      setCaptionDraft(() => {
        const shot =
          screenshots.find((row) => row.id === activeScreenshotId) ?? screenshots[0] ?? null;
        return shot?.caption ?? "";
      });
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [captionPopoverOpen, screenshots, activeScreenshotId]);

  function openCaptionPopover() {
    if (!activeShot) return;
    setCaptionDraft(activeShot.caption ?? "");
    setCaptionPopoverOpen(true);
  }

  async function handleCaptureChart() {
    if (screenshots.length >= JOURNAL_SCREENSHOT_MAX_PER_TRADE) {
      setError(`Maximum ${JOURNAL_SCREENSHOT_MAX_PER_TRADE} screenshots per trade.`);
      return;
    }

    setOpeningCapture(true);
    setError(null);

    const resolvedTradeId = await resolveJournalTradeIdForPersistence({
      tradeId,
      fillExecIds,
    });
    if (!resolvedTradeId) {
      setOpeningCapture(false);
      setError("Journal trade not found. Sync journal and try again.");
      return;
    }

    effectiveTradeIdRef.current = resolvedTradeId;
    setEffectiveTradeId(resolvedTradeId);

    const token = createCaptureToken();
    const seed = buildJournalCaptureSeed({
      trade: { id: resolvedTradeId, symbol, openedAt, closedAt, fillExecIds },
      activeCellConfig: activeChart?.config ?? null,
      theme,
    });

    writeCaptureSeed(token, seed);
    pendingRequestIdRef.current = seed.requestId;

    const opened = openJournalCaptureWindow({ token, tradeId: resolvedTradeId });
    if (!opened.ok) {
      pendingRequestIdRef.current = null;
      setOpeningCapture(false);
      setError("Popup blocked. Allow popups for this site, then try again.");
      return;
    }
    captureWindowRef.current = opened.window;
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

  const lightbox = lightboxId ? screenshots.find((row) => row.id === lightboxId) ?? null : null;
  const activeShot =
    screenshots.find((row) => row.id === activeScreenshotId) ?? screenshots[0] ?? null;
  const filmstripShots = activeShot
    ? screenshots.filter((row) => row.id !== activeShot.id)
    : [];
  const activeCaption = activeShot?.caption?.trim() ?? "";
  const atLimit = screenshots.length >= JOURNAL_SCREENSHOT_MAX_PER_TRADE;
  const captureDisabled = uploading || openingCapture || atLimit;

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
      ) : activeShot ? (
        <div
          className="flex gap-3 rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-elevated)]"
          data-testid="journal-trade-screenshots-hero"
        >
          {activeCaption ? (
            <aside
              className="flex w-[5.5rem] shrink-0 items-start px-2 py-3"
              data-testid="journal-trade-screenshots-caption"
            >
              <p className="break-words text-[11px] leading-snug text-[var(--edge-text-secondary)]">
                {activeCaption}
              </p>
            </aside>
          ) : null}
          <div className="group/image relative min-w-0 flex-1">
            <button
              type="button"
              className="block w-full px-1 py-1"
              onClick={() => {
                if (captionPopoverOpen) return;
                setLightboxId(activeShot.id);
              }}
              aria-label="Open screenshot preview"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeShot.previewUrl}
                alt={activeShot.caption ?? "Trade screenshot"}
                className="mx-auto max-h-80 w-full object-contain"
              />
            </button>
            <div className="absolute right-2 top-2 z-20">
              <div
                ref={captionEditorRef}
                className={`flex flex-col items-end gap-1 transition ${
                  captionPopoverOpen ? "opacity-100" : "opacity-0 group-hover/image:opacity-100"
                }`}
              >
                <div className="flex items-center gap-1">
                  <EdgeIconButton
                    size="compact"
                    aria-label="Edit caption"
                    aria-expanded={captionPopoverOpen}
                    data-testid="journal-trade-screenshots-caption-trigger"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      openCaptionPopover();
                    }}
                  >
                    <CaptionIcon size={14} />
                  </EdgeIconButton>
                  <EdgeIconButton
                    size="compact"
                    aria-label="Delete screenshot"
                    data-testid="journal-trade-screenshots-delete"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(activeShot.id);
                    }}
                  >
                    <TrashIcon size={14} />
                  </EdgeIconButton>
                </div>
                {captionPopoverOpen ? (
                  <div
                    className="w-56 rounded-[var(--edge-radius-lg)] border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-popover)] p-2 shadow-[var(--edge-shadow-popover)]"
                    data-testid="journal-trade-screenshots-caption-popover"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--edge-text-secondary)]">
                        Caption
                      </span>
                      <input
                        type="text"
                        autoFocus
                        data-testid="journal-trade-screenshots-caption-input"
                        value={captionDraft}
                        onChange={(event) => setCaptionDraft(event.target.value)}
                        placeholder="Add a caption…"
                        className="w-full rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-panel)] px-2 py-1.5 text-xs text-[var(--edge-text-primary)] outline-none focus:border-[var(--edge-border-strong)]"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void saveCaptionDraft();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            cancelCaptionDraft();
                          }
                        }}
                      />
                    </label>
                    <div className="mt-2 flex justify-end gap-1">
                      <EdgeIconButton
                        size="compact"
                        aria-label="Save caption"
                        data-testid="journal-trade-screenshots-caption-save"
                        disabled={captionSaving}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          void saveCaptionDraft();
                        }}
                      >
                        <CheckIcon size={14} />
                      </EdgeIconButton>
                      <EdgeIconButton
                        size="compact"
                        aria-label="Cancel caption"
                        data-testid="journal-trade-screenshots-caption-cancel"
                        disabled={captionSaving}
                        onClick={cancelCaptionDraft}
                      >
                        <CloseIcon size={14} />
                      </EdgeIconButton>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
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
              disabled={captureDisabled}
              onClick={handleCaptureChart}
              data-testid="journal-trade-screenshots-capture"
              title="Open a chart window to mark up and capture"
            >
              {openingCapture ? "Opening chart…" : "Capture chart"}
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

      {activeShot ? (
        <>
          {filmstripShots.length > 0 ? (
            <div
              className="flex gap-1.5 overflow-x-auto pb-0.5"
              data-testid="journal-trade-screenshots-filmstrip"
            >
              {filmstripShots.map((shot) => (
                <button
                  key={shot.id}
                  type="button"
                  className="relative h-12 w-[4.5rem] shrink-0 overflow-hidden rounded border border-[var(--edge-border-subtle)] bg-[var(--edge-surface-elevated)] hover:border-[var(--edge-border-strong)]"
                  data-testid={`journal-trade-screenshot-${shot.id}`}
                  onClick={() => setActiveScreenshotId(shot.id)}
                  aria-label={shot.caption?.trim() || "View screenshot"}
                  title={shot.caption?.trim() || undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shot.previewUrl}
                    alt={shot.caption ?? "Trade screenshot thumbnail"}
                    className="h-full w-full object-cover"
                  />
                </button>
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
              disabled={captureDisabled}
              onClick={handleCaptureChart}
              data-testid="journal-trade-screenshots-capture"
              title="Open a chart window to mark up and capture"
            >
              {openingCapture ? "Opening chart…" : "Capture chart"}
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
