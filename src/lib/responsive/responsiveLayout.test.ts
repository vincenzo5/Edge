import { describe, expect, it } from 'vitest';
import {
  chartAreaWidthForViewport,
  resolveGridContainerClass,
  resolveHeaderDensity,
  resolveSidebarMode,
  resolveViewportTier,
  shouldStackGridColumns,
} from './responsiveLayout';

describe('responsiveLayout', () => {
  describe('resolveViewportTier', () => {
    it('classifies phone, tablet, and desktop boundaries', () => {
      expect(resolveViewportTier(639)).toBe('phone');
      expect(resolveViewportTier(640)).toBe('tablet');
      expect(resolveViewportTier(1023)).toBe('tablet');
      expect(resolveViewportTier(1024)).toBe('desktop');
    });
  });

  describe('resolveSidebarMode', () => {
    it('uses inline sidebar at desktop widths and overlay below tablet', () => {
      expect(resolveSidebarMode(1024)).toBe('inline');
      expect(resolveSidebarMode(1023)).toBe('overlay');
      expect(resolveSidebarMode(390)).toBe('overlay');
    });
  });

  describe('resolveHeaderDensity', () => {
    it('steps down density as width decreases', () => {
      expect(resolveHeaderDensity(1200)).toBe('full');
      expect(resolveHeaderDensity(1100)).toBe('full');
      expect(resolveHeaderDensity(1099)).toBe('compact');
      expect(resolveHeaderDensity(768)).toBe('compact');
      expect(resolveHeaderDensity(767)).toBe('minimal');
      expect(resolveHeaderDensity(390)).toBe('minimal');
    });
  });

  describe('shouldStackGridColumns', () => {
    it('stacks two-column modes when width is below minimum usable cell width', () => {
      expect(shouldStackGridColumns('1x2', 639)).toBe(true);
      expect(shouldStackGridColumns('2x2', 639)).toBe(true);
      expect(shouldStackGridColumns('1x2', 640)).toBe(false);
      expect(shouldStackGridColumns('2x1', 400)).toBe(false);
    });
  });

  describe('resolveGridContainerClass', () => {
    it('preserves desktop grid classes when width is sufficient', () => {
      expect(resolveGridContainerClass('1x2', 900)).toBe('grid-cols-2 chart-grid-rows-1');
      expect(resolveGridContainerClass('2x2', 900)).toBe('grid-cols-2 chart-grid-rows-2');
    });

    it('stacks narrow two-column modes', () => {
      expect(resolveGridContainerClass('1x2', 500)).toBe('grid-cols-1 chart-grid-rows-2');
      expect(resolveGridContainerClass('2x2', 500)).toBe('grid-cols-1 chart-grid-rows-4');
    });
  });

  describe('chartAreaWidthForViewport', () => {
    it('subtracts inline sidebar and full rail on desktop', () => {
      expect(chartAreaWidthForViewport(1440, 'inline', 'full')).toBe(1080);
    });

    it('does not subtract sidebar width in overlay mode', () => {
      expect(chartAreaWidthForViewport(768, 'overlay', 'full')).toBe(708);
    });
  });
});
