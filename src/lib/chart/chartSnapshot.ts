import { toBlob } from 'html-to-image';

export type SnapshotError =
  | 'no_element'
  | 'no_data'
  | 'zero_size'
  | 'capture_failed'
  | 'clipboard_unsupported'
  | 'clipboard_denied'
  | 'popup_blocked';

export type SnapshotCaptureOptions = {
  includeCrosshair?: boolean;
  pixelRatio?: number;
};

export type SnapshotAction = 'download' | 'copy' | 'open';

export type SnapshotActionResult =
  | { ok: true }
  | { ok: false; reason: SnapshotError };

export class SnapshotCaptureError extends Error {
  readonly reason: SnapshotError;

  constructor(reason: SnapshotError) {
    super(reason);
    this.name = 'SnapshotCaptureError';
    this.reason = reason;
  }
}

export function snapshotErrorMessage(reason: SnapshotError): string {
  switch (reason) {
    case 'no_element':
      return 'Chart area is not available.';
    case 'no_data':
      return 'Chart is still loading.';
    case 'zero_size':
      return 'Chart area has no visible size.';
    case 'capture_failed':
      return 'Could not capture the chart image.';
    case 'clipboard_unsupported':
      return 'Copying images is not supported in this browser. Try Download instead.';
    case 'clipboard_denied':
      return 'Clipboard access was denied. Try Download instead.';
    case 'popup_blocked':
      return 'Pop-up blocked — allow pop-ups for this site, or use Download instead.';
    default:
      return 'Snapshot failed.';
  }
}

export function validateSnapshotReady(
  el: HTMLElement | null | undefined,
  candleCount: number,
): SnapshotError | null {
  if (!el) return 'no_element';
  if (candleCount <= 0) return 'no_data';
  const rect = el.getBoundingClientRect();
  if (rect.width <= 1 || rect.height <= 1) return 'zero_size';
  return null;
}

export function validateBlob(blob: Blob | null | undefined): SnapshotError | null {
  if (!blob) return 'capture_failed';
  if (blob.size <= 0) return 'capture_failed';
  if (blob.type !== 'image/png') return 'capture_failed';
  return null;
}

export function canCopyImageToClipboard(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.isSecureContext) return false;
  if (typeof navigator === 'undefined' || !navigator.clipboard?.write) return false;
  return typeof ClipboardItem !== 'undefined';
}

export function buildSnapshotFilename(symbol: string, interval: string): string {
  const safeSymbol = symbol.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeInterval = interval.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `${safeSymbol}_${safeInterval}_${ts}.png`;
}

export function waitFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let remaining = count;
    const step = () => {
      remaining -= 1;
      if (remaining <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function shouldExcludeFromSnapshot(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return false;
  return node.dataset.snapshotExclude != null;
}

function resolvePixelRatio(pixelRatio?: number): number {
  if (pixelRatio != null) return Math.min(Math.max(pixelRatio, 1), 2);
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

export async function captureChartElement(
  root: HTMLElement,
  opts?: SnapshotCaptureOptions & { candleCount?: number },
): Promise<Blob> {
  const readyError = validateSnapshotReady(root, opts?.candleCount ?? 1);
  if (readyError) throw new SnapshotCaptureError(readyError);

  const includeCrosshair = opts?.includeCrosshair ?? false;
  const crosshair = root.querySelector('[data-crosshair-overlay]');
  const crosshairEl = crosshair instanceof HTMLElement ? crosshair : null;
  const previousVisibility = crosshairEl?.style.visibility ?? null;

  if (!includeCrosshair && crosshairEl) {
    crosshairEl.style.visibility = 'hidden';
  }

  try {
    await waitFrames(2);

    const blob = await toBlob(root, {
      pixelRatio: resolvePixelRatio(opts?.pixelRatio),
      cacheBust: true,
      filter: (node) => !shouldExcludeFromSnapshot(node),
    });

    if (!blob) throw new SnapshotCaptureError('capture_failed');
    const blobError = validateBlob(blob);
    if (blobError) throw new SnapshotCaptureError(blobError);
    return blob;
  } catch (error) {
    if (error instanceof SnapshotCaptureError) throw error;
    throw new SnapshotCaptureError('capture_failed');
  } finally {
    if (!includeCrosshair && crosshairEl) {
      crosshairEl.style.visibility = previousVisibility ?? '';
    }
  }
}

export function downloadBlob(blob: Blob, filename: string): SnapshotActionResult {
  if (typeof document === 'undefined') {
    return { ok: false, reason: 'capture_failed' };
  }

  const blobError = validateBlob(blob);
  if (blobError) return { ok: false, reason: blobError };

  let url: string | null = null;
  try {
    url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    return { ok: true };
  } catch {
    return { ok: false, reason: 'capture_failed' };
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

export async function copyBlobToClipboard(blob: Blob): Promise<SnapshotActionResult> {
  const blobError = validateBlob(blob);
  if (blobError) return { ok: false, reason: blobError };

  if (!canCopyImageToClipboard()) {
    return { ok: false, reason: 'clipboard_unsupported' };
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'clipboard_denied' };
  }
}

export function prepareSnapshotTab(): Window | null {
  if (typeof window === 'undefined') return null;
  return window.open('about:blank', '_blank', 'noopener,noreferrer');
}

export function openBlobInNewTab(blob: Blob, targetWindow?: Window | null): SnapshotActionResult {
  const blobError = validateBlob(blob);
  if (blobError) return { ok: false, reason: blobError };

  const win = targetWindow ?? prepareSnapshotTab();
  if (!win) return { ok: false, reason: 'popup_blocked' };

  let url: string | null = null;
  try {
    url = URL.createObjectURL(blob);
    win.location.href = url;
    window.setTimeout(() => {
      if (url) URL.revokeObjectURL(url);
    }, 60_000);
    return { ok: true };
  } catch {
    try {
      win.close();
    } catch {
      /* ignore */
    }
    if (url) URL.revokeObjectURL(url);
    return { ok: false, reason: 'capture_failed' };
  }
}

export async function runSnapshotAction(
  action: SnapshotAction,
  blob: Blob,
  filename: string,
  targetWindow?: Window | null,
): Promise<SnapshotActionResult> {
  switch (action) {
    case 'download':
      return downloadBlob(blob, filename);
    case 'copy':
      return copyBlobToClipboard(blob);
    case 'open':
      return openBlobInNewTab(blob, targetWindow);
    default:
      return { ok: false, reason: 'capture_failed' };
  }
}
