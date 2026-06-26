import { Candle, DrawingStore, IndicatorRegistry, DrawingRegistry, serializeAll, restoreAll } from "@edge/chart-core";
import { getAllIndicators, getCatalog } from "@edge/chart-core/indicators";
import { getAllDrawings } from "@edge/chart-core/drawings";
import { formatPrice } from "@edge/chart-core/format";

/** Minimal fixture candles — no network or app dependencies. */
export const FIXTURE_CANDLES: Candle[] = [
  { t: 1_700_000_000_000, o: 100, h: 105, l: 99, c: 104, v: 1_200_000 },
  { t: 1_700_000_864_000, o: 104, h: 108, l: 103, c: 107, v: 980_000 },
  { t: 1_700_001_728_000, o: 107, h: 110, l: 106, c: 109, v: 1_100_000 },
  { t: 1_700_002_592_000, o: 109, h: 112, l: 108, c: 111, v: 870_000 },
  { t: 1_700_003_456_000, o: 111, h: 113, l: 109, c: 110, v: 760_000 },
];

function main() {
  const lastClose = FIXTURE_CANDLES[FIXTURE_CANDLES.length - 1]!.c;
  console.log(`Last close: ${formatPrice(lastClose)}`);

  const indicators = getAllIndicators();
  console.log(`Starter indicators: ${indicators.map((i) => i.name).join(", ")}`);

  const catalog = getCatalog();
  console.log(`Catalog entries: ${catalog.length}`);

  const drawings = getAllDrawings();
  console.log(`Starter drawings: ${drawings.map((d) => d.name).join(", ")}`);

  const store = new DrawingStore();
  store.execute({
    type: "add",
    drawing: {
      id: "trend-1",
      name: "trend_line",
      label: "Support",
      points: [
        { dataIndex: 0, value: 100 },
        { dataIndex: 4, value: 110 },
      ],
      visible: true,
      locked: false,
      zLevel: 0,
      paneId: "price",
    },
  });

  const serialized = serializeAll(store.getDrawings());
  const restored = restoreAll(serialized);

  console.log(`Serialized ${serialized.length} drawing(s), restored ${restored.length} overlay(s)`);
  console.log(`IndicatorRegistry count: ${IndicatorRegistry.getAll().length}`);
  console.log(`DrawingRegistry count: ${DrawingRegistry.getAll().length}`);
}

main();
