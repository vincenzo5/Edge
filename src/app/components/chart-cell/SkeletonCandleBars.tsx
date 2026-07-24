type CandleDescriptor = {
  wickHeight: number;
  bodyHeight: number;
  bodyOffset: number;
};

/** Fixed OHLC-like shapes for SSR/hydration stability — no randomness. */
const CANDLES: CandleDescriptor[] = [
  { wickHeight: 52, bodyHeight: 18, bodyOffset: 22 },
  { wickHeight: 36, bodyHeight: 12, bodyOffset: 14 },
  { wickHeight: 64, bodyHeight: 24, bodyOffset: 28 },
  { wickHeight: 44, bodyHeight: 16, bodyOffset: 18 },
  { wickHeight: 72, bodyHeight: 28, bodyOffset: 32 },
  { wickHeight: 40, bodyHeight: 14, bodyOffset: 16 },
  { wickHeight: 56, bodyHeight: 20, bodyOffset: 24 },
  { wickHeight: 48, bodyHeight: 22, bodyOffset: 12 },
  { wickHeight: 68, bodyHeight: 26, bodyOffset: 30 },
  { wickHeight: 38, bodyHeight: 10, bodyOffset: 20 },
  { wickHeight: 60, bodyHeight: 18, bodyOffset: 26 },
  { wickHeight: 50, bodyHeight: 16, bodyOffset: 10 },
];

const CHART_STRIP_HEIGHT = 96;

type Props = {
  count?: number;
};

export default function SkeletonCandleBars({ count = CANDLES.length }: Props) {
  const candles = CANDLES.slice(0, count);

  return (
    <div
      data-testid="skeleton-candle-bars"
      className="flex items-end justify-center gap-1.5"
      style={{ height: CHART_STRIP_HEIGHT }}
      aria-hidden
    >
      {candles.map((candle, index) => (
        <div
          key={index}
          className="relative flex w-2 shrink-0 flex-col items-center"
          style={{ height: candle.wickHeight }}
        >
          <div className="absolute inset-y-0 w-px edge-skeleton-pulse rounded-full bg-[var(--edge-surface-hover)]" />
          <div
            className="relative w-full rounded-sm edge-skeleton-pulse bg-[var(--edge-surface-hover)]"
            style={{
              height: candle.bodyHeight,
              marginTop: candle.bodyOffset,
            }}
          />
        </div>
      ))}
    </div>
  );
}
