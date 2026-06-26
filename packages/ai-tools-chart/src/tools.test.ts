import { describe, expect, it } from "vitest";
import { createToolRegistry, executeTool } from "@edge/ai-tools-core";
import {
  createChartSessionTools,
  createInMemoryChartSession,
} from "@edge/ai-tools-chart";

describe("@edge/ai-tools-chart", () => {
  it("summarizes and mutates in-memory chart state", async () => {
    const chart = createInMemoryChartSession({ symbol: "DEMO" });
    const registry = createToolRegistry(createChartSessionTools());
    const context = { clientSession: true, chart };

    const summary = await executeTool(registry, "summarize_chart", {}, context);
    expect(summary.ok).toBe(true);
    if (summary.ok) {
      expect(summary.data.symbol).toBe("DEMO");
      expect(summary.data.indicatorCount).toBe(0);
    }

    const add = await executeTool(
      registry,
      "add_indicator",
      { name: "MA", pane: "main" },
      context,
      { permissionMode: "write" },
    );
    expect(add.ok).toBe(true);

    const after = await executeTool(registry, "summarize_chart", {}, context);
    expect(after.ok).toBe(true);
    if (after.ok) {
      expect(after.data.indicatorCount).toBe(1);
    }

    const setType = await executeTool(
      registry,
      "set_chart_type",
      { chartType: "area" },
      context,
      { permissionMode: "write" },
    );
    expect(setType.ok).toBe(true);
    expect(chart.getState().chartType).toBe("area");
  });

  it("requires confirmation for destructive clear_drawings", async () => {
    const chart = createInMemoryChartSession();
    chart.setState({
      ...chart.getState(),
      drawings: [
        {
          id: "d1",
          name: "horizontal_line",
          label: "Support",
          points: [{ dataIndex: 0, value: 100 }],
          visible: true,
          locked: false,
          zLevel: 0,
        },
      ],
    });
    const registry = createToolRegistry(createChartSessionTools());
    const context = { clientSession: true, chart };

    const denied = await executeTool(registry, "clear_drawings", {}, context, {
      permissionMode: "full",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("confirmation_required");

    const ok = await executeTool(registry, "clear_drawings", {}, context, {
      permissionMode: "full",
      confirmed: true,
    });
    expect(ok.ok).toBe(true);
    expect(chart.getState().drawings).toHaveLength(0);
  });
});
