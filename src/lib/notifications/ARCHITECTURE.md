# Notifications

In-app notification delivery for Edge — bell inbox, toast viewport, and server persistence.

## Model

- **Notification events** are append-only records (`notification_events` in Postgres; `edge:notifications:v1` in localStorage when persistence is unavailable or the browser has no persistence session).
- **Emit path:** server code calls `emitNotification()` in [`emitNotification.ts`](./emitNotification.ts) → [`notificationRepository.ts`](../persistence/repositories/notificationRepository.ts).
- **Dedupe:** same `dedupeKey` within 30s is suppressed (see [`dedupe.ts`](./dedupe.ts)).

## Client

- [`NotificationProvider.tsx`](../../app/components/notifications/NotificationProvider.tsx) polls `/api/me/notifications`, drives toast + inbox state.
- [`NotificationBellMenu.tsx`](../../app/components/notifications/NotificationBellMenu.tsx) lives in `AppTopHeader`.
- [`notificationClient.ts`](./notificationClient.ts) falls back to [`localNotificationStore.ts`](./localNotificationStore.ts) on 401 or 503, so optional persistence does not produce rejected polling promises.

## API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/me/notifications` | GET | List + unread count |
| `/api/me/notifications` | POST | Create (dev/test + internal) |
| `/api/me/alerts/events` | GET | List trigger audit events (last 50; optional `alertId`) |
| `/api/me/notifications/[id]` | PATCH | Mark read / dismiss |
| `/api/me/notifications/mark-all-read` | POST | Mark all read |

## Alerts integration

Price alert evaluator calls `emitNotification({ source: "alert", ... })` after a trigger. Alerts UI is a separate workspace tile — see [`../alerts/`](../alerts/).

**Phase 1 (drawing-bound):** Alerts may bind to `horizontal_line`, `trend_line`, or `rectangle` via `drawingId` + denormalized geometry columns on `alert_definitions`. Client `drawingAlertSync` patches geometry when drawings move and expires alerts when bound drawings are deleted. Cron resolves trendline level-at-now from stored endpoints and evaluates `enter_zone` / `exit_zone` for rectangles.

**Phase 2a (trade plan):** Long/short position overlays can create three linked price alerts (entry/stop/target) via `drawingRole` + `bundleId`. Role-aware sync updates each alert price independently when the position drawing moves.

**Phase 2b (screener):** `screener_alerts` rows schedule server re-runs of saved screens. `/api/cron/screener-alert-evaluate` diffs symbol sets and emits `source: "screener"` notifications when new symbols appear (baseline run seeds `lastSymbols` without notifying).

**Phase 3 (conditions):** `0021_alert_conditions.sql` adds `combinator`, JSONB `conditions`, `watchlist_id`, and `symbol_state` on `alert_definitions`. Cron evaluates up to two legs (price / indicator level / indicator cross) with AND/OR combinator edge detection. Indicator legs fetch candles server-side via `IndicatorPlugin.compute` (starter set: RSI, MACD, MA, EMA). Watchlist-scoped alerts resolve symbols from `user_watchlist_library` at eval time and fire per symbol with independent cooldown in `symbol_state`.

**Phase 4 (script conditions):** `ScriptManifest.alerts` (`edge-indicator-sdk-5`) declares named condition series. Armed alerts use `script_condition` legs; the chart posts boolean snapshots via `POST /api/me/alerts/[id]/snapshot`; shared cron reads `symbol_state` with a 5-minute freshness guard — **never** runs guest script on the server. Price/drawing/indicator alerts remain tab-closed reliable; script conditions may lag when no chart session is updating snapshots (v1 intentional).
