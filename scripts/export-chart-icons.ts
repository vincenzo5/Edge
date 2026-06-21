/**
 * Export chart toolbar icons to public/icons/chart/ as standalone SVG files.
 * Run: node --experimental-strip-types scripts/export-chart-icons.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHART_ICON_MARKUP, toStandaloneSvg, type ChartIconId } from "../src/app/components/chart-icons/iconPaths";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/icons/chart");

mkdirSync(outDir, { recursive: true });

const ids = Object.keys(CHART_ICON_MARKUP) as ChartIconId[];

for (const id of ids) {
  writeFileSync(join(outDir, `${id}.svg`), toStandaloneSvg(id));
}

console.log(`Exported ${ids.length} icons to ${outDir}`);
