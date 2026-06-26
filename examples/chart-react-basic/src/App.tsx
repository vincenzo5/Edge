import { useCallback, useRef, useState } from "react";
import {
  createDefaultChartState,
  restoreChartState,
  serializeChartState,
  type SerializedChartState,
} from "@edge/chart-core";
import EdgeChart, { type EdgeChartHandle } from "@edge/chart-react";
import { FIXTURE_CANDLES } from "./fixtures.js";

const STORAGE_KEY = "edge-example-chart-state";

export default function App() {
  const chartRef = useRef<EdgeChartHandle>(null);
  const [mounted, setMounted] = useState(true);
  const [state, setState] = useState<SerializedChartState>(() =>
    createDefaultChartState({ chartType: "candle_solid" }),
  );
  const [status, setStatus] = useState("Ready — caller-provided fixture candles, no network.");

  const syncFromHandle = useCallback(() => {
    const live = chartRef.current?.getState();
    if (live) setState(live);
    return live;
  }, []);

  const handleSerialize = () => {
    const live = syncFromHandle();
    if (!live) return;
    const json = serializeChartState(live);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
    setStatus(`Serialized chart state (v${json.version}, ${json.indicators.length} indicators).`);
  };

  const handleRestore = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setStatus("Nothing saved — click Serialize first.");
      return;
    }
    const parsed = JSON.parse(raw) as SerializedChartState;
    const restored = restoreChartState(parsed);
    chartRef.current?.setState(restored);
    setState(restored);
    setStatus(`Restored chart state (type=${restored.chartType}).`);
  };

  const handleToggleType = () => {
    const live = syncFromHandle() ?? state;
    const nextType = live.chartType === "area" ? "candle_solid" : "area";
    const next = restoreChartState(
      serializeChartState({ ...live, chartType: nextType }),
    );
    chartRef.current?.setState(next);
    setState(next);
    setStatus(`Updated chart type → ${nextType}`);
  };

  const handleUnmount = () => {
    setMounted(false);
    setStatus("Chart unmounted — click Remount to recreate.");
  };

  const handleRemount = () => {
    setMounted(true);
    setStatus("Chart remounted with current React state.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 16, gap: 12 }}>
      <header>
        <h1 style={{ margin: "0 0 4px", fontSize: 20 }}>@edge/chart-react browser demo</h1>
        <p style={{ margin: 0, opacity: 0.75, fontSize: 14 }}>
          External consumer proof: fixture candles, canvas render, serialize / restore / cleanup.
        </p>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" onClick={handleSerialize}>
          Serialize
        </button>
        <button type="button" onClick={handleRestore}>
          Restore
        </button>
        <button type="button" onClick={handleToggleType}>
          Toggle area / candles
        </button>
        <button type="button" onClick={handleUnmount} disabled={!mounted}>
          Unmount
        </button>
        <button type="button" onClick={handleRemount} disabled={mounted}>
          Remount
        </button>
      </div>

      <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>{status}</p>

      <div
        style={{
          flex: 1,
          minHeight: 420,
          border: "1px solid #30363d",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {mounted ? (
          <EdgeChart
            ref={chartRef}
            candles={[...FIXTURE_CANDLES]}
            state={state}
            theme="dark"
            symbol="DEMO"
            range="1y"
            interval="1d"
            loading={false}
          />
        ) : (
          <div style={{ padding: 24, opacity: 0.6 }}>Chart unmounted</div>
        )}
      </div>
    </div>
  );
}
