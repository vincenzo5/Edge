import { describe, it, expect } from 'vitest';
import {
  PRICE_AXIS_WIDTH,
  TIME_AXIS_HEIGHT,
  EVENT_RAIL_HEIGHT,
  isPriceAxisHit,
  resolveDragMode,
  resolveHoverCursor,
  plotWidth,
  plotHeight,
} from './layout';

const WIDTH = 800;
const HEIGHT = 400;

const navigateCtx = {
  showTimeAxis: true,
  activeTool: '__cursor__',
  isDragging: false,
  dragMode: null,
};

describe('resolveDragMode', () => {
  it('returns body for center of plot area', () => {
    expect(resolveDragMode(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT)).toBe('body');
  });

  it('returns price for right strip', () => {
    expect(resolveDragMode(WIDTH - 25, HEIGHT / 2, WIDTH, HEIGHT)).toBe('price');
  });

  it('returns price for left strip when price scale is on the left', () => {
    expect(resolveDragMode(25, HEIGHT / 2, WIDTH, HEIGHT, true, 'left')).toBe('price');
  });

  it('returns timeAxis for bottom strip (excluding price corner)', () => {
    expect(resolveDragMode(WIDTH / 2, HEIGHT - 10, WIDTH, HEIGHT)).toBe('timeAxis');
  });

  it('returns price for bottom-right corner (price strip priority)', () => {
    expect(resolveDragMode(WIDTH - 10, HEIGHT - 10, WIDTH, HEIGHT)).toBe('price');
  });
});

describe('isPriceAxisHit', () => {
  it('matches the configured axis side only', () => {
    expect(isPriceAxisHit(WIDTH - 10, WIDTH, 'right')).toBe(true);
    expect(isPriceAxisHit(10, WIDTH, 'right')).toBe(false);
    expect(isPriceAxisHit(10, WIDTH, 'left')).toBe(true);
    expect(isPriceAxisHit(WIDTH - 10, WIDTH, 'left')).toBe(false);
  });
});

describe('resolveHoverCursor', () => {
  it('returns crosshair on plot in navigate mode', () => {
    expect(resolveHoverCursor(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, navigateCtx)).toBe('crosshair');
  });

  it('returns ns-resize on price axis', () => {
    expect(resolveHoverCursor(WIDTH - 10, HEIGHT / 2, WIDTH, HEIGHT, navigateCtx)).toBe('ns-resize');
  });

  it('returns crosshair on time axis (scrolls like plot)', () => {
    expect(resolveHoverCursor(WIDTH / 2, HEIGHT - 10, WIDTH, HEIGHT, navigateCtx)).toBe('crosshair');
  });

  it('returns crosshair on plot when a drawing tool is active', () => {
    expect(
      resolveHoverCursor(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, {
        ...navigateCtx,
        activeTool: 'straightLine',
      })
    ).toBe('crosshair');
  });

  it('returns ns-resize on price axis even when a drawing tool is active', () => {
    expect(
      resolveHoverCursor(WIDTH - 10, HEIGHT / 2, WIDTH, HEIGHT, {
        ...navigateCtx,
        activeTool: 'straightLine',
      })
    ).toBe('ns-resize');
  });

  it('returns grabbing while panning the plot', () => {
    expect(
      resolveHoverCursor(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, {
        ...navigateCtx,
        isDragging: true,
        dragMode: 'body',
      })
    ).toBe('grabbing');
  });

  it('returns ns-resize while dragging the price axis', () => {
    expect(
      resolveHoverCursor(WIDTH - 10, HEIGHT / 2, WIDTH, HEIGHT, {
        ...navigateCtx,
        isDragging: true,
        dragMode: 'price',
      })
    ).toBe('ns-resize');
  });

  it('returns grabbing while dragging from the time axis strip', () => {
    expect(
      resolveHoverCursor(WIDTH / 2, HEIGHT - 10, WIDTH, HEIGHT, {
        ...navigateCtx,
        isDragging: true,
        dragMode: 'body',
      })
    ).toBe('grabbing');
  });
});

describe('plot dimensions', () => {
  it('subtracts axis strip sizes from full dimensions', () => {
    expect(plotWidth(WIDTH)).toBe(WIDTH - PRICE_AXIS_WIDTH);
    expect(plotHeight(HEIGHT)).toBe(HEIGHT - TIME_AXIS_HEIGHT);
  });

  it('subtracts event rail height when reserved', () => {
    expect(plotHeight(HEIGHT, true, true)).toBe(
      HEIGHT - TIME_AXIS_HEIGHT - EVENT_RAIL_HEIGHT,
    );
  });
});
