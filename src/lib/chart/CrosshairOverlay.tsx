'use client';

import { useEffect, useRef } from 'react';
import type { CrosshairState, Theme } from './contracts';
import { drawUnifiedCrosshair } from './renderer';

type Props = {
  width: number;
  height: number;
  theme: Theme;
  crosshair: CrosshairState | null;
};

export default function CrosshairOverlay({ width, height, theme, crosshair }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (!crosshair) return;
    drawUnifiedCrosshair(ctx, width, height, theme, crosshair);
  }, [width, height, theme, crosshair]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0 z-20"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
