import { z } from 'zod';
import { SUPPORTED_INTERVALS } from '@edge/chart-core';
import type { Interval, Range } from '@edge/chart-core';
import { dataConnectionIdSchema } from '../schemas/request';

const rangeSchema = z.enum([
  '1d',
  '5d',
  '1mo',
  '3mo',
  '6mo',
  'ytd',
  '1y',
  '2y',
  '5y',
  'max',
] satisfies Range[]);

export const candleStreamQuerySchema = z.object({
  symbol: z.string().min(1).max(32),
  interval: z.enum(SUPPORTED_INTERVALS as [Interval, ...Interval[]]),
  range: rangeSchema.default('1y'),
  exchange: z.string().max(32).optional(),
});

export const quoteStreamQuerySchema = z.object({
  symbols: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().min(1).max(32)).min(1).max(32)),
  connectionId: dataConnectionIdSchema.optional(),
});

export type CandleStreamQueryInput = z.infer<typeof candleStreamQuerySchema>;
export type QuoteStreamQueryInput = z.infer<typeof quoteStreamQuerySchema>;

export function parseCandleStreamQuery(searchParams: URLSearchParams) {
  return candleStreamQuerySchema.safeParse({
    symbol: searchParams.get('symbol') ?? undefined,
    interval: searchParams.get('interval') ?? undefined,
    range: searchParams.get('range') ?? undefined,
    exchange: searchParams.get('exchange') ?? undefined,
  });
}

export function parseQuoteStreamQuery(searchParams: URLSearchParams) {
  return quoteStreamQuerySchema.safeParse({
    symbols: searchParams.get('symbols') ?? undefined,
    connectionId: searchParams.get('connectionId') ?? undefined,
  });
}
