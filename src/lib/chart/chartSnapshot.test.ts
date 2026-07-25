/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildSnapshotFilename,
  canCopyImageToClipboard,
  captureChartElement,
  copyBlobToClipboard,
  downloadBlob,
  openBlobInNewTab,
  prepareChartElementForCapture,
  prepareSnapshotTab,
  SnapshotCaptureError,
  validateBlob,
  validateSnapshotReady,
} from './chartSnapshot';

const mockedToBlob = vi.fn();

vi.mock('html-to-image', () => ({
  toBlob: (...args: unknown[]) => mockedToBlob(...args),
}));

function makePngBlob(size = 32): Blob {
  return new Blob([new Uint8Array(size)], { type: 'image/png' });
}

describe('chartSnapshot validation', () => {
  it('validateSnapshotReady rejects missing element, no data, and zero size', () => {
    expect(validateSnapshotReady(null, 10)).toBe('no_element');
    expect(validateSnapshotReady(undefined, 10)).toBe('no_element');
    expect(validateSnapshotReady(document.createElement('div'), 0)).toBe('no_data');

    const el = document.createElement('div');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 0,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 0,
      toJSON: () => ({}),
    });
    expect(validateSnapshotReady(el, 5)).toBe('zero_size');
  });

  it('validateBlob rejects invalid blobs', () => {
    expect(validateBlob(null)).toBe('capture_failed');
    expect(validateBlob(makePngBlob(0))).toBe('capture_failed');
    expect(validateBlob(new Blob(['x'], { type: 'image/jpeg' }))).toBe('capture_failed');
    expect(validateBlob(makePngBlob())).toBeNull();
  });

  it('buildSnapshotFilename sanitizes symbol and interval', () => {
    const name = buildSnapshotFilename('BRK.B', '1d');
    expect(name.startsWith('BRK.B_1d_')).toBe(true);
    expect(name.endsWith('.png')).toBe(true);
    expect(buildSnapshotFilename('FOO/BAR', '5m')).toMatch(/^FOO_BAR_5m_/);
  });
});

describe('chartSnapshot clipboard helpers', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
  });

  it('canCopyImageToClipboard is false when ClipboardItem is missing', () => {
    const original = globalThis.ClipboardItem;
    // @ts-expect-error test override
    delete globalThis.ClipboardItem;
    expect(canCopyImageToClipboard()).toBe(false);
    globalThis.ClipboardItem = original;
  });

  it('copyBlobToClipboard writes PNG to clipboard', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { write },
    });
    globalThis.ClipboardItem = class ClipboardItem {
      constructor(public items: Record<string, Blob>) {}
    } as typeof ClipboardItem;

    const blob = makePngBlob();
    const result = await copyBlobToClipboard(blob);
    expect(result).toEqual({ ok: true });
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('copyBlobToClipboard returns clipboard_unsupported when unsupported', async () => {
    // @ts-expect-error test override
    delete globalThis.ClipboardItem;
    const result = await copyBlobToClipboard(makePngBlob());
    expect(result).toEqual({ ok: false, reason: 'clipboard_unsupported' });
  });
});

describe('chartSnapshot output helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloadBlob creates anchor and revokes URL', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      click,
      href: '',
      download: '',
    } as unknown as HTMLAnchorElement);

    const result = downloadBlob(makePngBlob(), 'AAPL_1d_test.png');
    expect(result).toEqual({ ok: true });
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('openBlobInNewTab sets location on provided window', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const win = { location: { href: '' }, close: vi.fn() } as unknown as Window;
    const result = openBlobInNewTab(makePngBlob(), win);
    expect(result).toEqual({ ok: true });
    expect(win.location.href).toBe('blob:mock');
  });

  it('openBlobInNewTab returns popup_blocked when window is null', () => {
    const result = openBlobInNewTab(makePngBlob(), null);
    expect(result).toEqual({ ok: false, reason: 'popup_blocked' });
  });

  it('prepareSnapshotTab delegates to window.open', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({ location: { href: '' } } as Window);
    prepareSnapshotTab();
    expect(open).toHaveBeenCalledWith('about:blank', '_blank', 'noopener,noreferrer');
  });
});

describe('prepareChartElementForCapture', () => {
  it('clears overlay inset padding when the chart is too narrow', async () => {
    const host = document.createElement('div');
    host.dataset.testid = 'chart-grid-host';
    host.style.paddingRight = '336px';
    const root = document.createElement('div');
    host.appendChild(root);
    document.body.appendChild(host);

    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 49,
      height: 900,
      top: 0,
      left: 0,
      bottom: 900,
      right: 49,
      toJSON: () => ({}),
    });

    const restore = await prepareChartElementForCapture(root);
    expect(host.style.paddingRight).toBe('0px');
    restore();
    expect(host.style.paddingRight).toBe('336px');
    host.remove();
  });

  it('restores overlay inset after temporarily clearing it', async () => {
    const host = document.createElement('div');
    host.dataset.testid = 'chart-grid-host';
    host.style.paddingRight = '336px';
    const root = document.createElement('div');
    host.appendChild(root);

    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      top: 0,
      left: 0,
      bottom: 300,
      right: 400,
      toJSON: () => ({}),
    });

    const restore = await prepareChartElementForCapture(root);
    expect(host.style.paddingRight).toBe('0px');
    restore();
    expect(host.style.paddingRight).toBe('336px');
  });

});
describe('captureChartElement', () => {
  beforeEach(() => {
    mockedToBlob.mockReset();
  });

  it('rejects captures that stay too narrow after overlay expand', async () => {
    const root = document.createElement('div');
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 80,
      height: 900,
      top: 0,
      left: 0,
      bottom: 900,
      right: 80,
      toJSON: () => ({}),
    });

    await expect(captureChartElement(root, { candleCount: 10 })).rejects.toMatchObject({
      reason: 'too_narrow',
    });
    expect(mockedToBlob).not.toHaveBeenCalled();
  });

  it('restores crosshair visibility when capture throws', async () => {
    const root = document.createElement('div');
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      top: 0,
      left: 0,
      bottom: 300,
      right: 400,
      toJSON: () => ({}),
    });

    const crosshair = document.createElement('canvas');
    crosshair.dataset.crosshairOverlay = 'true';
    crosshair.style.visibility = 'visible';
    root.appendChild(crosshair);

    mockedToBlob.mockRejectedValue(new Error('boom'));

    await expect(captureChartElement(root, { candleCount: 10 })).rejects.toBeInstanceOf(
      SnapshotCaptureError,
    );
    expect(crosshair.style.visibility).toBe('visible');
  });

  it('passes snapshot exclude filter to html-to-image', async () => {
    const root = document.createElement('div');
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      top: 0,
      left: 0,
      bottom: 300,
      right: 400,
      toJSON: () => ({}),
    });

    mockedToBlob.mockResolvedValue(makePngBlob());

    await captureChartElement(root, { candleCount: 10 });

    expect(mockedToBlob).toHaveBeenCalledTimes(1);
    const options = mockedToBlob.mock.calls[0]?.[1];
    expect(options?.filter?.(document.createElement('div'))).toBe(true);

    const excluded = document.createElement('div');
    excluded.dataset.snapshotExclude = 'true';
    expect(options?.filter?.(excluded)).toBe(false);
  });
});
