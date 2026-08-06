# BBR Strategy Playbook (Bounce · Break · Reject)

Research reconstruction of **Justin “Mr. Banks” Banks** / **Wolves of Wealth** day-trading framework, plus estimated trading statistics derived from public Discord alerts and X posts (as of **2026-07-23**).

**Not investment advice.** Stats are **bias-adjusted guesstimates**, not audited P&L. Account size, contract counts, and full loss journal are not publicly disclosed.

| Related artifact | Location |
|------------------|----------|
| Visual schematics (Canvas) | Cursor canvas `bbr-system-visual-guide.canvas.tsx` |
| Source transcripts | `yt/transcript/bbr-system/yt/transcript/` (~19 videos) |
| Discord mine archive | [wolves-discord/](./wolves-discord/) (context, desk ops, EP, bots) |
| Community | Discord `WolvesOfWealth` · Whop [wolves-of-wealth](https://whop.com/wolves-of-wealth/) |
| X | [@RealJGBanks](https://x.com/RealJGBanks) |
| Edge day-type research (separate) | [day-classification-visual-guide.md](./day-classification-visual-guide.md) |

---

## 1. One-line system

**Map levels → wait for Bounce / Reject / Break-and-Hold → enter light options on confirmation → bank ~20% → trail runners on the 8 EMA → cut at invalidation — only when a trend is present.**

---

## 2. Core framework: BBR

At every key level, price can only do three things:

| Action | Meaning | Trade |
|--------|---------|-------|
| **Bounce** | Holds support / demand | Calls / longs |
| **Reject** | Fails resistance / supply | Puts / shorts |
| **Break & Hold (B/H)** | Closes and holds beyond the level | Trade break direction |

Daily GAMEPLAN language (premium Discord):

```text
$SPY 739-740 bounce for calls // b/h for puts
$QQQ 694 bounce for calls // b/h for puts
$META B/H 668 for calls // Reject for puts
$TSLA 368 bounce zone
```

---

## 3. Instruments & focus

| Item | Spec |
|------|------|
| Primary | **Stock options** (calls / puts) |
| Also | Commons (esp. EP swing desk) |
| Indices | `SPY`, `QQQ`, `IWM` |
| Equities | Mag7 + familiar names (NVDA, AMD, TSLA, META, etc.) |
| Futures | `ES_F` / `NQ_F` for **levels / context**, not main instrument |
| Style | Near-dated options for day trades; longer dated for swings (“Always Buy Time”) |
| Callout format | `TICKER EXP STRIKE calls/puts PRICE` + cut level (e.g. `NVDA 07/22 207.50 calls 1.22`) |

Prefer **trending** names. Skip chop / inside / range days.

---

## 4. Chart setup

### Day-trade EMAs

| EMA | Role |
|-----|------|
| **8** (or 9) | Primary trend / trail for runners |
| **13** | Safety net / secondary trend |
| **48** | Last defense (Yahoo “13/48 cross”) |
| **200** | Major pivot / magnet — above = bullish bias, below = bearish |

Use **EMAs** (not SMAs) for day trading. Always watch **volume**.

### Higher timeframes

- Weekly / Daily **8** and **21** heavily used on Mag7 / index watchlists
- Optional: 21, 50 on HTF for confirmation

### Timeframes

| Purpose | TF |
|---------|-----|
| Bias / levels | Weekly → Daily → 4H → 1H |
| Entry | **5m** (sometimes 2m) |
| Trail runners | 5m / 10m / 15m vs 8 EMA |

**Bunched EMAs = stand down.** Diverging EMAs = trend forming → trade.

---

## 5. Levels to map (every day)

**Intraday must-haves**

1. Premarket high / low (PMH / PML)
2. Prior day high / low (PDH / PDL)

**Higher-TF**

- Prior breakout → retest → S/R flips
- Demand / supply zones
- Imbalances / FVGs (fill targets after a break)
- Multi-touch S/R (more tests → weaker defense → break more likely)
- Trendlines / rounded bases for larger A+ setups

### Level taxonomy (plan language)

| Term | Meaning |
|------|---------|
| Bounce / hold zone | Demand / support |
| B/H level | Breakout trigger |
| Reject zone | Supply |
| Line | Last defense before flush |
| Room into… | Next targets after break/fail |
| Reclaim | Must get back above X before longs |
| High risk | Optional — smaller size only |

Example ladder:

> Watching 212–208 to hold. IF 208 fails → flush 201–199. 199 fails → 195 line → 191–190…

---

## 6. Confluence checklist (A+)

More stacked confluence → closer to A+. Still can lose.

### Bullish

- Above 200 EMA
- 13 crosses **above** 48 (ideally 8/13 above 200)
- Break & hold **above** PMH and/or PDH
- Holding HTF demand / S/R flip
- EMAs **diverging** (spreading)
- Rising buy volume / momentum candle
- Optional: news catalyst

### Bearish (mirror)

- Below 200 EMA
- 13/48 cross **down** (and below 200)
- Break & hold **below** PML and/or PDL
- HTF supply / failed support
- Diverging EMAs down + sell volume

### Do not trade when

- EMAs bunched / jumbled (range day)
- Inside day / no trend (“do less”)
- Gambling earnings
- Full size in first-hour chaos

**Beginner bias rule:** If the day is clearly one-sided (4–5 confluences same way), **only trade that side** until experienced.

---

## 7. How to execute

### Daily desk workflow

1. **Sunday / midweek** — Mag7 + index UPSIDE / DOWNSIDE ladders
2. Check earnings / econ times (don’t trade the news; manage around it)
3. Map PMH, PML, PDH, PDL + HTF S/R / demand / supply
4. **~45 min before open** — Morning Watch + GAMEPLAN (`bounce // b/h // reject`)
5. Wait for **reaction** at the level — do not predict
6. Enter options on confirmation (prefer break → hold → retest on 5m)
7. Bank ~20%, trail runners, cut at invalidation
8. Flat when EMAs bunch or trend breaks

Mindset: *If opportunity is yelling in my face I might take it* — not *I have to trade*. Bias-free; trade the chart.

### Entry rules

**A. Bounce (long)**

1. Price into mapped bounce zone
2. Hold / reclaim / rejection evidence (wick, engulfing, volume shift)
3. Calls

**B. Reject (short)**

1. Price into reject zone
2. Fail to hold / lower high / weakness
3. Puts

**C. Break & Hold (preferred beginner path)**

1. Price breaks key level with momentum / volume
2. Prefer **full-body candle close** beyond the level
3. Ideal: **retest / backtest** that holds
4. Enter with break (calls above, puts below)
5. Advanced: first open beyond level if confluence + volume are strong; beginners wait for close + retest

High-risk labels (`high risk longs over X`) → size down or skip if new.

### Exit / trade management

| Rule | Spec |
|------|------|
| First profit target | **~20%** (“20% pays the rent”; sometimes 10%; don’t go below ~5%) |
| Scale | Sell **majority** at first target (teaching: **7–8 of 10** contracts) |
| Runners | Leave small size for 50–100%+ |
| Trail | Hold runners while 8 EMA / trend holds; exit on **full-body close through 8 EMA** against you |
| Stop / cut | Price invalidation of entry / broken level (failed break = out) |
| After scale | Runners can stop near **breakeven** |
| Green → red | **Don’t let a green trade go fully red** — bank majority first |

Live trim language: `trim 40%` → `runners` → `stops in place` → `ABSIS` (all stops in place / green).

### Risk & sizing (taught)

| Rule | Detail |
|------|--------|
| Risk unit | Size so you can **lose 100% of the premium** |
| New traders | **1–2 contracts** for first **50–100 trades** |
| Teaching example | **10 contracts** → sell 7–8 at ~20%, leave runners |
| First trade of day | **Lightest** (warmup) |
| First hour | Extremely light / high-risk for small accounts |
| Mon / Fri | Light size |
| Tue–Thu | “Golden zone” — press if A+ |
| Missed trades | **No revenge oversizing** |
| Frequency | One quality trade > many trades |
| Earnings | Do not gamble |

**Not published as a hard formula:** exact “risk 1% of account” rule. Process = premium-risk + contract count + day-of-week sizing.

### Day-of-week bias

| Day / window | Size bias | Why |
|--------------|-----------|-----|
| Mon | Light | Warmup after weekend |
| Tue–Thu | Press if A+ | Golden zone |
| Fri | Light / profits only | Mental fatigue |
| First hour | Very light | No full trend yet |
| Inside / range | Do less / skip | EMAs bunched |

---

## 8. Discord tracks (context)

| Track | Lead | Focus |
|-------|------|--------|
| Banks / day desk | Banks, Paul, Christian, NoRisk | BBR day trades on Mag7 / indices |
| EP swing desk | EP | Relative-strength breakouts, longer options / commons; avoid 0DTE |

Official new-member path (from announcements): `masterclass` (Market Structure Basics → Break and Retest) → `trade-recaps` 1–17 → `callout-guide` / risk class in `read-first`.

---

## 9. Estimated trading statistics

Derived from Wolves Discord (`#indices`, `#high-risk`, `#daytrades`) and [@RealJGBanks](https://x.com/RealJGBanks) posts, roughly **Jul 2026** sample (plus older YT dollar recaps). **Heavy selection bias** — wins are content; losses are mostly silent.

### 9.1 Trade frequency (Banks public alerts)

| Horizon | Alerted (public) | Likely total (incl. private) |
|---------|------------------|------------------------------|
| Per trading day | **1–2** typical; **0** light/chop; **~3** busy | **0–4** |
| Per week | **~5–8** | **~8–12** |
| Per month (~21 sessions) | **~20–30** | **~30–45** |

Sample pattern (Jul 10–23): several skip days; busy days like Jul 15 (3) and Jul 23 (3 summarized as 53% / 48% / 30%). His mantra: **one trade at a time / do less**.

Confidence: **medium** on alerted rate; **low–medium** on private total.

### 9.2 Win rate, expectancy, profit factor

| Metric | Raw posted sample | Bias-adjusted central guess | Plausible range |
|--------|-------------------|-----------------------------|-----------------|
| Win rate | ~85–92% (≈12W / 1L in short window) | **~60%** | 55–70% |
| Avg win (realized % of premium) | Peak claims median ~50%; mean inflated by 100–400% runners | **~55%** | 40–70% |
| Avg loss (% of premium) | Almost never posted | **~35%** | 25–50% |
| Expectancy / trade | Not honest from raw sample | **~+15–20%** of premium | +5% to +30% |
| Profit factor | — | **~2.0–2.5** | ~1.3–3.0 |
| R:R | — | **~1.5 : 1** | ~1.2–2.0 |

Illustrative central EV:

\[
EV \approx 0.60 \times 55\% - 0.40 \times 35\% \approx +19\% \text{ of premium risked per trade}
\]

**Why raw WR is wrong:** peak % ≠ filled P&L; trims + BE stops; silent scratches; X $ screenshots are mostly **members**, not his book.

### 9.3 Dollar / size claims (his vs members)

| Claim type | Examples | Use |
|------------|----------|-----|
| Personal (X, unverified) | “$10k days consistently”; “6 figures monthly”; “$10,000 per trade is normal”; “$12k before noon”; “+$375k in 5 weeks”; “$1M in 2 months / last AI cycle” | Marketing / upper bound only |
| Older YT recaps | ~$3k NVDA; ~$4k SPY; ~$5.4k SPY/SPX | Showcase winners |
| Member testimonials | +$2.9k / +$5.5k / +$6.4k / +$11k; “$100k week”; $500→$50k | **Not his P&L** |
| Live Discord | Mostly **%** + fill prices (QQQ ~$0.60–$1.20); rare contract counts | Process evidence |

### 9.4 Unit economics (options)

```text
profit ≈ contracts × premium × 100 × %gain
debit  ≈ contracts × premium × 100
```

At **~20%** first scale: **$10k profit ⇒ ~$50k debit** on that trade.

| Account / size scenario | Debit band | $ at 20% | Notes |
|-------------------------|------------|----------|-------|
| Beginner 1–2 cts @ $0.60–$2 | ~$60–$400 | ~$12–$80 | Teaching floor |
| Teaching 10 cts @ $0.60–$3 | ~$600–$3,000 | ~$120–$600 | Common pedagogy |
| Medium 10 cts @ $2–$5, 50–100%+ | — | ~$1k–$5k | Fits old YT $3–5k |
| His “$10k/trade normal” (claimed) | Large size or huge % | ~$10k | Implies ~50–250+ contracts depending on premium/% |

**$10k days** (if true) imply large sizing on good days — not the 1–2 contract beginner size.

### 9.5 $40k account translation (same unit economics)

Sane risk ≈ **5–15%** of account per idea → **~$2k–$6k** debit.

| Size | Debit | At 20% | At 50% | At 100% |
|------|-------|--------|--------|---------|
| ~5% | ~$2,000 | ~$400 | ~$1,000 | ~$2,000 |
| ~10% | ~$4,000 | ~$800 | ~$2,000 | ~$4,000 |
| ~15% | ~$6,000 | ~$1,200 | ~$3,000 | ~$6,000 |

If EV ≈ **+19%** of premium on $4k risked → about **~$760 expectancy per trade** (not every trade). At ~8–12 trades/week that is a rough **planning** band only — real results vary with WR, cuts, and chop weeks.

---

## 10. Executable checklist (printable)

**Pre-market**

- [ ] Earnings / econ times noted
- [ ] PMH, PML, PDH, PDL marked
- [ ] HTF demand/supply + “line” levels marked
- [ ] Mag7 / index GAMEPLAN read (`bounce // b/h // reject`)
- [ ] Bias: side of 200 + 13/48 + EMA divergence vs bunch

**Entry**

- [ ] Waiting at level — not predicting
- [ ] BBR confirmed (bounce / reject / B/H + retest preferred)
- [ ] Volume / momentum agrees
- [ ] Size matches day-of-week + first-trade-light rule
- [ ] Invalidation / cut level written before entry

**Manage**

- [ ] Scale majority ~20% (or first major level)
- [ ] Stops to BE / structure on runners
- [ ] Trail remaining on 8 EMA
- [ ] Full cut on invalidation — no green→full red

**Stand down if**

- [ ] EMAs bunched / inside day
- [ ] No A+ confluence
- [ ] Urge to revenge size after a miss

---

## 11. Gaps & honesty

1. Full pinned `callout-guide` / masterclass / all trade-recaps were not fully readable via MCP — onboarding path may add stop/abbreviation detail.
2. **Account size and his live contract counts** are not disclosed in alerts.
3. Loss magnitudes are almost never posted → PF / EV are **assumed ranges**.
4. X personal million / 6-figure claims are **unverified marketing**.
5. Peak Discord “BANGER” % ≫ typical realized after scaling.
6. This doc is a research synthesis for Edge/trading study — not endorsement of the community or of copying size.

---

## 12. Sources (primary)

- YouTube: *Banks' Bounce, Break, Reject Strategy Explained* (`0UsKiMmzPG8`); entry/exit (`0ip-uj6q_LY`); Discord walkthrough (`etHzdujy13M`); Sunday watch (`IWO_gL0GODg`); AMD small-account BBR (`TucGJT3lgbE`); dollar recaps (NVDA/SPY titles)
- Discord: `#bbr-strategy`, `#indices`, `#high-risk`, `#daytrades`, `#banks`, Mag7 / morning watchlist GAMEPLANs
- X: [@RealJGBanks](https://x.com/RealJGBanks) (Jul 2026 sample + earlier personal $ claims)

*Last updated: 2026-07-23*
