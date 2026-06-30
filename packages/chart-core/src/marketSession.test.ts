import { describe, expect, it } from 'vitest';
import {
  classifyUsEquitySession,
  parseProviderMarketState,
  resolveMarketSession,
  sessionPriceLabelPrefix,
  sessionStatusLabel,
} from './marketSession';

describe('marketSession', () => {
  it('classifies regular US equity hours on a weekday', () => {
    // Fri Jun 27 2025 10:00 ET
    const atMs = Date.UTC(2025, 5, 27, 14, 0, 0);
    expect(classifyUsEquitySession(atMs)).toBe('regular');
  });

  it('classifies post-market hours', () => {
    // Fri Jun 27 2025 17:00 ET
    const atMs = Date.UTC(2025, 5, 27, 21, 0, 0);
    expect(classifyUsEquitySession(atMs)).toBe('postMarket');
  });

  it('maps provider marketState strings', () => {
    expect(parseProviderMarketState('PRE')).toBe('preMarket');
    expect(parseProviderMarketState('POSTPOST')).toBe('postMarket');
    expect(parseProviderMarketState('REGULAR')).toBe('regular');
  });

  it('prefers provider marketState over clock classification', () => {
    expect(
      resolveMarketSession({ atMs: Date.now(), marketState: 'POST' }),
    ).toBe('postMarket');
  });

  it('formats session labels for chart chrome', () => {
    expect(sessionPriceLabelPrefix('postMarket')).toBe('Post');
    expect(sessionStatusLabel('postMarket', 'extended')).toBe('Post-market');
    expect(sessionStatusLabel('postMarket', 'regular')).toBe('Post-market (quote)');
  });
});
