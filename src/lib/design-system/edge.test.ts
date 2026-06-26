import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { THEMES } from "@/lib/chartConfig";
import { edgeTokens, edgeChartColors, tokenKeyToCssVar } from "./edge";

type TokenKey = keyof (typeof edgeTokens)["light"];

function parseCssCustomProperties(block: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const pattern = /(--edge-[a-z0-9-]+):\s*([^;]+);/g;
  for (const match of block.matchAll(pattern)) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

function extractCssBlock(css: string, selector: ":root" | ".dark"): string {
  const pattern =
    selector === ":root" ? /:root\s*\{([^}]+)\}/ : /\.dark\s*\{([^}]+)\}/;
  const match = css.match(pattern);
  if (!match) {
    throw new Error(`Missing ${selector} block in globals.css`);
  }
  return match[1];
}

const globalsCss = readFileSync(
  resolve(process.cwd(), "src/app/globals.css"),
  "utf8",
);

const lightCssVars = parseCssCustomProperties(extractCssBlock(globalsCss, ":root"));
const darkCssVars = parseCssCustomProperties(extractCssBlock(globalsCss, ".dark"));

describe("edgeTokens", () => {
  it("defines light and dark themes with matching token keys", () => {
    expect(Object.keys(edgeTokens).sort()).toEqual([...THEMES].sort());
    const lightKeys = Object.keys(edgeTokens.light).sort();
    const darkKeys = Object.keys(edgeTokens.dark).sort();
    expect(darkKeys).toEqual(lightKeys);
  });

  it("keeps chart palette values derived from theme tokens", () => {
    for (const theme of THEMES) {
      const tokens = edgeTokens[theme];
      const tokenValues = new Set(Object.values(tokens));
      const chart = edgeChartColors[theme];

      expect(chart.up).toBe(tokens.positive);
      expect(chart.down).toBe(tokens.negative);
      expect(chart.wick).toBe(tokens.textPrimary);
      expect(chart.grid).toBe(tokens.borderSubtle);
      expect(chart.text).toBe(tokens.textSecondary);
      expect(chart.crosshair).toBe(tokens.textSecondary);
      expect(chart.lastPrice).toBe(tokens.accentBlue);
      expect(chart.axisBorder).toBe(tokens.border);

      if (theme === "light") {
        expect(chart.axisBg).toBe(tokens.surfaceChart);
      } else {
        expect(chart.axisBg).toBe(tokens.background);
      }

      for (const value of Object.values(chart)) {
        expect(tokenValues.has(value)).toBe(true);
      }
    }
  });

  it("matches globals.css light token values", () => {
    for (const key of Object.keys(edgeTokens.light) as TokenKey[]) {
      const cssVar = tokenKeyToCssVar(key);
      expect(lightCssVars[cssVar]).toBe(edgeTokens.light[key]);
    }
  });

  it("matches globals.css dark token values", () => {
    for (const key of Object.keys(edgeTokens.dark) as TokenKey[]) {
      const cssVar = tokenKeyToCssVar(key);
      expect(darkCssVars[cssVar]).toBe(edgeTokens.dark[key]);
    }
  });
});
