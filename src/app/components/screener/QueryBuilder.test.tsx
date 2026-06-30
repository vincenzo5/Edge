/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import QueryBuilder from "./QueryBuilder";
import {
  compileScreenQueryFromGroup,
  createDefaultRuleGroup,
  formatQueryRuleSummary,
  groupFromScreenQuery,
  isTechnicalQueryRule,
  type RuleGroup,
} from "@/lib/screener/compileQuery";

function StatefulQueryBuilder({ initialRoot }: { initialRoot: RuleGroup }) {
  const [root, setRoot] = useState(initialRoot);
  return <QueryBuilder root={root} onRootChange={setRoot} />;
}

describe("formatQueryRuleSummary", () => {
  it("formats text rules", () => {
    expect(formatQueryRuleSummary({ id: "1", field: "sector", value: "Technology" })).toBe(
      "Sector = Technology",
    );
  });

  it("formats boolean rules", () => {
    expect(formatQueryRuleSummary({ id: "1", field: "isEtf", value: true })).toBe("ETF only = yes");
    expect(formatQueryRuleSummary({ id: "1", field: "isEtf", value: false })).toBe("ETF only = no");
  });

  it("formats range rules", () => {
    expect(
      formatQueryRuleSummary({ id: "1", field: "marketCap", min: 1_000_000_000, max: 10_000_000_000 }),
    ).toBe("Market cap 1000000000–10000000000");
    expect(formatQueryRuleSummary({ id: "1", field: "volume", min: 500_000 })).toBe(
      "Volume ≥ 500000",
    );
  });
});

describe("QueryBuilder", () => {
  it("adds a technical rule with default RSI settings", () => {
    const onRootChange = vi.fn();
    render(<QueryBuilder root={createDefaultRuleGroup()} onRootChange={onRootChange} />);

    fireEvent.click(screen.getByTestId("screener-add-technical-rule"));
    expect(onRootChange).toHaveBeenCalled();
    const nextRoot = onRootChange.mock.calls.at(-1)?.[0];
    const technical = nextRoot.children.find(isTechnicalQueryRule);
    expect(technical?.technical).toMatchObject({
      kind: "indicator",
      indicator: "RSI",
      series: "rsi",
    });
  });

  it("disables adding a second technical rule", () => {
    const query = {
      volume: { min: 500_000 },
      technical: {
        kind: "indicator" as const,
        indicator: "MACD",
        inputs: { fast: 12, slow: 26, signal: 9 },
        series: "histogram",
        bar: "last" as const,
        op: ">" as const,
        threshold: 0,
      },
      limit: 200,
    };
    render(<QueryBuilder root={groupFromScreenQuery(query)} onRootChange={vi.fn()} />);

    expect(screen.getByTestId("screener-add-technical-rule")).toBeDisabled();
    expect(screen.getByTestId("screener-technical-rule-rule-technical")).toBeTruthy();
    fireEvent.click(screen.getByTestId("screener-rule-toggle-rule-technical"));
    expect(screen.getByTestId("screener-technical-indicator-rule-technical")).toBeTruthy();
  });

  it("shows read-only summary for golden cross preset query", () => {
    const query = {
      volume: { min: 500_000 },
      technical: { kind: "goldenCross" as const, fast: 50, slow: 200 },
      limit: 200,
    };
    render(<QueryBuilder root={groupFromScreenQuery(query)} onRootChange={vi.fn()} />);

    expect(screen.getByText(/Golden cross/i)).toBeTruthy();
    expect(screen.getByText(/read-only/i)).toBeTruthy();
  });

  it("round-trips editable indicator rule through compile", () => {
    const root = groupFromScreenQuery({
      volume: { min: 500_000 },
      technical: {
        kind: "indicator",
        indicator: "MACD",
        inputs: { fast: 12, slow: 26, signal: 9 },
        series: "histogram",
        bar: "last",
        op: ">",
        threshold: 0,
      },
      limit: 200,
    });
    expect(compileScreenQueryFromGroup(root, 200).technical).toMatchObject({
      kind: "indicator",
      indicator: "MACD",
      series: "histogram",
    });
  });

  it("hides technical editor when collapsed and shows when expanded", () => {
    render(<StatefulQueryBuilder initialRoot={createDefaultRuleGroup()} />);
    fireEvent.click(screen.getByTestId("screener-add-technical-rule"));

    expect(screen.getByTestId(/screener-technical-indicator-/)).toBeTruthy();

    const toggle = screen.getByTestId(/^screener-rule-toggle-technical-/);
    fireEvent.click(toggle);
    expect(screen.queryByTestId(/screener-technical-indicator-/)).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByTestId(/screener-technical-indicator-/)).toBeTruthy();
  });

  it("expand all and collapse all toggle rule editors", () => {
    render(<StatefulQueryBuilder initialRoot={createDefaultRuleGroup()} />);
    fireEvent.click(screen.getByTestId("screener-add-rule"));
    fireEvent.click(screen.getByTestId("screener-add-rule"));

    fireEvent.click(screen.getByTestId("screener-collapse-all"));
    expect(screen.queryByPlaceholderText("Sector")).toBeNull();

    fireEvent.click(screen.getByTestId("screener-expand-all"));
    expect(screen.getAllByPlaceholderText("Sector").length).toBeGreaterThan(0);
  });

  it("renders bounded scroll container when rules exist", () => {
    const root = groupFromScreenQuery({ sector: "Technology", limit: 200 });
    render(<QueryBuilder root={root} onRootChange={vi.fn()} />);
    expect(screen.getByTestId("screener-rules-scroll")).toBeTruthy();
  });
});
