export type QuoteTone = "up" | "down" | "flat";

export type BrowserTabQuoteInput = {
  symbol: string;
  price?: number | null;
  changePercent?: number | null;
};

const DEFAULT_TITLE = "Edge";
const DEFAULT_FAVICON = "/brand/favicon.svg";
const DYNAMIC_FAVICON_ID = "edge-quote-favicon";

/** Edge candle favicon — `#00FF88` placeholders are replaced per quote tone. */
const EDGE_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" role="img" aria-label="Edge">
  <g stroke="#00FF88" stroke-width="1.75" stroke-linecap="round">
    <line x1="4" y1="10" x2="4" y2="26" opacity="0.7"/>
    <rect x="2.1" y="13" width="3.8" height="8" rx="0.6" fill="none" opacity="0.75"/>
    <line x1="10" y1="6" x2="10" y2="24"/>
    <rect x="8.1" y="10" width="3.8" height="9" rx="0.6" fill="#00FF88" stroke="none"/>
    <line x1="16" y1="12" x2="16" y2="27" opacity="0.65"/>
    <rect x="14.1" y="15" width="3.8" height="7" rx="0.6" fill="none" opacity="0.7"/>
    <line x1="22" y1="4" x2="22" y2="23"/>
    <rect x="20.1" y="7" width="3.8" height="11" rx="0.6" fill="#00FF88" stroke="none"/>
    <line x1="28" y1="9" x2="28" y2="23"/>
    <rect x="26.1" y="11" width="3.8" height="7" rx="0.6" fill="#00FF88" stroke="none" opacity="0.9"/>
  </g>
</svg>`;

const FAVICON_COLORS: Record<QuoteTone, string> = {
  up: "#089981",
  down: "#f23645",
  flat: "#00FF88",
};

function directionArrowOverlay(tone: QuoteTone): string {
  if (tone === "flat") return "";

  const color = FAVICON_COLORS[tone];
  const arrowPath =
    tone === "up"
      ? "M16 12.5 L19.5 18.5 H12.5 Z"
      : "M16 19.5 L19.5 13.5 H12.5 Z";

  return `<g>
    <circle cx="16" cy="16" r="5.25" fill="#0B0C10" opacity="0.88"/>
    <path d="${arrowPath}" fill="${color}"/>
  </g>`;
}

export function quoteTone(changePercent: number | null | undefined): QuoteTone | null {
  if (changePercent == null || !Number.isFinite(changePercent)) return null;
  if (changePercent > 0) return "up";
  if (changePercent < 0) return "down";
  return "flat";
}

export function formatPrice(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value.toFixed(2);
}

export function formatChangePct(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatBrowserTabQuote(input: BrowserTabQuoteInput): string {
  const symbol = input.symbol.trim().toUpperCase();
  const price = formatPrice(input.price);
  const changePct = formatChangePct(input.changePercent);
  const tone = quoteTone(input.changePercent);

  const parts = [symbol];
  if (price) parts.push(price);
  if (tone === "up") parts.push("▲");
  if (tone === "down") parts.push("▼");
  if (changePct) parts.push(changePct);

  return `${parts.join(" ")} · Edge`;
}

export function quoteFaviconDataUrl(tone: QuoteTone): string {
  const color = FAVICON_COLORS[tone];
  const svg =
    EDGE_FAVICON_SVG.replaceAll("#00FF88", color).replace(
      "</svg>",
      `${directionArrowOverlay(tone)}</svg>`,
    );
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function ensureQuoteFaviconLink(): HTMLLinkElement {
  const existing = document.getElementById(DYNAMIC_FAVICON_ID);
  if (existing instanceof HTMLLinkElement) return existing;

  const link = document.createElement("link");
  link.id = DYNAMIC_FAVICON_ID;
  link.rel = "icon";
  link.type = "image/svg+xml";
  document.head.appendChild(link);
  return link;
}

function restoreEdgeFavicon(): void {
  document.getElementById(DYNAMIC_FAVICON_ID)?.remove();

  const icons = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
  for (const icon of icons) {
    if (icon.id === DYNAMIC_FAVICON_ID) continue;
    icon.href = DEFAULT_FAVICON;
  }
}

export function applyBrowserTabQuote(input: BrowserTabQuoteInput): void {
  if (typeof document === "undefined") return;

  document.title = formatBrowserTabQuote(input);
  const tone = quoteTone(input.changePercent) ?? "flat";
  const link = ensureQuoteFaviconLink();
  link.href = quoteFaviconDataUrl(tone);
}

export function clearBrowserTabQuote(): void {
  if (typeof document === "undefined") return;

  document.title = DEFAULT_TITLE;
  restoreEdgeFavicon();
}
