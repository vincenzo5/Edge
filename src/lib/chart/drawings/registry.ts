import type { DrawingPlugin } from '../plugin-api';
import { trendLine } from './trend_line';
import { hline } from './hline';
import { rect } from './rect';

const reg = new Map<string, DrawingPlugin>();

// Register core drawing tools on module load
registerDrawing(trendLine);
registerDrawing(hline);
registerDrawing(rect);

export function registerDrawing(p: DrawingPlugin) {
  reg.set(p.name, p);
}

export function getDrawing(name: string) {
  return reg.get(name);
}

export function getAllDrawings() {
  return Array.from(reg.values());
}
