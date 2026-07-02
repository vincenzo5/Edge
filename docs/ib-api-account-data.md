# Interactive Brokers API — Account Data Inventory

Comprehensive inventory of account-related data available from Interactive Brokers, covering both the **TWS API** (socket API used by IB Gateway / TWS, consumed by `ib_insync` / `ib_async`) and the **Client Portal Web API** (REST). Use this as the design reference for the account-tracking feature in the Edge Next.js app with a Python sidecar talking to IB Gateway.

> **Runtime note:** The user runs **IB Gateway** (not TWS). The TWS API surface is identical between TWS and IB Gateway — every method below works against IB Gateway. IB Gateway is lighter (no charting UI) but exposes the same socket protocol. The Web API (Client Portal) runs via the **Client Portal Gateway** (a separate Java process, `clientportal.gw`), NOT IB Gateway — see "Web API vs TWS API" below.

---

## 0. Two distinct APIs — do not confuse them

| | TWS API (socket) | Client Portal Web API (REST) |
|---|---|---|
| Transport | TCP socket protocol (binary) | HTTPS / REST + SSE streaming |
| Process | TWS **or** IB Gateway | Client Portal Gateway (`clientportal.gw`) — separate download |
| Auth | Trusted local app (no token) | OAuth / session via gateway |
| Libraries | `ib_insync`, `ib_async`, official `ibapi` (Python/Java/C++/C#) | Any HTTP client |
| Account data | `reqAccountSummary`, `reqAccountUpdates`, `reqPositions`, `reqOpenOrders`, `reqExecutions`, `reqPnL` | `/portfolio/*`, `/iserver/*`, `/pa/*` endpoints |
| Streaming | Push via `EWrapper` callbacks (async events) | Polling + SSE for market data; portfolio is poll/snapshot |
| Best for | Low-latency realtime inside the sidecar | Server-to-server, web backends, no local IB process |

**Recommendation for the sidecar:** Use the **TWS API via `ib_insync`/`ib_async`** against IB Gateway for realtime account/portfolio/PnL streaming. Use the Web API only if you later want hosted/REST access without a local gateway.

---

## 1. Account Summary / Portfolio Value (TWS API)

### Method
- `EClient.reqAccountSummary(reqId, group, tags)` — subscribe to the TWS "Account Summary" window.
- `EClient.cancelAccountSummary(reqId)` — cancel.
- ib_insync: `ib.reqAccountSummary()` returns a list of `AccountValue` objects; events `accountSummary` / `accountSummaryEnd`. There is also a blocking helper that returns the full snapshot.

### Behavior
- **Streaming subscription**, but throttled: initial full dump, then updates **every 3 minutes** for changed values (same cadence as TWS Account Window; not configurable).
- `group` = `"All"` for all managed accounts, or a single account id, or (TWS 983+) a profile/group name.
- **Limit: only 2 concurrent `reqAccountSummary` subscriptions allowed.**
- FA / IBroker accounts with >50 subaccounts or "on-demand account lookup" cannot use `group="All"` — must request per subaccount.

### The full AccountSummaryTags list
From `IBApi.AccountSummaryTags` ([ref](https://interactivebrokers.github.io/tws-api/classIBApi_1_1AccountSummaryTags.html)):

| Tag | Meaning |
|---|---|
| `AccountType` | Account type (e.g. INDIVIDUAL, FA, IBroker) |
| `NetLiquidation` | Net liquidation value (total equity, mark-to-market) |
| `TotalCashValue` | Total cash including commodities |
| `SettledCash` | Settled cash |
| `AccruedCash` | Accrued interest/dividends |
| `BuyingPower` | Buying power |
| `EquityWithLoanValue` | Equity including loan value |
| `PreviousDayEquityWithLoanValue` | Prior day equity with loan |
| `GrossPositionValue` | Sum of long|short position values |
| `ReqTEquity` | Required total equity |
| `ReqTMargin` | Required total margin |
| `SMA` | Special Memorandum Account |
| `InitMarginReq` | Initial margin requirement |
| `MaintMarginReq` | Maintenance margin requirement |
| `AvailableFunds` | Available funds (equity − initial margin) |
| `ExcessLiquidity` | Excess liquidity (equity − maintenance margin) |
| `Cushion` | ExcessLiquidity / NetLiquidation (%) |
| `FullInitMarginReq` | Initial margin including futures spread |
| `FullMaintMarginReq` | Maintenance margin including futures spread |
| `FullAvailableFunds` | Available funds including futures spread |
| `FullExcessLiquidity` | Excess liquidity including futures spread |
| `LookAheadNextChange` | Time of next margin change |
| `LookAheadInitMarginReq` | Look-ahead initial margin |
| `LookAheadMaintMarginReq` | Look-ahead maintenance margin |
| `LookAheadAvailableFunds` | Look-ahead available funds |
| `LookAheadExcessLiquidity` | Look-ahead excess liquidity |
| `HighestSeverity` | Highest severity alert (0–3) |
| `DayTradesRemaining` | PDT day trades remaining |
| `Leverage` | Leverage ratio |

Use `AccountSummaryTags.GetAllTags()` / `AllTags` to request all at once.

### Per-currency ledger tags
- `"$LEDGER"` — returns CashBalance + TotalCashBalance in **base currency only**.
- `"$LEDGER:USD"`, `"$LEDGER:EUR"`, etc. — balances for a specific currency.
- `"$LEDGER:ALL"` — summed values across all accounts and currencies, broken out per currency.

Source: [Account Summary docs](https://interactivebrokers.github.io/tws-api/account_summary.html)

---

## 2. Positions (TWS API)

### Method
- `EClient.reqPositions()` — subscribe to all positions across managed accounts.
- `EClient.cancelPositions()` — cancel.
- ib_insync: `ib.reqPositions()` (blocking returns list of `Position`); state also exposed via `ib.positions()`; events `positionEvent` / `positionEndEvent`.

### Fields per position (`Position` object)
| Field | Type |
|---|---|
| `account` | str (account id holding the position) |
| `contract` | `Contract` (conId, symbol, secType, currency, exchange, lastTradeDateOrContractMonth, strike, right, multiplier, etc.) |
| `position` | float (signed quantity; negative = short) |
| `avgCost` | float (average cost per share/contract) |

### Streaming
- **Streaming subscription.** Full snapshot on subscribe, then deltas as positions change.
- Single account vs FA: returns positions for **all** managed accounts; `account` field disambiguates.
- Note: `marketPrice`, `marketValue`, `unrealizedPNL`, `realizedPNL` are **not** in the TWS API `Position` object — those come from `reqAccountUpdates` portfolio callbacks (see §4) or via the Web API `/portfolio/{accountId}/positions` (which includes them).

---

## 3. Account Updates / Portfolio stream (TWS API)

### Method
- `EClient.reqAccountUpdates(subscribe, account)` — subscribe to a **single account's** portfolio + account value updates.
- `EClient.cancelAccountUpdates(account)`.
- ib_insync: `ib.reqAccountUpdates(account)`; events `updateAccountValue`, `updatePortfolio`, `accountDownloadEnd`.

> **`reqAccountSummary` vs `reqAccountUpdates`:** `reqAccountSummary` gives a summarized cross-account view (multi-account, throttled 3 min). `reqAccountUpdates` gives a **single account's** detailed portfolio (per-position) and realtime account values. For a single-account user, `reqAccountUpdates` is the richer streaming source.

### `updateAccountValue` tags (subset, same namespace as §1)
`CashBalance`, `TotalCashBalance`, `AccruedCash`, `StockMarketValue`, `OptionMarketValue`, `FutureOptionMarketValue`, `FuturesPNL`, `NetLiquidationByCurrency`, `UnrealizedPnL`, `RealizedPnL`, `EquityWithLoanValue`, `AvailableFunds`, `BuyingPower`, `Leverage`, `InitMarginReq`, `MaintMarginReq`, `SMA`, `AccountType`, `Currency`, ... delivered per currency.

### `updatePortfolio` fields per position
| Field | Type |
|---|---|
| `contract` | `Contract` |
| `position` | float |
| `marketPrice` | float |
| `marketValue` | float |
| `averageCost` | float |
| `unrealizedPNL` | float |
| `realizedPNL` | float |
| `accountName` | str |

### Streaming
- **Streaming** (push on changes), single account only. This is the realtime per-position PnL/market-value source in the TWS API.

---

## 4. Orders (TWS API)

### Methods
- `EClient.reqOpenOrders()` — current open orders for the connected client.
- `EClient.reqAllOpenOrders()` — open orders for all clients on the gateway.
- `EClient.reqAutoOpenOrders(autoBind)` — bind to TWS-placed orders.
- `EClient.reqCompletedOrders(apiOnly)` — historically completed orders (TWS 980+).
- ib_insync: `ib.reqOpenOrders()`, `ib.reqAllOpenOrders()`, `ib.reqCompletedOrders()`; live state in `ib.orders()` and `ib.trades()`; events `openOrder`, `orderStatus`, `openOrderEnd`.

### `Order` / `OrderStatus` fields
- Order: `orderId`, `clientId`, `permId`, `parentId`, `account`, `action`, `totalQuantity`, `orderType`, `lmtPrice`, `auxPrice`, `tif`, `ocaGroup`, `transmit`, `orderRef`, `status`, etc.
- `orderStatus` callback: `orderId`, `status` (`PendingSubmit`, `PreSubmitted`, `Submitted`, `ApiPending`, `ApiCancelled`, `Cancelled`, `Filled`, `Inactive`, `PendingCancel`), `filled`, `remaining`, `avgFillPrice`, `permId`, `parentId`, `lastFillPrice`, `clientId`, `whyHeld`, `mktCapPrice`.

### Streaming
- `openOrder` / `orderStatus` are **streaming** (push on every change). `reqOpenOrders`/`reqCompletedOrders` produce a snapshot + `openOrderEnd`.

---

## 5. Trades / Executions (TWS API)

### Method
- `EClient.reqExecutions(reqId, execFilter)` — request execution reports matching a filter (account, time, symbol, secType, exchange, side).
- ib_insync: `ib.reqExecutions()`; live state in `ib.trades()` / `ib.fills()`; events `execDetails`, `execDetailsEnd`, `commissionReport`.

### `execDetails` fields (`Execution` object)
`execId`, `time`, `acctNumber`, `exchange`, `side`, `shares`, `price`, `cumQuantity`, `avgPrice`, `orderId`, `liquidation`, `cumDividend`, `evRule`, `evMultiplier`, `orderRef`, `modelCode`.

### Commission (`commissionReport` callback)
`execId`, `commission`, `currency`, `realizedPNL`, `yield`, `yieldRedemptionDate`.

### Streaming vs snapshot
- `reqExecutions` is a **snapshot query** (one-time, ending with `execDetailsEnd`).
- Realtime fills are pushed via `execDetails` + `commissionReport` events as they happen (no need to poll).

---

## 6. PnL (TWS API)

### Method (single account / model)
- `EClient.reqPnL(reqId, account, modelCode)` — subscribe to daily PnL for an account/model.
- `EClient.cancelPnL(reqId)`.
- Callback `pnl(reqId, dailyPnL, unrealizedPnL, realizedPnL)`.
- ib_insync: `ib.reqPnL(account, modelCode='')` → events `pnlEvent`; returns `PnL` with `dailyPnL`, `unrealizedPnL`, `realizedPnL`.

### Method (single position)
- `EClient.reqPnLSingle(reqId, account, modelCode, conid)` — subscribe to PnL for one position.
- `EClient.cancelPnLSingle(reqId)`.
- Callback `pnlSingle(reqId, pos, dailyPnL, unrealizedPnL, realizedPnL, value)`.
- ib_insync: `ib.reqPnLSingle(account, conid, modelCode='')`.

### Fields
- `dailyPnL` — profit/loss since prior day's close.
- `unrealizedPnL` — open position PnL.
- `realizedPnL` — realized for the day.
- `value` (PnLSingle only) — current market value of the position.

### Streaming
- **Streaming** (push on changes). Higher frequency than `reqAccountSummary` (which is 3-min). This is the recommended realtime PnL feed for the sidecar.

---

## 7. Margin (TWS API)

Margin values are delivered through the Account Summary / Account Updates tags — there is **no separate "reqMargin" method**. Relevant tags:

- `InitMarginReq`, `MaintMarginReq` — current segment-level requirements.
- `FullInitMarginReq`, `FullMaintMarginReq` — account-wide incl. futures spreads.
- `AvailableFunds`, `FullAvailableFunds` — equity − initial margin.
- `ExcessLiquidity`, `FullExcessLiquidity` — equity − maintenance margin.
- `Cushion` — `ExcessLiquidity / NetLiquidation`.
- `LookAheadInitMarginReq`, `LookAheadMaintMarginReq`, `LookAheadAvailableFunds`, `LookAheadExcessLiquidity`, `LookAheadNextChange` — projected margin at next change.
- `ReqTEquity`, `ReqTMargin`, `SMA`, `HighestSeverity`.

For **per-position margin / what-if**: use order preview (`whatIfOrder` → `orderState` with `initMarginChange`, `maintMarginChange`, `equityWithLoanChange`, `commission`, `minCommission`, `maxCommission`). Web API equivalent: `/iserver/account/{accountId}/order/whatif`.

---

## 8. Account Management — linked accounts, aliases, base currency (TWS API)

### Method
- `EClient.reqManagedAccts()` — returns comma-separated list of account ids the user can trade (delivered via `managedAccounts` callback, once at connect).
- `EClient.reqFamilyCodes()` — family/linked account codes (`familyCodes` callback: `familyCode`, `accountID`).
- ib_insync: `ib.managedAccounts()` (property, list of account ids); `ib.reqFamilyCodes()`.
- Aliases / base currency: not directly in TWS API; use `reqAccountSummary` `AccountType` and per-currency `$LEDGER` tags, or the Web API `/portfolio/accounts` (returns `accountAlias`, `currency`, `accountVan`, `accountTitle`, `displayName`, `type`, `tradingType`, `parent`, `master`).

---

## 9. Cash / Balances (TWS API)

Two sources:

1. **`reqAccountSummary` with `$LEDGER` tags** — base-currency, per-currency, or all-currency CashBalance / TotalCashBalance.
2. **`reqAccountUpdates`** — `updateAccountValue` per currency: `CashBalance`, `TotalCashBalance`, `AccruedCash`, `StockMarketValue`, `OptionMarketValue`, `FutureOptionMarketValue`, `FuturesPNL`, `MoneyFunds`, `Funds`, `NetLiquidationByCurrency`, `Currency`.

Per-currency vs per-commodity split is via the `-c` (commodity), `-s` (securities), `-f` (UKL/futures) suffix scheme exposed by the Web API ledger (see §11).

---

## 10. Other / support logs / market data subscriptions (TWS API)

- `reqFamilyCodes`, `reqFinancialData(fundamentalData)` — limited.
- `reqMarketDataType`, `reqMktData` — market data (separate from account).
- Market data **subscription entitlements**: surfaced via error codes on `reqMktData` (e.g. 354 "no market data permission") rather than a clean inventory endpoint. The Web API has `/iserver/accounts` + `/portal/...` for entitlements.
- Support logs / API logs: TWS API has `serverLogLevel(reqId, logLevel)` and `error` callback; no account-data retrieval.

---

## 11. Client Portal Web API — account endpoints (REST)

Base URL: `https://api.ibkr.com/v1/api/...` (via the Client Portal Gateway). Session: must call `/tickle` to keep alive; `/sso/validate`, `/iserver/auth/status`, `/iserver/reauthenticate`.

### 11.1 Accounts & aliases
| Endpoint | Method | Notes |
|---|---|---|
| `/portfolio/accounts` | GET | Non-tiered: accounts the user can **view**. **Must be called first** before any `/portfolio/{accountId}/*`. Rate: 1 req/5s. |
| `/portfolio/subaccounts` | GET | Tiered (FA/IBroker): subaccounts (≤100; use `/portfolio/subaccounts2` for more). 1 req/5s. |
| `/portfolio/{accountId}/meta` | GET | Account info for one account. |
| `/iserver/accounts` | GET | Accounts the user can **trade**, aliases, and `selectedAccount`. **Must call before orders/open orders.** |
| `/iserver/account` | POST | Switch currently selected account (body `acctId`). |
| `/sso/validate` | GET | Session validation, `LOGIN_TYPE` (1=live, 2=paper). |

`/portfolio/accounts` response fields: `id`, `accountId`, `accountVan`, `accountTitle`, `displayName`, `accountAlias`, `accountStatus`, `currency`, `type`, `tradingType`, `faclient`, `parent`, `desc`, `covestor`, `master.title`, `master.officialTitle`.

### 11.2 Account summary (REST)
| Endpoint | Method | Notes |
|---|---|---|
| `/portfolio/{accountId}/summary` | GET | Margin, cash balances, etc. Aggregate + per-segment. |

Returns one object per metric. Property naming is lowercased; **suffix convention**:
- `-c` = commodity segment
- `-s` = securities segment
- `-f` = futures (UKL) segment
- no suffix = aggregate

Each value is a `summary` object: `{ amount, currency, isNull, timestamp, value }`.

Known summary properties include: `accountready`, `accounttype`, `accruedcash` (+`-c`/`-f`/`-s`), `accrueddividend` (+segments), `availablefunds` (+segments), `buyingpower`, `cushion`, `equitywithloanvalue`, `excessliquidity`, `fullavailablefunds`, `fullinitmarginreq`, `fullmaintmarginreq`, `fullreqtequity`, `futuresonlyrequirement`, `grosspositionvalue`, `highestseverity`, `initmarginreq`, `leverages`, `lookaheadnextchange`, `lookaheadinitmarginreq`, `lookaheadmaintmarginreq`, `lookaheadavailablefunds`, `lookaheadexcessliquidity`, `maintmarginreq`, `netliquidation`, `netliquidationuncertainty`, `previousdayequitywithloanvalue`, `reguldequity`, `regulreqequity`, `regulreqmargin`, `regularedt`, `reqtequity`, `reqtmargin`, `sma`, `stockmarketvalue`, `totalcashvalue`, `daytradesremaining`, `futurespnL`, `optionmarketvalue`, `warrantsmarketvalue`, `corporatebondsmarketvalue`, `issueroptionsmarketvalue`, `futuremarketvalue`, `commoditymarketvalue`, `moneyfunds`, `funds`, `interest`, `realizedpnl`, `unrealizedpnl`, `settledcash`.

### 11.3 Ledger / cash by currency
| Endpoint | Method | Notes |
|---|---|---|
| `/portfolio/{accountId}/ledger` | GET | Cash balances in base currency + any other held currencies. |

Response is a map keyed by currency code (`USD`, `EUR`, ...), plus a `BASE` entry. Each currency ledger object:
`commoditymarketvalue`, `futuremarketvalue`, `settledcash`, `exchangerate`, `sessionid`, `cashbalance`, `corporatebondsmarketvalue`, `warrantsmarketvalue`, `netliquidationvalue`, `interest`, `unrealizedpnl`, `stockmarketvalue`, `moneyfunds`, `currency`, `realizedpnl`, `funds`, `acctcode`, `issueroptionsmarketvalue`, `key`, `timestamp`, `severity`.

### 11.4 Positions (REST)
| Endpoint | Method | Notes |
|---|---|---|
| `/portfolio/{accountId}/positions/{pageId}` | GET | Paged (default 30/page). Query: `model`, `sort`, `direction`, `period` (1D/7D/1M for pnl). |
| `/portfolio/{accountId}/position/{conid}` | GET | Single position by conid (model-aware). |
| `/portfolio/positions/{conid}` | GET | All selected accounts' positions for a conid. |
| `/portfolio/{accountId}/positions/invalidate` | POST | Bust backend cache. |

`position` object fields: `acctId`, `conid`, `contractDesc`, `assetClass`, `position`, `mktPrice`, `mktValue`, `currency`, `avgCost`, `avgPrice`, `realizedPnl`, `unrealizedPnl`, `exchs`, `expiry`, `putOrCall`, `multiplier`, `strike`, `exerciseStyle`, `undConid`, `conExchMap`, `baseMktValue`, `baseMktPrice`, `baseAvgCost`, `baseAvgPrice`, `baseRealizedPnl`, `baseUnrealizedPnl`, `name`, `lastTradingDay`, `group`, `sector`, `sectorGroup`, `ticker`, `undComp`, `undSym`, `fullName`, `pageSize`, `model`.

> **Advantage over TWS API positions:** the Web API positions include `mktPrice`, `mktValue`, `unrealizedPnl`, `realizedPnl`, `avgPrice`, sector/industry (`group`/`sector`), and base-currency equivalents — all in one call.

### 11.5 Allocation
| Endpoint | Method | Notes |
|---|---|---|
| `/portfolio/{accountId}/allocation` | GET | One account: allocation by Asset Class, Industry, Category. |
| `/portfolio/allocation` | POST | Consolidated across accounts (body `acctIds[]`). |

`allocation` object: nested `{ long: {STK,OPT,FUT,WAR,BOND,CASH}, short: {...} }` plus industry/category breakdowns. (Not available in the TWS API.)

### 11.6 Performance (PortfolioAnalyst)
| Endpoint | Method | Notes |
|---|---|---|
| `/pa/performance` | POST | MTM performance time series. Body: `acctIds[]`, `freq` (`D`/`M`/`Q`). 1 req/15min. |
| `/pa/summary` | POST | Account balance summary (consolidated if multiple `acctIds`). 1 req/15min. |

`performance` response: `cps` (cumulative performance series), `tpps` (time-period series), `nav` (NAV series), each with `{ dates[], freq, data[] }` where each data item has `id`, `idType`, `start`, `end`, `baseCurrency`, `returns[]` (% change per date). Also `pm`, `included[]`, `currencyType`, `rc`. (Not available in TWS API — Web API only.)

### 11.7 Orders, trades, PnL (REST)
| Endpoint | Method | Notes |
|---|---|---|
| `/iserver/account/orders` | GET | Live + today's orders (polling mode). Filters: `filters` (filled/cancelled/...), `force`, `accountId`. 1 req/5s. |
| `/iserver/account/{accountId}/orders` | POST | Place orders (bracket supported). |
| `/iserver/account/{accountId}/order/{orderId}` | POST/DELETE | Modify / cancel. |
| `/iserver/account/{accountId}/order/status/{orderId}` | GET | Order status. |
| `/iserver/account/{accountId}/order/whatif` | POST | Preview → commission + margin impact. |
| `/iserver/account/trades` | GET | Trades for selected account: current day + 6 previous days. |
| `/iserver/account/pnl/partitioned` | GET | PnL for selected account + models. 1 req/5s. |
| `/iserver/reply/{replyid}` | POST | Answer order questions. |

`trade` object fields: `execution_id`, `symbol`, `side`, `order_description`, `trade_time`, `trade_time_r`, `size`, `price`, `submitter`, `exchange`, `comission` (sic), `net_amount`, `account`, `company_name`, `contract_description_1`, `sec_type`, `conidex`, `position`, `clearing_id`, `clearing_name`, `order_ref`.

### 11.8 Other
| Endpoint | Method | Notes |
|---|---|---|
| `/tickle` | POST | Keep session alive; returns session info. |
| `/fyi/notifications`, `/fyi/unreadnumber` | GET | Account notifications. |
| `/fyi/subscriptions`, `/fyi/{type}/disable` | GET/POST | FYI delivery options. |
| `/pa/transactions` | POST | Transactions (1 req/15min). |

---

## 12. TWS API vs Web API — account data differences

| Capability | TWS API | Web API |
|---|---|---|
| Realtime account value push | ✅ `reqAccountUpdates` (sub-second) | ❌ polling only |
| Realtime PnL push | ✅ `reqPnL` / `reqPnLSingle` | ⚠️ `/iserver/account/pnl/partitioned` (poll, 1/5s) |
| Position with PnL + sector | ❌ (need `reqAccountUpdates` for PnL; no sector) | ✅ `/portfolio/{id}/positions` |
| Per-segment margin (-c/-s/-f) | ⚠️ via `reqAccountUpdates` per currency | ✅ explicit in `/portfolio/{id}/summary` |
| Allocation (asset class/industry) | ❌ | ✅ `/portfolio/{id}/allocation` |
| Historical performance series | ❌ | ✅ `/pa/performance` (D/M/Q) |
| Commissions per fill | ✅ `commissionReport` event | ✅ in `/iserver/account/trades` (`comission`) |
| Multi-account summary | ✅ `reqAccountSummary("All", ...)` | ✅ `/portfolio/accounts` + per-acct `/summary` |
| Day-trades remaining, leverage, cushion | ✅ tags | ✅ summary fields |
| What-if margin impact | ✅ `whatIfOrder` | ✅ `/order/whatif` |
| Linked/FA subaccounts | ✅ `reqManagedAccts`, `reqFamilyCodes` | ✅ `/portfolio/subaccounts` |
| Account aliases / display name / base currency | ⚠️ not directly | ✅ `/portfolio/accounts` fields |
| Sessions | persistent socket | must `/tickle` to keep alive |

---

## 13. Rate limits / pacing (Web API)

From the [Web API docs](https://www.interactivebrokers.com/campus/ibkr-api-page/webapi-doc/):

| Endpoint | Limit |
|---|---|
| `/portfolio/accounts` | 1 req / 5 sec |
| `/portfolio/subaccounts` | 1 req / 5 sec |
| `/iserver/account/orders` | 1 req / 5 sec |
| `/iserver/orders` | 1 req / 5 sec |
| `/iserver/trades` | 1 req / 5 sec |
| `/iserver/account/pnl/partitioned` | 1 req / 5 sec |
| `/iserver/marketdata/snapshot` | 10 req / sec |
| `/iserver/scanner/params` | 1 req / 15 min |
| `/iserver/scanner/run` | 1 req / sec |
| `/pa/performance` | 1 req / 15 min |
| `/pa/summary` | 1 req / 15 min |
| `/pa/transactions` | 1 req / 15 min |
| `/iserver/marketdata/history` | 5 concurrent requests |

Other notes:
- A daily **brokerage maintenance window** (~01:00 local time by region) makes `/iserver` briefly unavailable.
- Only **2 concurrent** `reqAccountSummary` subscriptions in the TWS API.
- `reqAccountSummary` updates at most every 3 minutes (throttle, not configurable). Use `reqAccountUpdates` / `reqPnL` for sub-second realtime.
- Web API: `/portfolio/accounts` (or `/subaccounts`) **must** be called before any `/portfolio/{accountId}/*` endpoint each session.
- `/iserver/accounts` **must** be called before any order placement / open-order query each session.

---

## 14. ib_insync method quick-reference (sidecar)

All streaming methods have blocking `_`-less variants (`ib.reqX()`) that return the snapshot, plus event properties (`ib.xEvent`) for push updates, and live state lists (`ib.positions()`, `ib.orders()`, `ib.trades()`, `ib.fills()`, `ib.accountValues()`).

| Concern | ib_insync method | Returns / Event |
|---|---|---|
| Managed accounts | `ib.managedAccounts()` | list[str] |
| Family/linked codes | `ib.reqFamilyCodes()` | list[FamilyCode] |
| Account summary | `ib.reqAccountSummary()` / `ib.accountSummaryEvent` | list[AccountValue] |
| Single-account values + portfolio | `ib.reqAccountUpdates(account)` | `updateAccountValue`/`updatePortfolio` events |
| Positions (all accts) | `ib.reqPositions()` / `ib.positions()` / `ib.positionEvent` | list[Position] |
| Open orders | `ib.reqOpenOrders()`, `ib.reqAllOpenOrders()`, `ib.reqCompletedOrders()` | list[Order] / `openOrder`+`orderStatus` events |
| Executions | `ib.reqExecutions()` / `ib.trades()` / `ib.fills()` | list[Trade] / `execDetails`+`commissionReport` |
| Daily PnL | `ib.reqPnL(account, modelCode='')` | `pnlEvent` → PnL(dailyPnL, unrealizedPnL, realizedPnL) |
| Per-position PnL | `ib.reqPnLSingle(account, conid, modelCode='')` | `pnlSingleEvent` |
| What-if order | `ib.whatIfOrder(order)` | OrderState (margin + commission impact) |

Note: `ib_insync` is now in maintenance; the actively-maintained fork is **`ib_async`** ([docs](https://ib-api-reloaded.github.io/ib_async/)) with the same API surface. Prefer `ib_async` for new sidecar work.

---

## 15. Recommended sidecar design (for the Edge account-tracking feature)

1. **Connect** `ib_async` to IB Gateway (port 7496 live / 7497 paper). Enable `reqManagedAccts` on connect.
2. **One-time snapshot on startup:**
   - `reqAccountSummary("All", AllTags)` → margin/cash/leverage overview.
   - `reqPositions()` → position list (with `contract`, `position`, `avgCost`).
   - `reqOpenOrders()` + `reqExecutions()` → orders/trades baseline.
3. **Realtime streams (subscribe once, keep open):**
   - `reqAccountUpdates(account)` → per-position `marketPrice`/`marketValue`/`unrealizedPNL`/`realizedPNL` + per-currency cash.
   - `reqPnL(account)` → daily/unrealized/realized PnL push.
   - `reqPnLSingle(account, conid)` for the user's focused symbols.
   - `openOrder`/`orderStatus`/`execDetails`/`commissionReport` events → live order/fill feed.
4. **Expose to Next.js** via the sidecar's HTTP/WebSocket layer:
   - `GET /account/summary` → §1 tags (cache + 3-min refresh marker).
   - `GET /account/positions` → enriched positions (TWS contract + `reqAccountUpdates` PnL fields).
   - `GET /account/pnl` → latest PnL snapshot.
   - `GET /account/orders`, `/account/trades` → live orders + fills with commission.
   - `WS /stream/account` → push `updatePortfolio`, `pnl`, `orderStatus`, `execDetails` deltas to the frontend.
5. **Avoid** calling `reqAccountSummary` more than needed (2-sub limit, 3-min throttle) — rely on `reqAccountUpdates` + `reqPnL` for realtime; refresh `reqAccountSummary` every 3 min for the summary panel.
6. **Optional Web API layer** if you later need `/pa/performance` (historical MTM series) or `/portfolio/{id}/allocation` (asset-class/sector allocation) — neither is available via TWS API. Run a separate Client Portal Gateway if so.

---

## References

- TWS API — Account Summary: https://interactivebrokers.github.io/tws-api/account_summary.html
- TWS API — `AccountSummaryTags` class: https://interactivebrokers.github.io/tws-api/classIBApi_1_1AccountSummaryTags.html
- TWS API — `EClient` class reference: https://interactivebrokers.github.io/tws-api/classIBApi_1_1EClient.html
- TWS API documentation hub (now on IBKR Campus): https://www.interactivebrokers.com/campus/ibkr-api-page/twsapi-doc/
- TWS API reference: https://www.interactivebrokers.com/campus/ibkr-api-page/twsapi-ref/
- Web API documentation: https://www.interactivebrokers.com/campus/ibkr-api-page/webapi-doc/
- Web API reference: https://www.interactivebrokers.com/campus/ibkr-api-page/webapi-ref/
- Web API v1 (Client Portal): https://www.interactivebrokers.com/campus/ibkr-api-page/cpapi-v1/
- Account Management Web API: https://www.interactivebrokers.com/campus/ibkr-api-page/web-api-account-management/
- Client Portal Web API OpenAPI spec (mirror): https://gist.github.com/theloniusmunch/9b14d320fd1c3aca550fc8d54c446ce0
- ib_insync API docs: https://ib-insync.readthedocs.io/api.html
- ib_insync source (`ib.py`): https://github.com/erdewit/ib_insync/blob/master/ib_insync/ib.py
- ib_async (maintained fork): https://ib-api-reloaded.github.io/ib_async/
- ib_insync guide: https://algotrading101.com/learn/ib_insync-interactive-brokers-api-guide/
- IBKR API Reference Guide (PDF): https://www.aesinternational.com/hubfs/Independent-Reviews/Interactive-Brokers-API-Reference-Guide.pdf
