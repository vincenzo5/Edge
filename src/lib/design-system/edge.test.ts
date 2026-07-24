import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { THEMES } from "@/lib/chartConfig";
import {
  edgeTokens,
  edgeChartColors,
  edgeLayoutTokens,
  tokenKeyToCssVar,
  layoutTokenKeyToCssVar,
  syncedLayoutTokenKeys,
  getEdgeTokens,
  PALETTES,
  DEFAULT_PALETTE,
  type PaletteId,
} from "./edge";
import { getChartColors as getCoreChartColors } from "@edge/chart-core";

type TokenKey = keyof (typeof edgeTokens)["midnight"]["light"];

function parseCssCustomProperties(block: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const pattern = /(--edge-[a-z0-9-]+):\s*([^;]+);/g;
  for (const match of block.matchAll(pattern)) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

function extractCssBlock(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`);
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

function paletteCssVars(palette: PaletteId, theme: "light" | "dark"): Record<string, string> {
  if (palette === DEFAULT_PALETTE && theme === "light") return lightCssVars;
  if (palette === DEFAULT_PALETTE && theme === "dark") return darkCssVars;
  const selector =
    theme === "light" ? `:root[data-palette="${palette}"]` : `.dark[data-palette="${palette}"]`;
  return parseCssCustomProperties(extractCssBlock(globalsCss, selector));
}

describe("edgeTokens", () => {
  it("defines all palettes with matching light/dark token keys", () => {
    expect(Object.keys(edgeTokens).sort()).toEqual([...PALETTES].sort());
    const referenceKeys = Object.keys(edgeTokens.midnight.light).sort();
    for (const palette of PALETTES) {
      expect(Object.keys(edgeTokens[palette].light).sort()).toEqual(referenceKeys);
      expect(Object.keys(edgeTokens[palette].dark).sort()).toEqual(referenceKeys);
    }
  });

  it("keeps chart palette values derived from theme tokens", () => {
    for (const palette of PALETTES) {
      for (const theme of THEMES) {
        const tokens = edgeTokens[palette][theme];
        const tokenValues = new Set(Object.values(tokens));
        const chart = edgeChartColors[palette][theme];

        expect(chart.up).toBe(tokens.positive);
        expect(chart.down).toBe(tokens.negative);
        expect(chart.wick).toBe(tokens.textPrimary);
        expect(chart.grid).toBe(tokens.borderSubtle);
        expect(chart.text).toBe(tokens.textSecondary);
        expect(chart.crosshair).toBe(tokens.textSecondary);
        expect(chart.lastPrice).toBe(tokens.accentBlue);
        expect(chart.axisBorder).toBe(tokens.border);
        expect(chart.axisBg).toBe(tokens.surfaceChart);

        for (const value of Object.values(chart)) {
          expect(tokenValues.has(value)).toBe(true);
        }
      }
    }
  });

  it("matches chart-core themeTokens for each palette and mode", () => {
    for (const palette of PALETTES) {
      for (const theme of THEMES) {
        expect(getCoreChartColors(theme, palette)).toEqual(edgeChartColors[palette][theme]);
      }
    }
  });

  it("matches globals.css midnight fallback token values", () => {
    for (const key of Object.keys(edgeTokens.midnight.light) as TokenKey[]) {
      const cssVar = tokenKeyToCssVar(key);
      expect(lightCssVars[cssVar]).toBe(edgeTokens.midnight.light[key]);
      expect(darkCssVars[cssVar]).toBe(edgeTokens.midnight.dark[key]);
    }
  });

  it("matches globals.css palette token values", () => {
    for (const palette of PALETTES) {
      if (palette === DEFAULT_PALETTE) continue;
      for (const theme of THEMES) {
        const cssVars = paletteCssVars(palette, theme);
        const tokens = getEdgeTokens(palette, theme);
        for (const key of Object.keys(tokens) as TokenKey[]) {
          const cssVar = tokenKeyToCssVar(key);
          expect(cssVars[cssVar]).toBe(tokens[key]);
        }
      }
    }
  });
});

describe("edgeLayoutTokens", () => {
  it("matches globals.css layout token values", () => {
    for (const key of syncedLayoutTokenKeys) {
      const cssVar = layoutTokenKeyToCssVar(key);
      expect(lightCssVars[cssVar] ?? darkCssVars[cssVar]).toBe(edgeLayoutTokens[key]);
    }
  });

  it("uses 32px compact and 36px standard control heights", () => {
    expect(edgeLayoutTokens.controlHeightCompact).toBe("32px");
    expect(edgeLayoutTokens.controlHeightStandard).toBe("36px");
  });
});

const BANNED_COMPONENT_TOKENS = [
  "--edge-bg-secondary",
  "--edge-bg-tertiary",
  "--edge-surface-raised",
  "--edge-surface-muted",
  "--edge-danger",
  "--edge-text-danger",
  "--edge-surface-base",
  "--edge-accent-primary",
];

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.(tsx|ts|css)$/.test(entry.name) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("production component token references", () => {
  it("does not reference banned undefined Edge CSS variables", () => {
    const componentsRoot = resolve(process.cwd(), "src/app/components");
    const libRoot = resolve(process.cwd(), "src/lib");
    const sources = [...collectSourceFiles(componentsRoot), ...collectSourceFiles(libRoot)];
    const bareSurfacePattern = /var\(--edge-surface\)/;

    const violations: string[] = [];
    for (const file of sources) {
      const content = readFileSync(file, "utf8");
      for (const token of BANNED_COMPONENT_TOKENS) {
        if (content.includes(token)) {
          violations.push(`${file}: ${token}`);
        }
      }
      if (bareSurfacePattern.test(content)) {
        violations.push(`${file}: bare --edge-surface`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("does not use Tailwind palette utility classes in app components", () => {
    const palettePattern =
      /(?:^|[\s"'`])(?:text|bg|border|ring|fill|stroke)-(?:gray|blue|red|green|slate|zinc|neutral|stone|orange|amber|yellow|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-\d+/;
    const componentsRoot = resolve(process.cwd(), "src/app/components");
    const sources = collectSourceFiles(componentsRoot);
    const violations: string[] = [];
    for (const file of sources) {
      const content = readFileSync(file, "utf8");
      if (palettePattern.test(content)) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });

  it("does not use native select elements in app components", () => {
    const componentsRoot = resolve(process.cwd(), "src/app/components");
    const sources = collectSourceFiles(componentsRoot);
    const violations: string[] = [];
    for (const file of sources) {
      const content = readFileSync(file, "utf8");
      if (/<select[\s>]/.test(content)) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });
});
