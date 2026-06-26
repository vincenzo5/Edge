import { formatPrice } from '../format';
import type { OptionLeg, OptionSetupType, RiskMetrics, TargetMetrics, TradeSetup } from './riskTypes';

export const OPTION_SETUP_DISPLAY_NAMES: Record<OptionSetupType, string> = {
  long_call: 'Long Call',
  bull_call_debit_spread: 'Bull Call Spread',
  bear_put_debit_spread: 'Bear Put Spread',
  iron_condor: 'Iron Condor',
};

export function isOptionTradeSetup(setup: TradeSetup): boolean {
  return setup.instrument === 'option' && setup.setupType != null;
}

export function formatOptionLeg(leg: OptionLeg): string {
  const action = leg.action === 'buy' ? 'Buy' : 'Sell';
  const type = leg.type === 'call' ? 'C' : 'P';
  const strike = formatPrice(leg.strike);
  const premium =
    leg.premium != null ? ` @ ${formatPrice(leg.premium)}` : '';
  return `${action} ${strike}${type}${premium}`;
}

export function formatOptionLegsSummary(setup: TradeSetup): string {
  if (!setup.legs?.length) return '';
  return setup.legs.map(formatOptionLeg).join(' · ');
}

export function formatOptionRiskSummary(setup: TradeSetup, metrics: RiskMetrics): string {
  const contracts = metrics.positionSize;
  const maxLoss =
    setup.maxLoss != null ? formatPrice(setup.maxLoss) : formatPrice(metrics.riskPerShare);
  const parts = [`${contracts} ct`, `max loss $${maxLoss}`];
  if (setup.maxProfit != null) {
    parts.push(`max profit $${formatPrice(setup.maxProfit)}`);
  } else if (metrics.riskRewardRatio != null) {
    parts.push(`${formatPrice(metrics.riskRewardRatio, 1)}R max`);
  }
  if (setup.breakevens?.length) {
    parts.push(
      `BE ${setup.breakevens.map((price) => formatPrice(price)).join(' / ')}`,
    );
  }
  return parts.join(' · ');
}

export function formatOptionTargetLabel(
  target: TargetMetrics,
  setupTarget?: TradeSetup['targets'][number],
): string {
  const price = formatPrice(target.price);
  if (setupTarget?.label) {
    return `${setupTarget.label} @ ${price}`;
  }
  return `${target.rMultiple}R @ ${price}`;
}

export function formatOptionLineLabel(
  role: 'entry' | 'stop' | 'breakeven',
  price: number,
  setup: TradeSetup,
): string {
  const formatted = formatPrice(price);
  if (role === 'entry') {
    return `Spot (entry) @ ${formatted}`;
  }
  if (role === 'breakeven') {
    return `Breakeven @ ${formatted}`;
  }
  const stopLabel = setup.stops[0]?.label ?? 'Max loss';
  return `${stopLabel} @ ${formatted}`;
}

export function formatOptionSetupHeader(setup: TradeSetup): string {
  const name =
    setup.setupType != null
      ? OPTION_SETUP_DISPLAY_NAMES[setup.setupType]
      : 'Options setup';
  const symbol = setup.symbol ? ` · ${setup.symbol}` : '';
  return `${name}${symbol}`;
}

export function formatOptionSetupExplanation(setup: TradeSetup): string[] {
  if (!setup.setupType) return [];

  switch (setup.setupType) {
    case 'long_call':
      return [
        'Entry = current spot. Stop = spot minus estimated premium (max loss).',
        'Targets = 1R / 2R / 3R above entry using premium as the risk unit.',
        formatOptionLegsSummary(setup),
      ].filter(Boolean);
    case 'bull_call_debit_spread':
      return [
        'Entry = spot. Stop = long strike minus net debit (defined max loss).',
        'Breakeven = long strike + debit. Max profit at short call strike.',
        formatOptionLegsSummary(setup),
      ].filter(Boolean);
    case 'bear_put_debit_spread':
      return [
        'Entry = spot. Stop = long strike plus net debit (defined max loss).',
        'Breakeven = long strike − debit. Max profit at short put strike.',
        formatOptionLegsSummary(setup),
      ].filter(Boolean);
    case 'iron_condor':
      return [
        'Entry = spot. Stop = lower wing (outside short put).',
        'Profit zone between short strikes; breakevens outside the body.',
        formatOptionLegsSummary(setup),
      ].filter(Boolean);
  }
}
