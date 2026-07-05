import type { DrawingPlugin } from '../plugin-api';
import { trendLine } from './trend_line';
import { horizontalLine } from './hline';
import { verticalLine } from './vertical_line';
import { rectangle } from './rect';
import { ray } from './ray';
import { parallelChannel, priceChannel } from './channels';
import { circle, fibRetracement } from './fib_retracement';
import { priceLine, annotation } from './annotation';
import { measure } from './measure';
import { riskRuler } from './risk_ruler';
import { ruler } from './ruler';
import { longPosition } from './long_position';
import { shortPosition } from './short_position';

const reg = new Map<string, DrawingPlugin>();

export function registerDrawing(p: DrawingPlugin) {
  reg.set(p.name, p);
}

export function getDrawing(name: string) {
  return reg.get(name);
}

export function getAllDrawings() {
  return Array.from(reg.values());
}

registerDrawing(trendLine);
registerDrawing(horizontalLine);
registerDrawing(verticalLine);
registerDrawing(rectangle);
registerDrawing(ray);
registerDrawing(parallelChannel);
registerDrawing(priceChannel);
registerDrawing(circle);
registerDrawing(fibRetracement);
registerDrawing(priceLine);
registerDrawing(annotation);
registerDrawing(measure);
registerDrawing(riskRuler);
registerDrawing(ruler);
registerDrawing(longPosition);
registerDrawing(shortPosition);
