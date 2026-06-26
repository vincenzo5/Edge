import { useEffect, useState } from "react";
import { runBrowserHarness } from "./runScenario.js";
import type { ScenarioResult } from "./types.js";

const autoRun = new URLSearchParams(window.location.search).get("autorun") === "1";

export default function App() {
  const [status, setStatus] = useState(autoRun ? "Running browser scenarios..." : "Idle");
  const [results, setResults] = useState<ScenarioResult[]>([]);

  useEffect(() => {
    if (!autoRun) return;

    let cancelled = false;

    void (async () => {
      try {
        const browserResults = await runBrowserHarness();
        if (cancelled) return;
        window.__EDGE_CHART_PERF_RESULTS__ = browserResults;
        window.__EDGE_CHART_PERF_READY__ = true;
        setResults(browserResults);
        setStatus(`Completed ${browserResults.length} browser scenarios.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        window.__EDGE_CHART_PERF_ERROR__ = message;
        window.__EDGE_CHART_PERF_READY__ = true;
        setStatus(`Failed: ${message}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 16, gap: 12 }}>
      <header>
        <h1 style={{ margin: "0 0 4px", fontSize: 20 }}>Edge Chart Performance Harness</h1>
        <p style={{ margin: 0, opacity: 0.75, fontSize: 14 }}>
          Browser scenarios for initial render and pan/zoom sampling. Append <code>?autorun=1</code> for scripted runs.
        </p>
      </header>

      <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>{status}</p>

      <div
        id="perf-host"
        style={{
          flex: 1,
          minHeight: 680,
          border: "1px solid #30363d",
          borderRadius: 8,
          overflow: "hidden",
          position: "relative",
        }}
      />

      {results.length > 0 ? (
        <pre
          style={{
            margin: 0,
            padding: 12,
            borderRadius: 8,
            background: "#11161d",
            fontSize: 12,
            overflow: "auto",
            maxHeight: 240,
          }}
        >
          {JSON.stringify(results, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
