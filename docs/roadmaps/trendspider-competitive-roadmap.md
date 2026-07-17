# TrendSpider Competitive Roadmap

Research and prioritization track: review TrendSpider’s feature set and decide which capabilities Edge should adopt (and which to explicitly skip).

**Last updated:** 2026-07-16  
**Status:** Research inventory started; prioritization not yet done

## Product Goal

Use TrendSpider as a competitive reference (not a clone target) to pick high-leverage product gaps for Edge — especially where they reinforce Edge’s direction: custom chart engine, broker-backed data, AI-native analysis, and private workspace workflows.

## Research Baseline (started 2026-07-15)

| Artifact | Location |
|----------|----------|
| Feature inventory canvas | Cursor canvas `trendspider-feature-set.canvas.tsx` |
| Live UI screenshots | [../research/trendspider-screenshots/](../research/trendspider-screenshots/) |
| Public sources | [trendspider.com/product](https://trendspider.com/product/), [help.trendspider.com](https://help.trendspider.com/), pricing / developers / market data pages |

Live exploration covered: Default Workspace chart chrome, automated Trends, Raindrop chart type, Market Scanner, Strategy Tester, AI Strategy Lab, Sidekick, Custom Indicator Editor, Seasonality widget, Stock Market Map, right-rail research modules.

## Phases

### Phase 0 — Inventory (in progress)

- [x] Log into live product and map UI architecture (top chrome, bottom workbench, right rail)
- [x] Capture screenshots of major feature areas
- [x] Compile public-docs + live feature matrix
- [ ] Normalize inventory into Edge-oriented categories (charting, automation, AI, data, trading)

### Phase 1 — Prioritize for Edge

For each TrendSpider capability, mark:

| Decision | Meaning |
|----------|---------|
| **Adopt** | Want in Edge near/medium term |
| **Adapt** | Want the outcome, but Edge-shaped (different UX/architecture) |
| **Defer** | Interesting later; not near-term |
| **Skip** | Out of product direction |

Suggested first-pass clusters to score:

1. Automated TA (trendlines, Fibs, patterns, heatmaps, MTFA)
2. Scanner / Smart Watchlists (incl. NL conditions)
3. Strategy Tester + bots / alerts / webhooks
4. AI (Sidekick-style copilot vs Strategy Lab ML)
5. Scripting surface (custom indicators reuse across chart/scan/alert)
6. Raindrops / volume-profile-in-bar chart types
7. Seasonality and research widgets (news, insiders, options flow)
8. Multi-symbol / dashboard workspaces

### Phase 2 — Slice into Edge tracks

Promoted **Adopt/Adapt** items become concrete work on existing roadmaps (or new tracks), with:

- Target Edge surface (`chart-core`, screener, AI tools, journal, etc.)
- Constraints check against [CONSTRAINTS.md](../CONSTRAINTS.md)
- Verification tier before Active Work

Do not start implementation from this doc alone — promote into [PROJECT-STATUS.md](../PROJECT-STATUS.md) Active Work when ready.

## Explicit Non-Goals

- Full TrendSpider feature parity
- Replacing Edge’s custom canvas engine with TrendSpider
- Pine/JS marketplace cloning as a near-term goal
- Building ML Strategy Lab before in-app copilot / semantic annotations foundations are solid

## Open Questions (for user prioritization)

1. Which TrendSpider differentiators matter most for *your* daily workflow?
2. Prefer deepening chart/AI first, or scanner/automation first?
3. Any hard skips beyond the non-goals above (e.g. bots, options flow, Raindrops)?

## Related Docs

- [Main Roadmap](../ROADMAP.md)
- [Feature Roadmaps index](./README.md)
- [TradingView reference](../chart/tradingview-reference.md) — existing competitive chart inventory
- [Screener Roadmap](./screener-roadmap.md)
- [Rich Annotations Vision](../chart/rich-annotations-vision.md)
