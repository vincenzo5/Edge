import { describe, it, expect } from 'vitest';
import {
  PRICE_AXIS_WIDTH,
  TIME_AXIS_HEIGHT,
  resolveDragMode,
  plotWidth,
  plotHeight,
} from './layout';

const WIDTH = 800;
const HEIGHT = 400;

describe('resolveDragMode', () => {
  it('returns body for center of plot area', () => {
    expect(resolveDragMode(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT)).toBe('body');
  });

  it('returns price for right strip', () => {
    expect(resolveDragMode(WIDTH - 25, HEIGHT / 2, WIDTH, HEIGHT)).toBe('price');
  });

  it('returns timeAxis for bottom strip (excluding price corner)', () => {
    expect(resolveDragMode(WIDTH / 2, HEIGHT - 10, WIDTH, HEIGHT)).toBe('timeAxis');
  });

  it('returns price for bottom-right corner (price strip priority)', () => {
    expect(resolveDragMode(WIDTH - 10, HEIGHT - 10, WIDTH, HEIGHT)).toBe('price');
  });
});

describe('plot dimensions', () => {
  it('subtracts axis strip sizes from full dimensions', () => {
    expect(plotWidth(WIDTH)).toBe(WIDTH - PRICE_AXIS_WIDTH);
    expect(plotHeight(HEIGHT)).toBe(HEIGHT - TIME_AXIS_HEIGHT);
  });
});
