import type { IndicatorPlugin } from '../plugin-api';
import { ma } from './ma';
import { boll } from './boll';
import { macd } from './macd';
import { rsi } from './rsi';
// ... import remaining 24 as they are implemented

const registry = new Map<string, IndicatorPlugin>();

export function registerIndicator(plugin: IndicatorPlugin) {
  registry.set(plugin.name, plugin);
}

export function getIndicator(name: string) {
  return registry.get(name);
}

export function getAllIndicators() {
  return Array.from(registry.values());
}

// Auto-register core ones for V1
registerIndicator(ma);
registerIndicator(boll);
registerIndicator(macd);
registerIndicator(rsi);

// TODO: register the other 24 from current INDICATORS list (AVP, SAR, KDJ, etc.)
// Each follows the same {name, pane, draw, valueAt?} shape.
