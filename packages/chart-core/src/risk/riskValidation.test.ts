import { describe, it, expect } from 'vitest';

import { tradeSetupFromPoints, riskRulerHitTest } from './riskDrawing';
import { isValidRiskLeg, validateTradeSetup, RiskValidationError } from './riskValidation';
import type { TradeSetup } from './riskTypes';

describe('riskValidation', () => {
  const validSetup: TradeSetup = {
    direction: 'long',
    account: { capital: 50_000, riskPercent: 1 },
    entries: [{ price: 129 }],
    stops: [{ price: 125, type: 'initial' }],
    targets: [
      { price: 133, rMultiple: 1, allocationPercent: 50 },
      { price: 137, rMultiple: 2, allocationPercent: 50 },
    ],
  };

  it('accepts a valid long trade setup', () => {
    const parsed = validateTradeSetup(validSetup);
    expect(parsed.entries[0]?.price).toBe(129);
    expect(parsed.stops[0]?.type).toBe('initial');
  });

  it('rejects zero capital', () => {
    expect(() =>
      validateTradeSetup({
        ...validSetup,
        account: { capital: 0, riskPercent: 1 },
      }),
    ).toThrow(RiskValidationError);
  });

  it('rejects allocation totals above 100%', () => {
    expect(() =>
      validateTradeSetup({
        ...validSetup,
        targets: [
          { price: 133, rMultiple: 1, allocationPercent: 60 },
          { price: 137, rMultiple: 2, allocationPercent: 50 },
        ],
      }),
    ).toThrow(RiskValidationError);
  });

  it('rejects long setup with stop above entry', () => {
    expect(() =>
      validateTradeSetup({
        ...validSetup,
        stops: [{ price: 135, type: 'initial' }],
      }),
    ).toThrow(RiskValidationError);
  });

  it('validates individual risk legs', () => {
    expect(isValidRiskLeg({ price: 125, type: 'initial' })).toBe(true);
    expect(isValidRiskLeg({ price: Number.NaN, type: 'initial' })).toBe(false);
    expect(isValidRiskLeg({ price: 133, rMultiple: 1 })).toBe(true);
  });

  it('builds trade setup from drawing points', () => {
    const setup = tradeSetupFromPoints([
      { value: 129, dataIndex: 0, timestamp: 0 },
      { value: 125, dataIndex: 1, timestamp: 1 },
    ]);
    expect(setup?.direction).toBe('long');
    expect(setup?.targets).toHaveLength(3);
    expect(setup?.targets[0]?.rMultiple).toBe(1);
  });

  it('hit-tests the shaded risk zone, not just the anchor segment', () => {
    const entryPlot = { x: 100, y: 200 };
    const stopPlot = { x: 300, y: 260 };
    const plotWidthPx = 800;

    expect(riskRulerHitTest(400, 230, entryPlot, stopPlot, plotWidthPx)).toBe(true);
    expect(riskRulerHitTest(400, 500, entryPlot, stopPlot, plotWidthPx)).toBe(false);
    expect(riskRulerHitTest(150, 228, entryPlot, stopPlot, plotWidthPx)).toBe(true);
  });
});
