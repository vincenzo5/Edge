import { z } from 'zod';

import type { RiskStop, RiskTarget, TradeSetup } from './riskTypes';

export const riskAccountSchema = z.object({
  capital: z.number().positive('Account capital must be positive'),
  riskPercent: z
    .number()
    .gt(0, 'Risk percent must be greater than zero')
    .max(100, 'Risk percent cannot exceed 100'),
});

export const riskEntrySchema = z.object({
  price: z.number().finite('Entry price must be finite'),
  label: z.string().optional(),
});

export const riskStopSchema = z.object({
  price: z.number().finite('Stop price must be finite'),
  type: z.enum(['initial', 'breakeven', 'trailing']),
  label: z.string().optional(),
});

export const riskTargetSchema = z.object({
  price: z.number().finite('Target price must be finite'),
  rMultiple: z.number().finite('R-multiple must be finite'),
  allocationPercent: z.number().min(0).max(100).optional(),
  label: z.string().optional(),
});

export const optionLegSchema = z.object({
  type: z.enum(['call', 'put']),
  action: z.enum(['buy', 'sell']),
  strike: z.number().finite('Leg strike must be finite'),
  premium: z.number().finite().optional(),
  expiration: z.string().optional(),
  label: z.string().optional(),
});

export const tradeSetupSchema = z
  .object({
    direction: z.enum(['long', 'short']),
    account: riskAccountSchema,
    entries: z.array(riskEntrySchema).min(1, 'At least one entry is required'),
    stops: z.array(riskStopSchema).min(1, 'At least one stop is required'),
    targets: z.array(riskTargetSchema),
    instrument: z.enum(['stock', 'option']).optional(),
    setupType: z
      .enum([
        'long_call',
        'bull_call_debit_spread',
        'bear_put_debit_spread',
        'iron_condor',
      ])
      .optional(),
    legs: z.array(optionLegSchema).optional(),
    symbol: z.string().optional(),
    maxLoss: z.number().finite().optional(),
    maxProfit: z.number().finite().optional(),
    breakevens: z.array(z.number().finite()).optional(),
  })
  .superRefine((setup, ctx) => {
    const allocationTotal = setup.targets.reduce(
      (sum, target) => sum + (target.allocationPercent ?? 0),
      0,
    );
    if (allocationTotal > 100.0001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Target allocation cannot exceed 100%',
        path: ['targets'],
      });
    }

    const entry = setup.entries[0]?.price;
    const stop = setup.stops[0]?.price;
    if (entry == null || stop == null) return;

    if (entry === stop) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Entry and stop prices must differ',
        path: ['stops'],
      });
    }

    if (setup.direction === 'long' && stop >= entry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Long setups require stop below entry',
        path: ['stops'],
      });
    }

    if (setup.direction === 'short' && stop <= entry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Short setups require stop above entry',
        path: ['stops'],
      });
    }
  });

export type TradeSetupInput = z.input<typeof tradeSetupSchema>;
export type TradeSetupOutput = z.output<typeof tradeSetupSchema>;

export class RiskValidationError extends Error {
  readonly issues: z.ZodIssue[];

  constructor(message: string, issues: z.ZodIssue[]) {
    super(message);
    this.name = 'RiskValidationError';
    this.issues = issues;
  }
}

export function validateTradeSetup(input: unknown): TradeSetup {
  const result = tradeSetupSchema.safeParse(input);
  if (!result.success) {
    throw new RiskValidationError('Invalid trade setup', result.error.issues);
  }
  return result.data;
}

export function parseTradeSetup(input: unknown): TradeSetup | null {
  const result = tradeSetupSchema.safeParse(input);
  return result.success ? result.data : null;
}

export function isValidRiskLeg(leg: RiskStop | RiskTarget): boolean {
  if (!Number.isFinite(leg.price)) return false;
  if ('type' in leg) {
    return riskStopSchema.safeParse(leg).success;
  }
  return riskTargetSchema.safeParse(leg).success;
}
