# News Flow Roadmap — Market News Integrations

Research note for later: economics and provider options for in-app market news. **Not an architecture design.**

**Last updated:** 2026-07-16

**Status:** Research captured; implementation not started.

**Related:** [Edge Roadmap](../ROADMAP.md) (Phase 2 News workflows), [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), chart news overlays / `/api/news` (FMP-backed today).

---

## What Edge Has Today

| Piece | Status |
|-------|--------|
| `GET /api/news` → FMP adapter | Wired; often empty / 402 on current FMP plan |
| Chart news event badges | Shipped (opt-in; off by default) |
| SEC EDGAR filings | Shipped (events, not editorial news) |
| News Feed panel | Roadmap only (Phase 2) |

---

## What “Market News” Covers

| Layer | Examples | Cost band |
|-------|----------|-----------|
| Filings / official | SEC EDGAR, Fed RSS | **$0** |
| Aggregated headlines | FMP, Finnhub, Marketaux, Stock News API, Polygon | **$0–$200/mo** (API access) |
| Licensed editorial wire | Benzinga, Intrinio NewsEdge | **$0 basic → custom $300+/mo** |
| Broad publisher aggregate | NewsAPI Business | **~$449/mo** |
| Pro wires | Dow Jones, Reuters/LSEG, Bloomberg | **$1k–$10k+/mo** (often much more) |

**Cost trap:** cheap personal/internal API access ≠ rights to show news to end users. FMP, Finnhub, Polygon, Alpha Vantage, Tiingo typically need a separate commercial/display license for a client-facing app.

---

## Provider Snapshot (cost-efficient → expensive)

| Source | What you get | ~Cost | App-display? |
|--------|--------------|------:|--------------|
| **SEC EDGAR** | Filings (8-K, 10-K/Q, ownership) | $0 | Yes (public) |
| **Gov/Fed RSS** | Macro / policy | $0 | Usually yes |
| **Benzinga Basic** (AWS Marketplace) | Headline + teaser + link | **$0** | **Yes (designed for apps)** |
| **FMP** (already wired) | Stock/general/press/crypto/FX news | Starter **$19**, Premium **$49**/mo | **No** — needs FMP Data Display license |
| **Stock News API** | Ticker + market headlines | **$20–$50**/mo | Confirm ToS |
| **Marketaux** | Global + sentiment | **$29–$199**/mo | Confirm commercial |
| **Finnhub / Polygon news** | Company/market news | **~$29–$200**/mo | Enterprise/Business only |
| **NewsAPI** | Broad discovery | **$449**/mo Business | Snippets/links only |
| **Benzinga Premium / Intrinio** | Full body, real-time wire | Custom (**~$300–$1,250+**/mo) | Negotiated |
| **DJ / Reuters / Bloomberg** | Pro low-latency full text | Enterprise | Negotiated |
| Yahoo scrape / outlet RSS | Headlines | $0 | Risky / often non-commercial |
| TradingView | — | — | No public news API |

Pricing checked ~2026-07; confirm before buying.

---

## Recommended Stack (most cost-efficient)

**Start (~$0–$50/mo):**

1. **Benzinga Basic** — legal free headlines/teasers for in-app display
2. **SEC EDGAR** — keep as filings/events (already integrated)
3. **Gov/Fed feeds** — free macro
4. **FMP news** — only if already paying for fundamentals *and* a **Data Display** license is negotiated (do not assume Starter/Premium covers UI)

**Skip for now:** Bloomberg / Reuters / Dow Jones, NewsAPI at $449, Yahoo scrape, publisher RSS as a product dependency.

**Later upgrade:** Benzinga premium or Intrinio when full-text / real-time wire quality is justified.

---

## Product Workflow (from main roadmap)

When implementation starts, target Phase 2 **News workflows**:

- Symbol-scoped or watchlist-wide News Feed panel (headlines, publish times, detail)
- Actions: annotation from headline; AI sentiment/thesis tied to chart state
- High-impact items as chart event pins via existing overlay mappers

Do not start implementation until this track is activated in `docs/PROJECT-STATUS.md` (WIP=1).

---

## Open Questions Before Build

1. Confirm Benzinga Basic EULA covers Edge’s intended UI (headline + teaser + outbound link).
2. If staying on FMP for news: get written **Data Display and Licensing** quote.
3. Decide whether filings (EDGAR) and editorial news share one panel or stay separate.
4. Latency / freshness bar for v1 (poll REST vs streaming wire).
