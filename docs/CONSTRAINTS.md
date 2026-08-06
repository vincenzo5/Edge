# Repository Constraints

Hard rules for humans and agents. Violations cause bugs, security issues, or agent failures.

## Adding Constraints

When adding a new constraint that is not self-evident, include brief provenance in the same PR:

- **Source** — why the rule exists (bug, security finding, architecture decision)
- **Applies when** — which tasks or areas must follow it
- **Remove when** — what would make the rule obsolete

Prefer encoding one-off lessons as tests instead of permanent narrative constraints. Do not add global rules to [AGENTS.md](../AGENTS.md) when a topic doc or scoped Cursor rule is sufficient.

## Chart Engine

- **MUST** use the custom Edge canvas engine in `src/lib/chart/` for all chart rendering and interaction.
- **MUST NOT** reintroduce klinecharts or embed TradingView Charting Library.
- **MUST** register new indicators and drawings through the plugin registries (`indicators/registry.ts`, `drawings/registry.ts`).
- **MUST NOT** trigger React re-renders on every wheel/pan tick — viewport updates stay imperative via pane handles.
- **MUST** persist drawing changes through `DrawingStore` commands (undo/redo depends on this).

## AI Tools

- **MUST** route all AI capabilities through the shared tool registry in `src/lib/ai/`.
- **MUST NOT** let tools import React or mutate component state directly — use `ToolContext` facades.
- **MUST** validate all tool inputs with Zod schemas before execution.
- **MUST** require explicit confirmation for destructive tools (`delete_drawing`, `clear_watchlist`, `delete_watchlist`, `remove_research_card`, `place_order`, `attach_playbook`).
- **MUST** document linked-layout propagation when tools mutate symbol/range/interval.

## Persistence

- **MUST** use optimistic concurrency (`baseRevision`) for remote writes.
- **MUST NOT** commit `DATABASE_URL`, `EDGE_AUTH_SECRET`, or `.env.local`.
- **MUST** treat persistence as optional — app must work with localStorage-only when Postgres is unavailable.

## Design System

- **MUST** use `--edge-*` CSS variables, `Edge*` primitives (`src/app/components/design-system/`), or helpers from `styles.ts` for app UI chrome in `src/app/components/`.
- **MUST** keep `src/lib/design-system/edge.ts` and `src/app/globals.css` token values in sync — `edge.test.ts` enforces this.
- **MUST** update `edgeChartColors` / `packages/chart-core/src/themeTokens.ts` when changing chart-surface colors that appear on both DOM and canvas.
- **MUST NOT** use ad-hoc Tailwind palette classes (`gray-*`, `blue-*`, `red-*`) or hardcoded hex colors in new app chrome — use semantic Edge tokens.
- **MUST NOT** mix landing-page brand tokens (see `public/brand/BRAND.md`) into in-app chart platform chrome.

*Applies when:* building or restyling toolbars, sidebars, menus, modals, panels, or other React UI in `src/app/components/`. *Source:* Edge design system rollout and TradingView visual parity pass. *Remove when:* superseded by a different token system with equivalent enforcement.

## API Routes

- **MUST** validate request bodies with existing Zod schemas in route handlers.
- **MUST NOT** expose internal error details in production responses.

## Documentation

- **MUST** update the closest architecture or status doc when changing shared behavior (see [AGENTS.md](../AGENTS.md)).
- **MUST NOT** create duplicate docs with suffixes like `_fixed`, `_new`, `_clean`.
- **MUST** keep `docs/chart/features.md` rows accurate when shipping or changing chart features.

## Security

- **MUST** add sensitive files to `.gitignore`.
- **MUST NOT** commit API keys, secrets, or credentials.
- **MUST** use the dev session cookie auth boundary for persistence routes (not production auth).
- **MUST** fail closed on sensitive API prefixes (`/api/trading`, `/api/brokerage`, `/api/ai`, recovery/warmup/health) when `EDGE_API_KEY` is unset unless `EDGE_API_AUTH_MODE=dev-open` and `NODE_ENV !== "production"`.
- **MUST NOT** treat client-supplied `X-Forwarded-For` / `X-Real-IP` as the client IP unless `EDGE_TRUSTED_PROXY_COUNT` is set; localhost trust uses loopback peer IP only.
- **MUST NOT** execute destructive or `requiresConfirmation` AI tools from bare caller `confirmed: true`; require server-minted `confirmationToken` (HMAC via `EDGE_AUTH_SECRET`) or server-validated session-bridge execution.
- **MUST** validate pattern-library IDs as UUID or `[a-zA-Z0-9_-]{1,64}` and keep filesystem paths under `data/pattern-library/records/`; when Postgres is configured, unauthenticated public pattern-library routes **MUST** return **401**, not filesystem fallback.
- **MUST NOT** auto-bootstrap a signed dev session unless `EDGE_ALLOW_OPEN_DEV_SESSION=1` (or `true`) and `EDGE_DEV_PASSPHRASE` is unset, or the caller provides a valid `EDGE_DEV_PASSPHRASE` via `POST /api/auth/dev-session`.
- **MUST** return **404** for `/api/dev/local-errors` in production; non-production access requires loopback peer or valid `EDGE_API_KEY`.
- **MUST NOT** map anonymous `/api/cron/*` requests to the shared dev user; require `EDGE_CRON_SECRET` header/Bearer or an authenticated session cookie.
- **MUST** mint a high-entropy `bridgeSecret` on AI session bridge registration; require `X-Edge-Bridge-Secret` (or body `bridgeSecret`) on `/api/ai/session/poll` and `/api/ai/session/result`; reject heartbeat hijack without matching secret (**409**); `/api/ai/session/execute` accepts matching bridge secret **or** valid API key (MCP/service).
- **MUST** require persistence session cookie (or `EDGE_TRADING_SERVICE_SECRET` header/Bearer) for mutating `/api/trading/*` order routes when Postgres is configured; read-only brokerage/status routes remain API-key-only; when persistence is disabled (`dev:lite`), API key alone is sufficient for paper mutations.
- **MUST** validate same-user ownership before linking foreign keys: research-note `chartWorkspaceId`, journal snapshot `screenshotId`, alert trigger `notificationId` (app-layer checks via existing scoped getters).
- **MUST** allowlist notification and UI link `href` values to `http:`, `https:`, and app-relative `/…` paths only; reject `javascript:`, `data:`, protocol-relative `//…`, and other schemes at schema/emit/render boundaries.
- **MUST** send enforced `Content-Security-Policy` on app routes via Next headers; document residual exceptions (`unsafe-inline` for Next/theme bootstrap, `wasm-unsafe-eval` for indicator QuickJS, `blob:` for snapshots/workers; **dev-only** `unsafe-eval` for React/Next call-stack reconstruction). **MUST** send `Strict-Transport-Security` only when `NODE_ENV=production`.
- **MUST** default `IBKR_SSL_VERIFY` to on (TLS certificate verification); set `IBKR_SSL_VERIFY=false` only for local self-signed IBKR Gateway certs.
- **MUST** require `TWS_SIDECAR_SECRET` when `TWS_SIDECAR_URL` hostname is not loopback (`127.0.0.1`, `localhost`, `::1`); loopback plaintext HTTP remains the default local exception.
- **MUST** enforce server-side max age on signed persistence session cookies (`iat` + optional `jti`; browser `Max-Age` matches server TTL, currently 14 days); reject legacy unsigned or expired cookies.
- **MUST** treat rotating `EDGE_AUTH_SECRET` as global logout for all signed session cookies.
- **MUST** keep untrusted workspace snapshots out of the Copilot system prompt; strip client-supplied `system` chat roles at orchestration; tool permission checks and confirmation tokens remain the hard boundary for destructive actions (prompt isolation reduces but does not eliminate LLM social-engineering risk).

## Observability

*Applies when:* production ops surfaces (probes, structured logs, durable audit/errors, alerts) or extending `src/lib/observability/`. *Source:* [Production Observability Roadmap](./roadmaps/production-observability-roadmap.md) free-stack track. *Remove when:* superseded by an equivalent enforced contract.

- **MUST NOT** add paid observability SaaS (Sentry, Datadog, PagerDuty, paid OTel backends, etc.) as **required** dependencies for production ops in this repo.
- **MUST** reuse `redactDiagnostic` / `safeErrorResponse` on ops surfaces; never log or persist tool args, tokens, IB account IDs, or raw provider payloads.
- **MUST** keep `/healthz` and `/readyz` cheap and secret-free in JSON responses when implemented — no connection strings, stacks, or internal URLs in probe bodies.

## Testing

- **MUST** add or update tests for new behavior in the same change.
- **MUST** run focused tests for the changed area before marking work complete.
- **SHOULD** run `npm test -- --run` and `npm run build` before merging architectural changes.
