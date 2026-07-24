import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";
import sharp from "sharp";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.UX_BASELINE_URL ?? "http://localhost:3003";
const viewportHeight = 900;
const widths = [1024, 1440, 1920] as const;
const assetsDir = path.join(repoRoot, "docs/assets/ux-polish/phase-0");
const auditDir = path.join(repoRoot, "docs/ux-baseline");

const APP_WORKSPACES_KEY = "tv-ai:app-workspaces:v1";
const JOURNAL_LOCAL_KEY = "edge.journal.v1";
const SCREENER_KEY = "tv-ai:screener:v1";

type AuditRouteId =
  | "home"
  | "workspace-chart"
  | "workspace-screener"
  | "workspace-journal";

type CaptureId =
  | "home"
  | "workspace-chart"
  | "workspace-screener-empty"
  | "workspace-journal-empty"
  | "workspace-journal-import-modal"
  | "workspace-chart-type-popover";

type RouteAuditSpec = {
  id: AuditRouteId;
  requestedPath: string;
  setup?: "default-workspace" | "empty-journal";
  readySelector: string;
  exitEditMode?: boolean;
};

type CaptureSpec = {
  id: CaptureId;
  filename: string;
  width: number;
  prepare: (page: Page) => Promise<void>;
  readySelector: string;
};

type SmallTarget = {
  tag: string;
  text: string;
  width: number;
  height: number;
  minSize: number;
  testId: string | null;
};

type SmallText = {
  tag: string;
  text: string;
  fontSizePx: number;
  role: "title" | "body";
  testId: string | null;
};

type ContrastIssue = {
  tag: string;
  text: string;
  ratio: number;
  required: number;
  foreground: string;
  background: string;
  testId: string | null;
};

type RouteAuditRecord = {
  id: AuditRouteId;
  requestedPath: string;
  finalUrl: string;
  width: number;
  height: number;
  readySelector: string;
  readyMs: number;
  layoutEditModeVisible: boolean;
  overflow: {
    innerWidth: number;
    docScrollWidth: number;
    bodyScrollWidth: number;
    horizontalOverflow: boolean;
    overflowPx: number;
  };
  smallTargets: SmallTarget[];
  smallText: SmallText[];
  contrastIssues: ContrastIssue[];
  captureError: string | null;
};

type BaselineReport = {
  generatedAt: string;
  baseUrl: string;
  git: { commit?: string; branch?: string };
  audits: RouteAuditRecord[];
  captures: Array<{ id: CaptureId; filename: string; width: number; path: string }>;
  sourceColorAudit: {
    rawHexFileCount: number;
    tailwindPaletteFileCount: number;
    samplePaths: string[];
  };
  summary: {
    auditCount: number;
    auditTarget: number;
    captureCount: number;
    captureTarget: number;
    failures: string[];
  };
};

const auditRoutes: RouteAuditSpec[] = [
  {
    id: "home",
    requestedPath: "/home",
    readySelector: '[data-testid="home-shell"]',
  },
  {
    id: "workspace-chart",
    requestedPath: "/workspace",
    setup: "default-workspace",
    readySelector: '[data-testid="chart-tile-host"]',
  },
  {
    id: "workspace-screener",
    requestedPath: "/workspace?surface=screener",
    setup: "default-workspace",
    readySelector: '[data-testid="screener-tile-surface"]',
    exitEditMode: true,
  },
  {
    id: "workspace-journal",
    requestedPath: "/workspace?surface=journal&journalView=dashboard",
    setup: "empty-journal",
    readySelector: '[data-testid="journal-global-empty"]',
    exitEditMode: true,
  },
];

const SCREENER_PRE_RUN_SELECTOR = '[data-testid="screener-results-never-run"]';

const captureSpecs: CaptureSpec[] = [
  ...widths.map(
    (width): CaptureSpec => ({
      id: "home",
      filename: `home-${width}.webp`,
      width,
      prepare: async (page) => {
        await seedStorage(page, {});
        await gotoAndWait(page, "/home", '[data-testid="home-shell"]');
      },
      readySelector: '[data-testid="home-shell"]',
    }),
  ),
  ...widths.map(
    (width): CaptureSpec => ({
      id: "workspace-chart",
      filename: `workspace-chart-${width}.webp`,
      width,
      prepare: async (page) => {
        await seedStorage(page, { workspace: "default" });
        await gotoAndWait(page, "/workspace", '[data-testid="chart-tile-host"]');
      },
      readySelector: '[data-testid="chart-tile-host"]',
    }),
  ),
  {
    id: "workspace-screener-empty",
    filename: "workspace-screener-empty-1440.webp",
    width: 1440,
    prepare: async (page) => {
      await preparePage(page);
      await seedStorage(page, { workspace: "default" });
      await gotoAndWait(
        page,
        "/workspace?surface=screener",
        SCREENER_PRE_RUN_SELECTOR,
        { exitEditMode: true },
      );
    },
    readySelector: SCREENER_PRE_RUN_SELECTOR,
  },
  {
    id: "workspace-journal-empty",
    filename: "workspace-journal-empty-1440.webp",
    width: 1440,
    prepare: async (page) => {
      await preparePage(page, { emptyJournal: true });
      await seedStorage(page, { workspace: "default", emptyJournal: true });
      await gotoAndWait(
        page,
        "/workspace?surface=journal&journalView=dashboard",
        '[data-testid="journal-global-empty"]',
        { exitEditMode: true },
      );
    },
    readySelector: '[data-testid="journal-global-empty"]',
  },
  {
    id: "workspace-journal-import-modal",
    filename: "workspace-journal-import-modal-1440.webp",
    width: 1440,
    prepare: async (page) => {
      await preparePage(page, { emptyJournal: true });
      await seedStorage(page, { workspace: "default", emptyJournal: true });
      await gotoAndWait(
        page,
        "/workspace?surface=journal&journalView=dashboard",
        '[data-testid="journal-global-empty"]',
        { exitEditMode: true },
      );
      await page.locator('[data-testid="journal-tile-nav"] [data-testid="journal-import-open"]').click();
      await page.waitForSelector('[data-testid="journal-import-dialog"]', {
        state: "visible",
        timeout: 15_000,
      });
    },
    readySelector: '[data-testid="journal-import-dialog"]',
  },
  {
    id: "workspace-chart-type-popover",
    filename: "workspace-chart-type-popover-1440.webp",
    width: 1440,
    prepare: async (page) => {
      await seedStorage(page, { workspace: "default" });
      await gotoAndWait(page, "/workspace", '[data-testid="chart-type-trigger"]');
      await page.locator('[data-testid="chart-type-trigger"]').click();
      await page.waitForSelector("text=Candles", { state: "visible", timeout: 15_000 });
    },
    readySelector: '[data-testid="chart-type-trigger"]',
  },
];

function gitMeta(): { commit?: string; branch?: string } {
  try {
    return {
      commit: execSync("git rev-parse --short HEAD", { cwd: repoRoot, encoding: "utf8" }).trim(),
      branch: execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoRoot, encoding: "utf8" }).trim(),
    };
  } catch {
    return {};
  }
}

async function assertServerReady(): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/home`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Edge dev server is not reachable at ${baseUrl}. Start it first with \`npm run dev:lite\` or \`npm run dev\`. (${String(error)})`,
    );
  }
}

async function installJournalEmptyRoutes(page: Page): Promise<void> {
  await page.route("**/api/me/journal/trades**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ trades: [] }),
    });
  });
  await page.route("**/api/me/journal/fills**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ fills: [] }),
      });
      return;
    }
    await route.continue();
  });
}

async function preparePage(page: Page, options?: { emptyJournal?: boolean }): Promise<void> {
  if (options?.emptyJournal) {
    await installJournalEmptyRoutes(page);
  }
}

async function seedStorage(
  page: Page,
  options: { workspace?: "default"; emptyJournal?: boolean },
): Promise<void> {
  await page.addInitScript(
    ({ appWorkspacesKey, journalKey, screenerKey, emptyJournal }) => {
      localStorage.removeItem(appWorkspacesKey);
      localStorage.removeItem(screenerKey);
      if (emptyJournal) {
        localStorage.setItem(
          journalKey,
          JSON.stringify({ fills: [], trades: [], updatedAt: 0 }),
        );
      } else {
        localStorage.removeItem(journalKey);
      }
    },
    {
      appWorkspacesKey: APP_WORKSPACES_KEY,
      journalKey: JOURNAL_LOCAL_KEY,
      screenerKey: SCREENER_KEY,
      emptyJournal: Boolean(options.emptyJournal),
    },
  );
}

async function gotoAndWait(
  page: Page,
  requestedPath: string,
  readySelector: string,
  options?: { exitEditMode?: boolean },
): Promise<number> {
  const started = Date.now();
  await page.goto(`${baseUrl}${requestedPath}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForSelector(readySelector, { state: "visible", timeout: 60_000 });
  if (options?.exitEditMode) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(500);
  return Date.now() - started;
}

async function runDomAudit(page: Page): Promise<{
  overflow: RouteAuditRecord["overflow"];
  smallTargets: SmallTarget[];
  smallText: SmallText[];
  contrastIssues: ContrastIssue[];
  layoutEditModeVisible: boolean;
}> {
  return page.evaluate(`(() => {
    const titleTags = new Set(["H1", "H2", "H3", "H4"]);
    const interactiveSelector =
      'button,a,[role="button"],input,select,textarea,[tabindex]:not([tabindex="-1"])';

    function parseRgb(color) {
      const match = color.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/i);
      if (!match) return null;
      return [Number(match[1]), Number(match[2]), Number(match[3])];
    }

    function luminance(rgb) {
      const channels = rgb.map((value) => {
        const normalized = value / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : Math.pow((normalized + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }

    function contrastRatio(fg, bg) {
      const l1 = luminance(fg);
      const l2 = luminance(bg);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function visible(el) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const style = window.getComputedStyle(el);
      return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
    }

    function backgroundFor(el) {
      let current = el;
      while (current) {
        const bg = parseRgb(window.getComputedStyle(current).backgroundColor);
        if (bg && (bg[0] !== 0 || bg[1] !== 0 || bg[2] !== 0)) return bg;
        current = current.parentElement;
      }
      return parseRgb(window.getComputedStyle(document.body).backgroundColor);
    }

    const docScrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const innerWidth = window.innerWidth;
    const maxScroll = Math.max(docScrollWidth, bodyScrollWidth);
    const overflowPx = Math.max(0, maxScroll - innerWidth);

    const smallTargets = [];
    for (const el of Array.from(document.querySelectorAll(interactiveSelector))) {
      if (!visible(el)) continue;
      const rect = el.getBoundingClientRect();
      const minSize = Math.min(rect.width, rect.height);
      if (minSize >= 32) continue;
      smallTargets.push({
        tag: el.tagName,
        text: (el.textContent || "").trim().slice(0, 48),
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
        minSize: Math.round(minSize * 10) / 10,
        testId: el.getAttribute("data-testid"),
      });
    }

    const smallText = [];
    for (const el of Array.from(document.querySelectorAll("h1,h2,h3,h4,button,a,p,span,label"))) {
      if (!visible(el)) continue;
      const text = (el.textContent || "").trim();
      if (!text) continue;
      const style = window.getComputedStyle(el);
      const fontSizePx = Number.parseFloat(style.fontSize);
      const role = titleTags.has(el.tagName) ? "title" : "body";
      const threshold = role === "title" ? 14 : 12;
      if (fontSizePx >= threshold) continue;
      smallText.push({
        tag: el.tagName,
        text: text.slice(0, 48),
        fontSizePx: Math.round(fontSizePx * 10) / 10,
        role,
        testId: el.getAttribute("data-testid"),
      });
    }

    const contrastIssues = [];
    for (const el of Array.from(document.querySelectorAll("button,a,p,span,label,h1,h2,h3,h4"))) {
      if (!visible(el)) continue;
      const text = (el.textContent || "").trim();
      if (!text) continue;
      const style = window.getComputedStyle(el);
      const fg = parseRgb(style.color);
      const bg = backgroundFor(el);
      if (!fg || !bg) continue;
      const ratio = contrastRatio(fg, bg);
      const fontSize = Number.parseFloat(style.fontSize);
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
      const largeText = fontWeight >= 600 && fontSize >= 18;
      const required = largeText ? 3 : 4.5;
      if (ratio >= required) continue;
      contrastIssues.push({
        tag: el.tagName,
        text: text.slice(0, 48),
        ratio: Math.round(ratio * 100) / 100,
        required,
        foreground: style.color,
        background: "rgb(" + bg.join(", ") + ")",
        testId: el.getAttribute("data-testid"),
      });
    }

    const layoutEditModeVisible = Boolean(
      (document.body.textContent || "").includes("Editing layout") ||
        document.querySelector('[data-testid="workspace-layout-preset-picker"]'),
    );

    return {
      overflow: {
        innerWidth,
        docScrollWidth,
        bodyScrollWidth,
        horizontalOverflow: overflowPx > 1,
        overflowPx,
      },
      smallTargets: smallTargets.slice(0, 40),
      smallText: smallText.slice(0, 40),
      contrastIssues: contrastIssues.slice(0, 40),
      layoutEditModeVisible,
    };
  })()`);
}

async function saveWebpScreenshot(page: Page, outputPath: string): Promise<void> {
  const png = await page.screenshot({ fullPage: true, type: "png" });
  await sharp(png).webp({ quality: 88 }).toFile(outputPath);
}

function auditSourceColors(): BaselineReport["sourceColorAudit"] {
  const hexMatches = execSync(
    `rg -l '#[0-9A-Fa-f]{3,8}' src/app/components --glob '*.{ts,tsx}' || true`,
    { cwd: repoRoot, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  const tailwindMatches = execSync(
    String.raw`rg -l '(text|bg|border|ring|fill|stroke)-(gray|blue|red|green|slate|zinc|neutral|stone|orange|amber|yellow|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-' src/app/components --glob '*.{ts,tsx}' || true`,
    { cwd: repoRoot, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);

  return {
    rawHexFileCount: hexMatches.length,
    tailwindPaletteFileCount: tailwindMatches.length,
    samplePaths: [...new Set([...hexMatches.slice(0, 5), ...tailwindMatches.slice(0, 5)])],
  };
}

async function auditRoute(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  spec: RouteAuditSpec,
  width: number,
): Promise<RouteAuditRecord> {
  const context = await browser.newContext({
    viewport: { width, height: viewportHeight },
    colorScheme: "dark",
  });
  const page = await context.newPage();

  try {
    await preparePage(page, { emptyJournal: spec.setup === "empty-journal" });
    await seedStorage(page, {
      workspace: spec.setup === "default-workspace" ? "default" : undefined,
      emptyJournal: spec.setup === "empty-journal",
    });
    const readyMs = await gotoAndWait(page, spec.requestedPath, spec.readySelector, {
      exitEditMode: spec.exitEditMode,
    });
    const dom = await runDomAudit(page);

    return {
      id: spec.id,
      requestedPath: spec.requestedPath,
      finalUrl: page.url(),
      width,
      height: viewportHeight,
      readySelector: spec.readySelector,
      readyMs,
      layoutEditModeVisible: dom.layoutEditModeVisible,
      overflow: dom.overflow,
      smallTargets: dom.smallTargets,
      smallText: dom.smallText,
      contrastIssues: dom.contrastIssues,
      captureError: null,
    };
  } catch (error) {
    return {
      id: spec.id,
      requestedPath: spec.requestedPath,
      finalUrl: page.url(),
      width,
      height: viewportHeight,
      readySelector: spec.readySelector,
      readyMs: 0,
      layoutEditModeVisible: false,
      overflow: {
        innerWidth: width,
        docScrollWidth: 0,
        bodyScrollWidth: 0,
        horizontalOverflow: false,
        overflowPx: 0,
      },
      smallTargets: [],
      smallText: [],
      contrastIssues: [],
      captureError: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await context.close();
  }
}

async function captureScreenshot(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  spec: CaptureSpec,
): Promise<{ id: CaptureId; filename: string; width: number; path: string; error: string | null }> {
  const context = await browser.newContext({
    viewport: { width: spec.width, height: viewportHeight },
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const outputPath = path.join(assetsDir, spec.filename);

  try {
    await spec.prepare(page);
    await saveWebpScreenshot(page, outputPath);
    return {
      id: spec.id,
      filename: spec.filename,
      width: spec.width,
      path: path.relative(repoRoot, outputPath),
      error: null,
    };
  } catch (error) {
    return {
      id: spec.id,
      filename: spec.filename,
      width: spec.width,
      path: path.relative(repoRoot, outputPath),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  console.log("Edge UX baseline capture\n");
  await assertServerReady();

  mkdirSync(assetsDir, { recursive: true });
  mkdirSync(auditDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const audits: RouteAuditRecord[] = [];
  const captures: Array<{
    id: CaptureId;
    filename: string;
    width: number;
    path: string;
    error: string | null;
  }> = [];

  try {
    for (const spec of auditRoutes) {
      for (const width of widths) {
        console.log(`Auditing ${spec.id} @ ${width}px…`);
        audits.push(await auditRoute(browser, spec, width));
      }
    }

    for (const spec of captureSpecs) {
      console.log(`Capturing ${spec.filename}…`);
      captures.push(await captureScreenshot(browser, spec));
    }
  } finally {
    await browser.close();
  }

  const sourceColorAudit = auditSourceColors();
  const failures = [
    ...audits.filter((audit) => audit.captureError).map((audit) => `${audit.id}@${audit.width}: ${audit.captureError}`),
    ...captures.filter((capture) => capture.error).map((capture) => `${capture.filename}: ${capture.error}`),
  ];

  const report: BaselineReport = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    git: gitMeta(),
    audits,
    captures: captures.map(({ id, filename, width, path: capturePath }) => ({
      id,
      filename,
      width,
      path: capturePath,
    })),
    sourceColorAudit,
    summary: {
      auditCount: audits.filter((audit) => !audit.captureError).length,
      auditTarget: auditRoutes.length * widths.length,
      captureCount: captures.filter((capture) => !capture.error).length,
      captureTarget: captureSpecs.length,
      failures,
    },
  };

  const latestPath = path.join(auditDir, "ux-baseline-latest.json");
  const stampedPath = path.join(
    auditDir,
    `ux-baseline-${report.generatedAt.replace(/[:.]/g, "-")}.json`,
  );
  const payload = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(latestPath, payload);
  writeFileSync(stampedPath, payload);

  console.log("\nUX baseline summary:");
  console.log(`- Audits: ${report.summary.auditCount}/${report.summary.auditTarget}`);
  console.log(`- Captures: ${report.summary.captureCount}/${report.summary.captureTarget}`);
  console.log(`- Raw hex files (components): ${sourceColorAudit.rawHexFileCount}`);
  console.log(`- Tailwind palette files (components): ${sourceColorAudit.tailwindPaletteFileCount}`);
  console.log(`- JSON: ${path.relative(repoRoot, latestPath)}`);
  console.log(`- Assets: ${path.relative(repoRoot, assetsDir)}/`);

  if (failures.length > 0) {
    console.error("\nFailures:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("UX_BASELINE: FAIL", error);
  process.exit(1);
});
