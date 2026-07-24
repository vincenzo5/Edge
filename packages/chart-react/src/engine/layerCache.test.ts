import { describe, expect, it, vi } from 'vitest';
import { BackgroundLayerCache, SeriesLayerCache } from './layerCache';

function mockCtx(): CanvasRenderingContext2D {
  return {
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('BackgroundLayerCache', () => {
  it('dispose clears canvas reference so blit is a no-op', () => {
    const cache = new BackgroundLayerCache();
    const offscreen = {
      width: 100,
      height: 50,
      getContext: vi.fn(() => ({
        clearRect: vi.fn(),
      })),
    };
    (cache as { canvas: unknown }).canvas = offscreen;
    (cache as { key: string }).key = 'test';

    const target = mockCtx();
    cache.blitTo(target, 100, 50);
    expect(target.drawImage).toHaveBeenCalledTimes(1);

    cache.dispose();
    cache.blitTo(target, 100, 50);
    expect(target.drawImage).toHaveBeenCalledTimes(1);
  });
});

describe('SeriesLayerCache', () => {
  it('dispose clears canvas reference so blit is a no-op', () => {
    const cache = new SeriesLayerCache();
    const offscreen = {
      width: 80,
      height: 40,
      getContext: vi.fn(() => ({
        clearRect: vi.fn(),
      })),
    };
    (cache as { canvas: unknown }).canvas = offscreen;
    (cache as { key: string }).key = 'test';

    const target = mockCtx();
    cache.blitTo(target, 80, 40);
    expect(target.drawImage).toHaveBeenCalledTimes(1);

    cache.dispose();
    cache.blitTo(target, 80, 40);
    expect(target.drawImage).toHaveBeenCalledTimes(1);
  });

  it('invalidate prevents blit until redrawn', () => {
    const cache = new SeriesLayerCache();
    const offscreen = {
      width: 80,
      height: 40,
      getContext: vi.fn(() => ({
        clearRect: vi.fn(),
      })),
    };
    (cache as { canvas: unknown }).canvas = offscreen;
    (cache as { key: string }).key = 'test';

    const target = mockCtx();
    cache.invalidate();
    cache.blitTo(target, 80, 40);
    expect(target.drawImage).not.toHaveBeenCalled();
  });
});
