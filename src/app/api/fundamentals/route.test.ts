import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, clearFundamentalsCacheForTests } from './route';

const { getFundamentalsSnapshot } = vi.hoisted(() => ({
  getFundamentalsSnapshot: vi.fn(async (symbol: string) => ({
    symbol,
    shortName: 'Apple',
    longName: 'Apple Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
    regularMarketPrice: 150,
    regularMarketChange: 1,
    regularMarketChangePercent: 0.5,
    marketCap: 1e12,
    volume: 1e7,
    averageVolume: 5e6,
    sector: 'Technology',
    industry: 'Consumer Electronics',
    website: 'apple.com',
    description: 'Apple makes devices.',
    updatedAt: Date.now(),
  })),
}));

vi.mock('@/lib/yahoo', () => ({
  getFundamentalsSnapshot,
}));

describe('/api/fundamentals GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearFundamentalsCacheForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns fundamentals for valid symbol', async () => {
    const req = new Request('http://localhost/api/fundamentals?symbol=AAPL');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.symbol).toBe('AAPL');
    expect(json.longName).toBe('Apple Inc.');
  });

  it('rejects missing symbol with 400', async () => {
    const req = new Request('http://localhost/api/fundamentals');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('caches identical requests', async () => {
    const url = 'http://localhost/api/fundamentals?symbol=MSFT';
    await GET(new Request(url));
    await GET(new Request(url));
    expect(getFundamentalsSnapshot).toHaveBeenCalledTimes(1);
  });

  it('returns partial data from provider', async () => {
    vi.mocked(getFundamentalsSnapshot).mockResolvedValueOnce({
      symbol: 'IONQ',
      shortName: null,
      longName: 'IonQ, Inc.',
      exchange: 'NYSE',
      currency: 'USD',
      regularMarketPrice: 58.32,
      regularMarketChange: 1.77,
      regularMarketChangePercent: 3.13,
      marketCap: null,
      volume: null,
      averageVolume: null,
      sector: null,
      industry: null,
      website: null,
      description: null,
      updatedAt: Date.now(),
    } satisfies Awaited<ReturnType<typeof getFundamentalsSnapshot>>);

    const res = await GET(new Request('http://localhost/api/fundamentals?symbol=IONQ'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.longName).toBe('IonQ, Inc.');
    expect(json.marketCap).toBeNull();
  });

  it('does not cache provider errors', async () => {
    vi.mocked(getFundamentalsSnapshot)
      .mockRejectedValueOnce(new Error('provider down'))
      .mockResolvedValueOnce({
        symbol: 'AAPL',
        shortName: 'Apple',
        longName: 'Apple Inc.',
        exchange: 'NASDAQ',
        currency: 'USD',
        regularMarketPrice: 150,
        regularMarketChange: 1,
        regularMarketChangePercent: 0.5,
        marketCap: 1e12,
        volume: 1e7,
        averageVolume: 5e6,
        sector: 'Technology',
        industry: 'Consumer Electronics',
        website: 'apple.com',
        description: 'Apple makes devices.',
        updatedAt: Date.now(),
      });

    const url = 'http://localhost/api/fundamentals?symbol=AAPL';
    const first = await GET(new Request(url));
    expect(first.status).toBe(500);

    const second = await GET(new Request(url));
    expect(second.status).toBe(200);
    expect(getFundamentalsSnapshot).toHaveBeenCalledTimes(2);
  });
});
