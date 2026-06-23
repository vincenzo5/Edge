'use client';

import { useEffect, useState } from 'react';
import {
  resolveHeaderDensity,
  resolveRailMode,
  resolveSidebarMode,
  resolveViewportTier,
  type HeaderDensity,
  type RailMode,
  type SidebarMode,
  type ViewportTier,
} from './responsiveLayout';

export type ResponsiveLayoutState = {
  viewportWidth: number;
  viewportHeight: number;
  viewportTier: ViewportTier;
  sidebarMode: SidebarMode;
  railMode: RailMode;
  headerDensity: HeaderDensity;
};

function readViewport(): Pick<
  ResponsiveLayoutState,
  'viewportWidth' | 'viewportHeight'
> {
  if (typeof window === 'undefined') {
    return { viewportWidth: 1440, viewportHeight: 900 };
  }
  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}

function buildState(
  viewportWidth: number,
  viewportHeight: number,
): ResponsiveLayoutState {
  return {
    viewportWidth,
    viewportHeight,
    viewportTier: resolveViewportTier(viewportWidth),
    sidebarMode: resolveSidebarMode(viewportWidth),
    railMode: resolveRailMode(viewportWidth),
    headerDensity: resolveHeaderDensity(viewportWidth),
  };
}

export function useResponsiveLayout(): ResponsiveLayoutState {
  const [state, setState] = useState<ResponsiveLayoutState>(() => {
    const { viewportWidth, viewportHeight } = readViewport();
    return buildState(viewportWidth, viewportHeight);
  });

  useEffect(() => {
    const update = () => {
      setState(buildState(window.innerWidth, window.innerHeight));
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return state;
}
