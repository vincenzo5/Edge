import { createToolRegistry, executeTool } from "@edge/ai-tools-core";
import {
  createChartSessionTools,
  createInMemoryChartSession,
} from "@edge/ai-tools-chart";

async function main() {
  const chart = createInMemoryChartSession({ symbol: "DEMO" });
  const registry = createToolRegistry(createChartSessionTools());
  const context = { clientSession: true, chart };

  const summary = await executeTool(registry, "summarize_chart", {}, context);
  if (!summary.ok) throw new Error(summary.error);
  console.log("summarize_chart:", summary.data);

  const add = await executeTool(
    registry,
    "add_indicator",
    { name: "RSI", pane: "sub" },
    context,
    { permissionMode: "write" },
  );
  if (!add.ok) throw new Error(add.error);
  console.log("add_indicator:", add.data);

  const setType = await executeTool(
    registry,
    "set_chart_type",
    { chartType: "area" },
    context,
    { permissionMode: "write" },
  );
  if (!setType.ok) throw new Error(setType.error);
  console.log("set_chart_type:", setType.data);

  const state = await executeTool(registry, "get_chart_state", {}, context);
  if (!state.ok) throw new Error(state.error);
  console.log("get_chart_state indicators:", (state.data as { state: { indicators: unknown[] } }).state.indicators.length);

  console.log("AI chart tools example passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
