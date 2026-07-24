import type { Theme } from '@edge/chart-core';
import type { RequiredChartSettings } from './chartSettings';

type BackgroundCacheKey = string;
type SeriesCacheKey = string;

function createOffscreenCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  return el;
}

/** Offscreen cache for plot background (theme/settings/size — not viewport-dependent). */
export class BackgroundLayerCache {
  private canvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  private key: BackgroundCacheKey | null = null;

  private cacheKey(
    width: number,
    height: number,
    theme: Theme,
    settings: RequiredChartSettings,
    showTimeAxis: boolean,
  ): BackgroundCacheKey {
    return [
      width,
      height,
      theme,
      showTimeAxis,
      settings.canvas.backgroundColor ?? '',
      settings.canvas.watermarkVisible,
      settings.canvas.watermarkMode,
    ].join('|');
  }

  ensure(
    width: number,
    height: number,
    theme: Theme,
    settings: RequiredChartSettings,
    showTimeAxis: boolean,
    render: (ctx: CanvasRenderingContext2D) => void,
  ): void {
    const nextKey = this.cacheKey(width, height, theme, settings, showTimeAxis);
    if (this.canvas && this.key === nextKey) return;

    if (!this.canvas || this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas = createOffscreenCanvas(width, height);
    }
    this.key = nextKey;

    const ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D | null;
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    render(ctx);
  }

  blitTo(target: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.canvas) return;
    target.drawImage(this.canvas as CanvasImageSource, 0, 0, width, height);
  }

  invalidate(): void {
    this.key = null;
  }

  dispose(): void {
    this.canvas = null;
    this.key = null;
  }
}

/** Offscreen cache for candles + indicators + script objects (invalidates on viewport/data/theme). */
export class SeriesLayerCache {
  private canvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  private key: SeriesCacheKey | null = null;

  private cacheKey(width: number, height: number, theme: Theme): SeriesCacheKey {
    return [width, height, theme].join('|');
  }

  ensure(
    width: number,
    height: number,
    theme: Theme,
    render: (ctx: CanvasRenderingContext2D) => void,
  ): void {
    const nextKey = this.cacheKey(width, height, theme);
    if (this.canvas && this.key === nextKey) {
      const ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D | null;
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      render(ctx);
      return;
    }

    if (!this.canvas || this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas = createOffscreenCanvas(width, height);
    }
    this.key = nextKey;

    const ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D | null;
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    render(ctx);
  }

  blitTo(target: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.canvas || this.key == null) return;
    target.drawImage(this.canvas as CanvasImageSource, 0, 0, width, height);
  }

  invalidate(): void {
    this.key = null;
  }

  dispose(): void {
    this.canvas = null;
    this.key = null;
  }
}
