import { describe, it, expect } from 'vitest';

import {
  formatOptionLeg,
  formatOptionLegsSummary,
  formatOptionLineLabel,
  formatOptionRiskSummary,
  formatOptionSetupExplanation,
  formatOptionSetupHeader,
  formatOptionTargetLabel,
  isOptionTradeSetup,
} from './optionRiskFormat';
import { computeRiskMetrics } from './riskCompute';
import type { TradeSetup } from './riskTypes';

describe('optionRiskFormat', () => {
  const longCallSetup: TradeSetup = {
    direction: 'long',
    account: { capital: 50_000, riskPercent: 1 },
    entries: [{ price: 100 }],
    stops: [{ price: 98, type: 'initial', label: 'Max loss zone' }],
    targets: [
      { price: 102, rMultiple: 1, label: '1R' },
      { price: 104, rMultiple: 2 },
    ],
    instrument: 'option',
    setupType: 'long_call',
    symbol: 'AAPL',
    maxLoss: 2,
    breakevens: [102],
    legs: [{ type: 'call', action: 'buy', strike: 100, premium: 2 }],
  };

  it('detects option trade setups', () => {
    expect(isOptionTradeSetup(longCallSetup)).toBe(true);
    expect(isOptionTradeSetup({ ...longCallSetup, instrument: undefined })).toBe(false);
  });

  it('formats legs and summaries', () => {
    expect(formatOptionLeg(longCallSetup.legs![0]!)).toBe('Buy 100C @ 2');
    expect(formatOptionLegsSummary(longCallSetup)).toContain('Buy 100C');
    expect(formatOptionSetupHeader(longCallSetup)).toBe('Long Call · AAPL');
  });

  it('formats option risk summary with contracts and breakevens', () => {
    const metrics = computeRiskMetrics(longCallSetup);
    const summary = formatOptionRiskSummary(longCallSetup, metrics);
    expect(summary).toContain('ct');
    expect(summary).toContain('max loss $2');
    expect(summary).toContain('BE 102');
  });

  it('formats target and line labels with semantic names', () => {
    const metrics = computeRiskMetrics(longCallSetup);
    expect(formatOptionTargetLabel(metrics.targets[0]!, longCallSetup.targets[0])).toBe(
      '1R @ 102',
    );
    expect(formatOptionLineLabel('entry', 100, longCallSetup)).toBe('Spot (entry) @ 100');
    expect(formatOptionLineLabel('stop', 98, longCallSetup)).toBe('Max loss zone @ 98');
    expect(formatOptionLineLabel('breakeven', 102, longCallSetup)).toBe('Breakeven @ 102');
  });

  it('returns setup-specific explanation lines', () => {
    const lines = formatOptionSetupExplanation(longCallSetup);
    expect(lines[0]).toContain('Entry = current spot');
    expect(lines.some((line) => line.includes('Buy 100C'))).toBe(true);

    const spread = formatOptionSetupExplanation({
      ...longCallSetup,
      setupType: 'bull_call_debit_spread',
      legs: [
        { type: 'call', action: 'buy', strike: 100 },
        { type: 'call', action: 'sell', strike: 105 },
      ],
    });
    expect(spread[0]).toContain('defined max loss');
  });
});
