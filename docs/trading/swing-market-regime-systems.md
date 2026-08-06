# Swing market-regime systems — research notes

Practitioner systems for **big-picture market context** that sit *above* individual swing entry/exit rules. Scope: **daily-timeframe swing trading** (not day trading). Compiled from multi-source web research (2026-08-02).

**Not investment advice.** Thresholds below are reconstructions from public articles, book summaries, and product docs. Some systems mix published rules with editorial or proprietary judgment.

| Related | Location |
|---------|----------|
| Wolves context (weekly regime language) | [wolves-discord/synthesis.md](./wolves-discord/synthesis.md) |
| EP swing desk notes | [wolves-discord/ep-swing-desk.md](./wolves-discord/ep-swing-desk.md) |
| Day-type visuals (day-trade oriented; out of primary scope) | [day-classification-visual-guide.md](./day-classification-visual-guide.md) |

---

## 1. Purpose

Question answered: *Given solid entry/exit rules on individual trades, what overarching context tells me whether those setups should be taken at all?*

Shared pattern across practitioners:

```text
Layer 1 — Regime / tide     → trade / reduce / stand aside
Layer 2 — Structure / wave  → which setup family is favored
Layer 3 — Your entry/exit   → only fire if L1+L2 allow it
```

Big picture is a **filter**, not a trigger.

---

## 2. Scope filter (what was excluded)

| Excluded | Why |
|----------|-----|
| Jim Dalton / Market Profile day types | Classifies *today’s* auction; primarily day-trade oriented |
| Intraday-only TRIN/TICK usage | Not core for daily swing permission |
| Pure academic HMM/regime papers | Practitioner focus only |

---

## 3. Completeness inventory

| System | Specific data? | Specific rules? | Swing-usable as-is? |
|--------|----------------|-----------------|---------------------|
| Minervini Trend Template | Yes | Yes | Yes |
| O’Neil / IBD Market Direction | Yes | Mostly | Yes (minor product gaps) |
| Elder Triple Screen | Yes (flexible tools) | Yes (method) | Yes |
| Weinstein Stage Analysis | Mostly | Semi + judgment | Yes |
| Clement regime filters | Examples + thresholds | You design/test | Design work required |
| Pring / Murphy cycle | Partial | Semi / proprietary | Weak without paid barometers |
| Van Tharp market types | Measurement method | Framework | Thresholds not fully public |
| Hedgeye Quads / Risk Ranges | Labels + process | Process public; math proprietary | No full DIY without subscription |

**Best free implementable stack:** O’Neil market direction + Weinstein/Minervini Stage 2 + Elder weekly tide. Optional: Clement breadth/VIX early warning.

---

## 4. Systems (detailed)

### 4.1 Mark Minervini — SEPA / Trend Template

**Who:** Professional swing/position trader; US Investing Championship winner; *Trade Like a Stock Market Wizard*.

**Role for you:** Stock (and optionally index) **Stage 2 filter** before any setup counts.

**Eight Trend Template criteria (all must pass):**

1. Price > 50-day MA  
2. Price > 150-day MA  
3. Price > 200-day MA  
4. 50-day MA > 150-day MA  
5. 150-day MA > 200-day MA  
6. 200-day MA trending up ≥ 1 month (preferably longer)  
7. Price within ~25% of 52-week high  
8. Relative strength rating > 70 (ideally 90+)  

Often also: price ≥ 25–30% above 52-week low.

**Big-picture note:** Leaders often enter Stage 2 before the index officially turns. Sparse names passing the template + weak breadth → do not force trades.

**Still book-only:** Full VCP geometry, SEPA entry pinpointing, sell algorithms, sizing nuances.

**Sources:** Chartmill Trend Template guides; book summaries; TradingView “Trend Template” scripts.

---

### 4.2 William O’Neil / IBD — Market Direction Model

**Who:** Founder of Investor’s Business Daily; CAN SLIM practitioner lineage.

**Role for you:** Primary **“may I buy swing longs at all?”** gate via follow-through days, distribution days, and exposure bands.

#### Distribution days

| Item | Rule (public reconstructions) |
|------|-------------------------------|
| Definition | Major index (Nasdaq / S&P) down ≥ **~0.2%** on volume ≥ prior day |
| Meaning | Institutional selling (distribution) |
| Danger cluster | Often **~5–7** distribution days within **~20–25** sessions |
| Drop from count | Index closes **5%** above that day’s close, **or** **25** sessions pass |
| Intensity | Larger % declines + much higher volume weigh more than marginal days |

#### Follow-through day (FTD)

| Item | Rule |
|------|------|
| When | Day **4–7+** of a rally attempt off a correction low (day 1–3 FTDs less reliable) |
| Price | Major index up ~**1.25%+** (some later sources cite 1.5–2%) |
| Volume | Higher than prior day |
| Reset | Undercut of prior low resets the day count |
| Action | Begin **gradually** raising exposure; confirm with leaders breaking out |
| Failure risk | New distribution soon after FTD → treat as possible failed rally |

#### Exposure levels (current IBD Market Pulse model)

Five bands (replacing older green/yellow/red only):

| Band | Guidance |
|------|----------|
| 0–20% | Most cautious; mostly sidelines in correction |
| 20–40% | Cautious; tentative ideas as tape improves (or defense if weakening from highs) |
| 40–60% | Improving tape; more capital at work / or raising cash if weakening |
| 60–80% | Uptrend gaining steam; cut buys / take some profits if weakening |
| 80–100% | Strong confirmed uptrend; still watch for change |

FTD often starts exposure near **20–40%**, then scales with accumulation days, leader quality, and breakout follow-through. IBD states the published exposure is **partly rules-based + editorial judgment**.

**Still product-gated:** Exact “stall day,” “power trend,” and Market School B1/B2 automation details.

**Sources:** [IBD exposure article](https://www.investors.com/how-to-invest/investors-corner/risk-management-in-the-stock-market-how-much-money-to-invest-now/); IBD FTD education; community reconstructions (e.g. Polymath Pursuit, Fool IBD Market School threads); [TraderLion FTD](https://traderlion.com/trading-strategies/follow-through-day/).

---

### 4.3 Alexander Elder — Triple Screen

**Who:** Active trader; *Trading for a Living* / *The New Trading for a Living*.

**Role for you:** Multi-timeframe **permission method**. For daily swing: weekly = tide, daily = wave.

| Screen | Timeframe | Preferred tools | Rule |
|--------|-----------|-----------------|------|
| 1 Tide | Weekly | MACD-Histogram **slope** | Slope up → longs only or aside; slope down → shorts only or aside |
| 2 Wave | Daily | 2-day EMA of **Force Index** (alt: Stochastic, RSI, Elder-ray) | With weekly up: take only buy signals from daily oscillator (e.g. Force Index dips below 0 without multi-week low; Stoch &lt;30) |
| 3 Entry | Daily (or lower) | Trailing buy/sell stop | Long: buy stop 1 tick above prior bar high; trail down daily until filled or weekly reverses |

**Money management (as published):** Tight stops (e.g. below entry-day / prior-day low); targets from higher TF, stops from intermediate TF; “factor of five” between timeframes.

**By design flexible:** Oscillator choice is not mandatory—one method, several valid tools.

**Sources:** Elder book chapters (Triple Screen); [QuantifiedStrategies summary](https://www.quantifiedstrategies.com/alexander-elder-triple-screen-strategy/); swing-oriented writeups.

---

### 4.4 Stan Weinstein — Stage Analysis

**Who:** *Secrets for Profiting in Bull and Bear Markets* (1988); *Professional Tape Reader*.

**Role for you:** Lifecycle map for **indexes, sectors, and stocks**. Long only Stage 2; exit Stage 3; never hold Stage 4.

#### Stages (stock/index)

| Stage | Name | Key tells | Action |
|-------|------|----------|--------|
| 1 | Base | Sideways after decline; 30-week MA flattening; volume dries then wakes on up days | Watch, don’t buy |
| 2 | Advance | Breakout on **2–3×** avg volume; price above **rising** 30-week (and often 200-day); HH/HL; respects rising 50-day | Buy breakout or lighter-volume retest |
| 3 | Top | Slice below 10-week/50-day on heavy volume; churn; failed highs; 30-week/200-day flatten | Reduce / exit |
| 4 | Decline | Break Stage 3 support; LH/LL; below falling long MAs | Out (“take the oath”); shorts only if market bearish |

**Core tool:** 30-week MA (≈150-day). Book summaries also cite trailing stops within ~**15%** of entry.

#### Mansfield Relative Strength

Used heavily in Weinstein charts (Mansfield service):

```text
RS = price / benchmark (e.g. S&P 500)
Mansfield RS = (RS / SMA(RS, 52 weeks) − 1) × 100
→ above 0 = outperforming; below 0 = underperforming
```

#### Market-level indicators (book shortlist)

1. Stage-analyze major averages vs 30-week MA  
2. Advance–Decline line (divergences)  
3. Momentum Index = **200-day MA of daily A/D** — zero-line cross key  
4. Weekly new highs / new lows (divergences)  
5. International market alignment  
6. Dated/secondary: GM “four-month rule,” price/dividend extremes, contrary opinion  

**Process order (book summary):** market direction → best sectors → best stocks → Stage 2 only → trail stops → never buy 3/4, never sell 1/2 blindly.

**Still judgment:** Exact Stage 1→2 completion is pattern recognition, not a pure boolean like Minervini’s template (Minervini largely operationalizes Stage 2).

**Sources:** [TraderLion Stage Analysis](https://traderlion.com/trading-strategies/stage-analysis/); [Thierry / arvy book deep-dive](https://thierryvonarvy.substack.com/p/stan-weinsteins-secrets-for-profiting); [StageAnalysis.net Mansfield RS](https://www.stageanalysis.net/blog/489325/how-to-setup-the-mansfield-relative-strength-indicator-in-tradingview); [7 Circles book notes](https://the7circles.uk/stan-weinsteins-stage-system-4-long-term-indicators/).

---

### 4.5 Alan Clement — Regime filter toolkit

**Who:** Full-time independent trader / quantitative systems designer (CFTe).

**Role for you:** Practical **how to build** price + breadth + intermarket filters (not one named product system).

**States to detect:** bullish/bearish · volatile/calm · trending/non-trending (often correlated).

**Recommended build sequence:**

1. Price vs long MA (one lookback parameter; test widely)  
2. Long-period oscillators across centerline (e.g. RSI 100–200 &gt;50; MACD &gt;0)  
3. Breadth early warning: **% of stocks above 200 DMA** — **&gt;70%** very bullish, **&lt;30%** risky; also Bullish % Index, A/D, 52w high–low  
4. Intermarket context:  
   - **VIX:** &lt;low-20s low risk; low-20s–~40 elevated; &gt;40 high risk  
   - **Yield curve** (e.g. 10y–2y): flattening can lead tops by 18–24 months — context, not trigger  
   - **VIX term structure:** contango normal; flip from backwardation→contango often marks lows; VIX/VXV ratio usable  

**Rules of use:** Filter is not the edge—keeps you on the right side. Put filters in during in-sample testing (don’t add after OOS failure). Prefer ≥10 years data. Breadth = early warning, pair with a trend tool for timing.

**Sources:** [Better System Trader ep. 63 notes](https://bettersystemtrader.com/063-market-regimes-with-alan-clement/).

---

### 4.6 Martin Pring (+ John Murphy framing) — Business cycle / intermarket

**Who:** Pring — cycle technician / practitioner literature; Murphy — intermarket TA (*Intermarket Analysis*).

**Role for you:** Multi-asset **backdrop** (risk-on vs risk-off), not daily entry timing.

**Six stages (Pring Turner public description):** Determined by bull/bear status of bonds, stocks, and commodities in sequence. Example: Stage I = bonds bullish, stocks & commodities bearish; Stage II = bonds + stocks bullish, commodities still bearish; … through Stage VI inversions. Allocation tilts favor the asset class that should lead in that stage.

**Public indicator:** Pring’s **Special K** (full weighted ROC/SMA formula published on StockCharts ChartSchool). Related: **KST**.

**Still proprietary:** Full Pring Turner “barometers” that flip each asset class for stage calls. Murphy’s relationships (bonds↔stocks↔commodities↔dollar) are well documented as principles, not a single rule sheet.

**Sources:** [Pring Turner approach PDF](https://www.pringturner.com/wp-content/uploads/2016/01/Pring-Turner-Approach-to-Business-Cycle-Investing.pdf); [StockCharts Special K](https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/prings-special-k).

---

### 4.7 Van Tharp — Market Types

**Who:** Trading coach / process designer; position sizing and belief systems; worked with many live traders.

**Role for you:** Name the environment, then **match or stand down** your swing system.

**Six classic types:** bull / bear / sideways × quiet / volatile.

**Measurement evolution (public):**

1. **Simple:** Look at ~6-month chart — direction + chop vs smooth.  
2. **More objective:**  
   - Direction: **Market SQN** on ~**100 days** of daily % changes (e.g. SPY) → strong bull / bull / neutral / bear / strong bear  
   - Volatility: **ATR%** of last **~20 days** vs long-history mean/SD → very volatile / volatile / normal / quiet  

**Rule of use:** Easy to design a system for one type; foolish to expect one system to work in all types. When type changes, stop or switch playbooks.

**Still not fully public:** Exact SQN / ATR bucket cutoffs used in VTI monthly updates.

**Sources:** [Van Tharp Institute — market type](https://vantharpinstitute.com/why-market-type-is-so-critical-by-van-k-tharp-ph-d/); Better System Trader ep. 24 notes.

---

### 4.8 Keith McCullough / Hedgeye — Quads + Risk Ranges

**Who:** Ex–hedge fund PM; Hedgeye process shop.

**Role for you:** Macro regime (what *should* work) + multi-duration risk framing. Heavier / more opinionated than pure price systems.

**GIP / Quads (public labels):** Year-over-year **rate of change** of growth (GDP) and inflation (CPI):

| Quad | Growth ROC | Inflation ROC | Rough implication |
|------|------------|---------------|-------------------|
| 1 | ↑ | ↓ | Most equity-friendly |
| 2 | ↑ | ↑ | Mixed; often commodities / inflation beneficiaries |
| 3 | ↓ | ↑ | Stagflation pressure |
| 4 | ↓ | ↓ | Risk-off; historically hard for risk assets |

**Durations:** TRADE ≤3 weeks · TREND ≥3 months · TAIL ≤3 years.

**Risk Range Signals (process public, math proprietary):** Daily LRR (buy zone) / TRR (sell zone) from price/volume/volatility model; TREND bullish/bearish/neutral. Ideal long: TREND bullish + price near LRR. #OutBucket = not actionable.

**Still proprietary:** Exact GIP series/windows and Risk Range PVV formulas — subscription.

**Sources:** [Hedgeye Risk Range user guide](https://app.hedgeye.com/user-guides/risk-range); Hedgeye education / Quad explainers.

---

## 5. Recommended swing permission stack

For a daily swing trader with existing entry/exit rules:

| Priority | System | Job |
|----------|--------|-----|
| 1 | O’Neil / IBD Market Direction | May I add swing risk at all? (FTD / distribution / exposure band) |
| 2 | Weinstein + Minervini Stage 2 | Is the tape / are leaders in a Stage 2 structure? |
| 3 | Elder weekly tide | Are daily long (or short) signals aligned with the weekly? |
| Optional | Clement breadth + VIX zones | Early warning; not a standalone trigger |
| Optional | Pring / Hedgeye | Macro backdrop if you want multi-asset context |

**Do not use as primary permission for daily swings:** Dalton day types; Hedgeye Risk Ranges alone without subscription math; Van Tharp without defining your own SQN/ATR thresholds.

---

## 6. Relationship to Edge / Wolves notes

Wolves **Banks** daily desk already uses a practitioner-style weekly regime language (range / ATH fail / event calendar → press or stand down) then BBR levels — see [wolves-discord/synthesis.md](./wolves-discord/synthesis.md). That is closest in *spirit* to Layer 1 here, but is day-desk oriented.

For **swing**, the systems in this doc are the clearer published rule sets. EP swing desk notes in Wolves (chop vs trend, “go fishing”) align with Tharp/Weinstein-style stand-down logic more than with intraday BBR.

---

## 7. Refresh log

- **2026-08-02** — Initial research: practitioner survey → swing filter → multi-source gap fill (IBD exposure tiers, Elder preferred stack, Weinstein Mansfield RS + market indicators, Clement thresholds, Pring Special K, Tharp SQN/ATR method, Hedgeye Risk Range process). Day-trade-only systems removed from primary set.
