# Bots, resources, and non-price data

## Education channels (MCP gap)

`#stock-terms`, `#charting-resources`, `#intro-options` returned **no readable curriculum** in up to 8760h lookback (likely pins/images/older than window). `#library` had only a thread stub (`PutsEclipse_strat`).

Use Banks onboarding path instead (see [channel-map.md](./channel-map.md)).

## Commands list (Banks)

Only recovered message (2026-07-17):

> WHAT EVERY BOT MEANS — https://tradytics.com/discord-bots

## Tradytics surface (from Banks’ linked docs + live samples)

### Auto bots (catalog)

| Bot channel | Docs role | MCP sample |
|-------------|-----------|------------|
| Trady Flow | Repeat/dominant options signals | Empty text |
| Bullseye | AI intraday options | Empty |
| Scalps | Quick strat signals | Empty |
| Sweeps / Golden Sweeps | Large / $1M+ options sweeps | Empty |
| Darkpool | Large DP/blocks | Empty |
| Insider | Insider prints | Empty |
| Analyst Grades | Upgrades/downgrades | Empty |
| Important News | Notable news | Empty |
| Stock Breakouts | ~5k-stock breakout charts | **Active** image alerts |
| Social Spike | Whale-watch style (sparse) | 1 old sample |

### Query bots (`#tradytics-query-bots`)

Member-driven. Observed attachment stems: `net_*`, `algo_*`, `gexz_*`, `dplevels_*`, `dpdensity_*`, `bigflow_*`, `heatmap_*`, `hotc_*`.  
Commands (docs): `tr-all`, `tr-topflow`, `tr-bigflow`, `tr-flowsum`, `tr-algoflow`, `tr-oi`, `tr-iv`, `tr-dplevels`, `tr-news`, `tr-help`, etc.

## Non-price data available vs Banks’ desk

| Available in Discord | Banks observed using as primary input? |
|----------------------|----------------------------------------|
| Options net premium / flow charts | No (optional tooling) |
| Algo flow / GEX | No (Banks has downplayed GEX in walkthrough YT) |
| Darkpool levels / density | No |
| Sweeps / golden sweeps | No |
| Insider / analyst / news bots | No |
| Stock breakout auto-alerts | No |
| **Price levels + BBR + volume** | **Yes — core** |
| **Earnings / econ calendar** | **Yes — awareness / risk** |
| **Futures ES/NQ levels** | **Yes — context** |
| **Index relative strength / light sector notes** | **Yes — narrative framing** |
| **8 EMA trail** | **Yes — management** |

**Split:** Discord hosts a full Tradytics non-price stack. Banks’ visible edge remains **price structure + reaction + calendar awareness**. Bots are documented for members, not pasted as his thesis source in sampled GAMEPLANs/callouts.

## Refresh log

- 2026-07-29 — initial mine; most auto-alert channels embed-empty to MCP
