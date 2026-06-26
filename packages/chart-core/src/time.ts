import type { Interval } from './contracts';
import { formatCrosshairTime } from './timeAxis';

/** @deprecated Prefer formatCrosshairTime for crosshair; axis uses computeTimeAxisTicks. */
export function formatAxisTime(ms: number, interval?: Interval): string {
  return formatCrosshairTime(ms, interval);
}
