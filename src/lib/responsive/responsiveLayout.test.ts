import { describe, expect, it } from 'vitest';
import {
  chartAreaWidthForViewport,
  resolveHeaderDensity,
  resolveSidebarMode,
  resolveViewportTier,
  shouldStackLayout,
} from './responsiveLayout';
import { getLayoutTemplate } from '@/lib/chart/layoutTemplates';

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
    it('always uses overlay so the docked panel does not reflow chart width', () => {
      expect(resolveSidebarMode(1440)).toBe('overlay');
      expect(resolveSidebarMode(1024)).toBe('overlay');
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

  describe('shouldStackLayout', () => {
    it('stacks multi-column templates when width is below minimum usable cell width', () => {
      expect(shouldStackLayout(getLayoutTemplate('n2-cols'), 639)).toBe(true);
      expect(shouldStackLayout(getLayoutTemplate('n4-grid-2x2'), 639)).toBe(true);
      expect(shouldStackLayout(getLayoutTemplate('n2-cols'), 640)).toBe(false);
      expect(shouldStackLayout(getLayoutTemplate('n3-rows'), 400)).toBe(false);
    });
  });

  describe('chartAreaWidthForViewport', () => {
    it('subtracts inline sidebar and full rail on desktop', () => {
      expect(chartAreaWidthForViewport(1440, 'inline', 'full')).toBe(1096);
    });

    it('does not subtract sidebar width in overlay mode', () => {
      expect(chartAreaWidthForViewport(768, 'overlay', 'full')).toBe(724);
    });
  });
});
