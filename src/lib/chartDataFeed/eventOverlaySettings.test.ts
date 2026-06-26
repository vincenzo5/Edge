import { describe, expect, it } from 'vitest';
import { eventKindsFromChartSettings } from './eventOverlaySettings';

describe('eventKindsFromChartSettings', () => {
  it('uses quiet defaults with news and options expirations disabled', () => {
    expect(eventKindsFromChartSettings(undefined, 'SPY')).toEqual([
      'earnings',
      'dividend',
      'split',
      'filing',
      'macro',
    ]);
  });

  it('gates macro badges to benchmark symbols', () => {
    expect(eventKindsFromChartSettings(undefined, 'SPY')).toContain('macro');
    expect(eventKindsFromChartSettings(undefined, 'AAPL')).not.toContain('macro');
  });

  it('includes dense kinds only when enabled', () => {
    expect(
      eventKindsFromChartSettings(
        {
          events: {
            showNews: true,
            showOptionsExpiration: true,
          },
        },
        'AAPL',
      ),
    ).toEqual([
      'earnings',
      'dividend',
      'split',
      'filing',
      'news',
      'options_expiration',
    ]);
  });
});
