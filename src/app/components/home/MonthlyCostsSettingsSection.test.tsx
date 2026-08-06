import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MonthlyCostsSettingsSection from "./MonthlyCostsSettingsSection";
import type { ServerHealthPayload } from "@/lib/marketData/health";

const healthWithMassive: ServerHealthPayload = {
  generatedAt: Date.now(),
  providers: [
    { id: "massive", label: "Massive", configured: true, status: "healthy", detail: "ok" },
    { id: "fmp", label: "FMP", configured: false, status: "disabled", detail: "missing" },
  ],
  recentWarnings: [],
  cache: { kind: "memory", degraded: false, lastPingOk: null, lastPingAt: null },
};

describe("MonthlyCostsSettingsSection", () => {
  it("renders catalog rows and configured fixed total", () => {
    render(<MonthlyCostsSettingsSection enabled health={healthWithMassive} />);

    expect(screen.getByTestId("app-settings-monthly-costs")).toBeInTheDocument();
    expect(screen.getByTestId("app-settings-cost-row-massive-options")).toBeInTheDocument();
    expect(screen.getByTestId("app-settings-cost-row-openrouter")).toBeInTheDocument();
    expect(screen.getByTestId("app-settings-monthly-costs-total")).toHaveTextContent("$79.00 / mo");
    expect(screen.getByTestId("app-settings-cost-row-massive-options")).toHaveTextContent("Inactive");
  });

  it("does not render when disabled", () => {
    render(<MonthlyCostsSettingsSection enabled={false} health={null} />);
    expect(screen.queryByTestId("app-settings-monthly-costs")).not.toBeInTheDocument();
  });
});
