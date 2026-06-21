# TradingView Supercharts — Feature Reference

Reference inventory of TradingView charting and platform capabilities, compiled from official TradingView documentation (June 2025 research). Use this when scoping Edge Chart work, comparing parity, or deciding what to defer.

**This is not a parity checklist.** TradingView is a full platform (charts + alerts + screeners + social + brokers + Pine Script). Edge Chart targets a subset focused on custom canvas charting with Yahoo OHLCV.

For Edge's current implementation status, see [features.md](./features.md).

---

## Sources

| Source | URL | What it covers |
|--------|-----|----------------|
| Features overview | [tradingview.com/features](https://www.tradingview.com/features/) | Chart types, indicators, drawings, replay, alerts, Pine, platform |
| Drawing tools (support) | [Drawing tools available on TradingView](https://www.tradingview.com/support/solutions/43000703396-drawing-tools-available-on-tradingview/) | Full drawing toolbar taxonomy, magnets, sync, hide/lock |
| Fibonacci drawing alerts (blog) | [Alerts on Fibonacci drawings](https://www.tradingview.com/blog/en/alerts-on-fibonacci-drawings-58692/) | Alert conditions on drawing levels |

Re-verify against official docs before treating counts (400+ indicators, 110+ tools) as exact.

---

## 1. Chart types

TradingView lists **20+ chart styles** on the features page. Documented types include:

| Category | Chart types |
|----------|-------------|
| **Candle / bar** | Candles, Hollow candles, Bars, Volume candles, High-low |
| **Smoothed / noise-reduced** | Heikin Ashi |
| **Non-time / range** | Renko, Range, Line break, Point & figure, Kagi |
| **Line / area** | Area, HLC area, Baseline, Line, Step line, Line with markers |
| **Other** | Columns |

### Advanced volume / profile chart modes

Separate from standard chart types; overlay or dedicated analysis modes:

- **Volume footprint** — volume distribution at price levels per candle
- **Time price opportunity (TPO)** — price concentration as session progresses
- **Session volume profile** — volume within session/sub-session segments

---

## 2. Layout, multi-chart & navigation

| Feature | Description |
|---------|-------------|
| **Multi-chart layouts** | Up to **16 charts per screen** (plan-dependent) |
| **Synchronized layouts** | Sync **symbols**, **timeframes**, and **drawings** across charts in a layout |
| **Command search** | Global search to run actions quickly |
| **Spreads** | Custom formulas combining symbols with math operations |
| **Custom intervals** | Arbitrary intervals, including **seconds** and **range bars** |
| **Layouts persistence** | Saved layouts sync across web, desktop, and mobile |
| **Watchlists** | Linked to charting workflow |
| **Hide options** | Temporarily hide drawings, indicators, positions/orders, or all |

Plan limits (approximate, from public pricing/marketing):

| Tier | Charts/tab | Indicators/chart | Saved layouts | Alerts |
|------|------------|------------------|---------------|--------|
| Free | 1 | 3 | 1 | Basic |
| Essential | 2 | 5 | 10 | 10 |
| Plus | 4 | 10 | Unlimited | 30 |
| Premium | 8 | 25 | Unlimited | 400 |
| Ultimate | 16 | — | Unlimited | — |

---

## 3. Viewport, pan, zoom & scale

| Feature | Description |
|---------|-------------|
| **Pan / scroll** | Drag chart horizontally; scroll wheel support |
| **Zoom** | Wheel/pinch zoom; zoom tool to magnify a region |
| **Auto-scaled axes** | Price and time axes from visible range |
| **Manual scale** | Drag price/time axes to adjust scale |
| **Reset scale** | Return to auto-fit |
| **Log / percent / indexed to 100** | Scale modes (chart settings) |
| **Extended hours** | Show pre/post market (data tier dependent) |
| **Bar spacing** | Adjust candle width / gap |
| **Go to date** | Jump viewport to a specific date |
| **Undo / redo** | Ctrl/Cmd+Z for drawing and chart actions |

---

## 4. Crosshair & readout

| Feature | Description |
|---------|-------------|
| **Unified crosshair** | Vertical line across all panes in a chart |
| **Per-pane horizontal line** | Active pane shows price at cursor |
| **OHLCV legend** | Top-left (or configured) bar values at crosshair |
| **Time label** | Timestamp on time axis |
| **Indicator values at cursor** | Readout for overlays and oscillators |
| **Multi-chart crosshair sync** | Crosshair position synced across layout charts |
| **Cursor modes** | Cross, dot, arrow (drawing toolbar cursors section) |

---

## 5. Indicators & technical analysis

### Scale

- **400+ built-in indicators and strategies**
- **100,000+ public/community indicators** (Pine Script library)
- Indicators visualized as **overlays** (on price) or **oscillators** (separate pane)

### Built-in analysis features (platform-level)

| Feature | Description |
|---------|-------------|
| **Volume profile indicators** | Fixed range, session, anchored variants |
| **Candlestick pattern recognition** | Automated pattern detection |
| **Multi-timeframe analysis** | Compare timeframes on one chart |
| **Auto chart patterns** | Automated chart pattern detection |
| **Fundamental graphs** | Overlay/compare 100+ fundamental metrics on chart |
| **Seasonals** | Year-over-year seasonal price patterns |

### Indicator workflow

- Add/remove from indicator dialog
- **Parameter settings** per indicator
- **Style** customization (colors, line width)
- **Visibility** toggle
- Alerts on indicator conditions
- Drawings can overlay **indicator panes** (e.g. trendline on RSI)

---

## 6. Drawing tools

TradingView documents **110+ smart drawing tools**, grouped in the left toolbar.

### 6.1 Cursors (not drawings, but toolbar section)

| Tool | Purpose |
|------|---------|
| Cross | Default crosshair cursor |
| Dot | Alternative crosshair |
| Arrow | Classic pointer |
| Demonstration | Presentation / video mode |
| Magic | Visual flair for streams |
| Eraser | Remove drawings |

### 6.2 Trend line tools

**Lines**

- Trendline
- Ray
- Info line
- Extended line
- Trend angle
- Horizontal line
- Horizontal ray
- Vertical line
- Cross line

**Channels**

- Parallel channel
- Regression trend
- Flat top/bottom
- Disjoint channel

**Pitchforks**

- Classic pitchfork
- Inside pitchfork
- Schiff pitchfork
- Modified Schiff pitchfork

### 6.3 Fibonacci and Gann tools

**Fibonacci family** (multiple variants; retracement, extension, fan, arc, time zone, etc.)

- Used for support/resistance and projection levels
- **Alerts on Fibonacci drawings** — alert on specific levels (0.5, 0.618, …) or channel enter/exit; levels move with drawing

**Gann tools**

- Gann fan, Gann box, Gann square — angle/time/price geometry (William D. Gann theory)

### 6.4 Patterns

Drawing templates for chart patterns, e.g.:

- XABCD, cypher, head & shoulders, ABCD, triangle, three drives, etc.

**Cycle tools**

- Cyclic lines
- Time cycles
- Sine line

### 6.5 Forecasting and measurement tools

**Forecasting**

- Long/short position tools
- Forecast (price projection)
- Bars pattern
- Ghost feed
- Projection

**Volume-based drawings**

- Anchored VWAP
- Fixed range volume profile
- Anchored volume profile

**Measurers**

- Price range
- Date range
- Date and price range

### 6.6 Geometric shapes

- Rectangle, Rotated rectangle
- Path, Circle, Ellipse
- Polyline, Triangle, Arc, Curve, Double curve

**Markup**

- Brush, Highlighter
- Arrow, Arrow marker
- Arrow marks (up/down)

### 6.7 Annotation tools

- Text, Note, Price note, Pin
- Table, Callout, Comment
- Price label, Signpost, Flagmark

**Content / social**

- Image
- X posts and ideas

### 6.8 Icons

- Emojis, stickers, icons (bottom of drawing menu)

### 6.9 Standalone toolbar utilities

| Tool | Purpose |
|------|---------|
| **Measure** | Distance between bars; price change over range |
| **Zoom in** | Magnify a chart region |

### 6.10 Drawing workflow features

| Feature | Description |
|---------|-------------|
| **Magnets** | Snap drawings to OHLC (strong = exact OHLC; weak = nearby); **Snap to indicators** for overlay indicator values |
| **Keep drawing** | Stay in active tool after placing (vs return to cursor) |
| **Lock all drawings** | Prevent accidental moves; per-drawing lock also available |
| **Hide options** | Hide drawings, indicators, positions, or all |
| **Sync drawing options** | Propagate drawings to other layouts |
| **Remove options** | Delete drawings, indicators, or both |
| **Undo** | Ctrl/Cmd+Z |
| **Customization** | Colors, line style, visibility, extend, labels |
| **Selection & edit** | Click to select; drag control points; context menu |
| **Alerts on drawings** | Price alerts tied to drawing geometry (incl. Fib levels) |
| **Drawings on indicators** | Apply to any pane, not just price |

### Drawings vs indicators (TradingView distinction)

| | Drawings | Indicators |
|---|----------|------------|
| Placement | Any pane, flexible | Overlay on price or oscillator pane |
| Calculation | Mostly visual; some level math | Computed from price/volume data |
| Updates | Static until edited | Recalculates each bar |
| Signals | No trading signals | Some provide signals |
| Alerts | On geometry/levels | On indicator conditions |

---

## 7. Bar Replay

| Feature | Description |
|---------|-------------|
| **Historical rewind** | Step through past bars as if live |
| **Real and simulated trading** | Trade against replay data |
| **9 replay speeds** | Variable playback rate |
| **Autoplay and step-by-step** | Continuous or single-bar advance |
| **Drawings & indicators during replay** | Full analysis while replaying |
| **Synchronized multi-chart replay** | All charts in layout replay together |
| **Deep history** | Minute and second resolution (plan/data dependent) |
| **Selectable update intervals** | Control replay bar cadence |

---

## 8. Data & symbol features

| Feature | Description |
|---------|-------------|
| **Symbol search** | Global symbol lookup |
| **Multiple asset classes** | Stocks, crypto, forex, futures, bonds, etc. |
| **Real-time vs delayed** | Tier-dependent (free often 10–15 min delay) |
| **Extended hours** | Pre/post market sessions |
| **Custom timeframes** | Including seconds (premium tiers) |
| **Range bars / tick charts** | Non-standard bar construction |
| **Spreads / formulas** | `SYMBOL1/SYMBOL2` style expressions |
| **Deep historical bars** | More history on higher tiers (e.g. 4× on Ultimate) |
| **Institutional data partners** | Exchange-grade feeds |

---

## 9. Alerts (chart-adjacent)

| Feature | Description |
|---------|-------------|
| **Price alerts** | 13 built-in conditions (crossing, greater than, etc.) |
| **Drawing alerts** | Trigger on drawing levels or channels |
| **Indicator alerts** | On indicator conditions |
| **Pine Script alerts** | Custom logic |
| **Multi-condition alerts** | Combine up to 5 settings (price, drawings, indicators, chart values, custom) |
| **Watchlist alerts** | One alert covering many symbols |
| **Delivery** | Browser, email, mobile push, webhooks |
| **Cloud execution** | Server-side; works when user offline |

---

## 10. Pine Script & extensibility

| Feature | Description |
|---------|-------------|
| **Pine Script language** | Domain-specific language for indicators/strategies |
| **Pine Editor** | Cloud IDE with autocomplete, version control, profiler, logs |
| **Community library** | Publish and share scripts |
| **Strategy tester** | Backtest on chart; P&L, metrics, order visualization |
| **Deep backtesting** | Extended historical strategy test |
| **Pine Screener** | Scan markets using Pine logic |
| **Chart display from Pine** | Plots, fills, tables, labels on chart |
| **Recent additions (2025–2026)** | e.g. `request.footprint` for volume footprint data; dotted/dashed plots; bid/ask on tick charts |

### Advanced Charts / Lightweight Charts (developer products)

TradingView also offers **embeddable chart libraries** for third-party sites (separate from consumer Supercharts). Edge Chart is a custom engine, not these libraries.

---

## 11. Trading on chart (platform, not core chart engine)

| Feature | Description |
|---------|-------------|
| **Broker integration** | 100+ brokers; trade from chart |
| **Order on chart** | Create/modify orders by dragging |
| **Bracket orders** | TP/SL management |
| **Paper Trading** | Simulated account |
| **The Leap** | Community trading competitions |

---

## 12. Screeners, fundamentals & macro (platform)

Not chart-engine features, but adjacent in TradingView UX:

- **Screeners** — Stocks, ETFs, bonds, crypto, CEX/DEX pairs; 400+ filter fields
- **Heatmaps** — Sector/asset heatmaps
- **Fundamental graphs** — 100+ metrics on chart
- **Economic calendar** — Events, earnings, dividends on chart timeline
- **Macroeconomics** — 400+ metrics, 80+ countries
- **Yield curves** — Multi-country bond yield comparison
- **Options** — Strategy builder, chain, volatility curves

---

## 13. Sync, devices & community

| Feature | Description |
|---------|-------------|
| **Cross-device sync** | Layouts, watchlists, settings on web, desktop, mobile |
| **Desktop app** | Native desktop client |
| **Mobile apps** | iOS/Android with drawing tools and indicators |
| **Community** | Ideas, scripts, social feed |
| **News** | Real-time news on chart (Reuters, etc.) |

---

## 14. Edge Chart mapping (quick index)

Use [features.md](./features.md) for live status. High-level overlap:

| TradingView area | Edge equivalent | Parity level |
|------------------|-----------------|--------------|
| 5 basic chart types | candle_solid, candle_stroke, ohlc, area, heikin_ashi | Partial (5 of 20+) |
| Pan/zoom/crosshair | Viewport + CrosshairOverlay + legend | Strong |
| Multi-chart + sync | Grid 1×1–2×2; link symbols + crosshair sync when linked; active cell focus | **Strong** (within 4-cell cap; no drawing sync or granular toggles) |
| 400+ indicators | 28 picker / 4 plugins | Minimal |
| 110+ drawings | 12 toolbar / 3 stub plugins | Minimal |
| Bar replay | BarReplay panel + slice | Partial (UI works; candle total not wired) |
| Magnets, keep drawing, sync drawings | Toolbar stubs; magnet logs only | Minimal |
| Pine Script | Plugin API only | None |
| Alerts | — | None |
| Volume profile / footprint | Out of V1 scope | None |
| Renko / range / P&F | Out of V1 scope | None |

---

## Related docs

- [Edge Chart feature inventory](./features.md) — what Edge implements today; **§14 recommended next work**
- [V1 scope lock](./prereqs/v1-scope.md) — Edge must-ship list
- [Gesture bible](./prereqs/gesture-bible.md) — Edge interaction target spec

When TradingView ships major chart features, add a dated note under the relevant section rather than duplicating marketing copy.
