# Security Invariant Ledger

Maps every Security-section **MUST** in [CONSTRAINTS.md](../CONSTRAINTS.md) (plus security-adjacent Observability MUSTs) to an **owning lane** and **pinning test or doc**. Constraint text stays in CONSTRAINTS — this file is the ownership index.

**Lamination:** each core lane pack (Phase 2) lists ledger ids it owns under **Security pins**. Lanes run their pins as sensors during execute; no permanent SECURITY peer branch.

**Campaign mode:** temporary audit or hardening sprints may load multiple lane packs plus this ledger. Campaigns are time-boxed and documented in [README.md](./README.md). Full campaign protocol lands in Sub-Harness Phase 4.

**Status:** Phase 0 skeleton — `owning lane` and `pinning test or doc` are stubs until Phase 4 fill.

| id | CONSTRAINT anchor | owning lane | pinning test or doc | status |
|----|-------------------|-------------|---------------------|--------|
| SEC-01 | **MUST** add sensitive files to `.gitignore` | TBD | TBD | stub |
| SEC-02 | **MUST NOT** commit API keys, secrets, or credentials | TBD | TBD | stub |
| SEC-03 | **MUST** use the dev session cookie auth boundary for persistence routes (not production auth) | TBD | TBD | stub |
| SEC-04 | **MUST** fail closed on sensitive API prefixes (`/api/trading`, `/api/brokerage`, `/api/ai`, recovery/warmup/health) when `EDGE_API_KEY` is unset unless `EDGE_API_AUTH_MODE=dev-open` and `NODE_ENV !== "production"` | TBD | TBD | stub |
| SEC-05 | **MUST NOT** treat client-supplied `X-Forwarded-For` / `X-Real-IP` as the client IP unless `EDGE_TRUSTED_PROXY_COUNT` is set; localhost trust uses loopback peer IP only | TBD | TBD | stub |
| SEC-06 | **MUST NOT** execute destructive or `requiresConfirmation` AI tools from bare caller `confirmed: true`; require server-minted `confirmationToken` (HMAC via `EDGE_AUTH_SECRET`) or server-validated session-bridge execution | TBD | TBD | stub |
| SEC-07 | **MUST** validate pattern-library IDs as UUID or `[a-zA-Z0-9_-]{1,64}` and keep filesystem paths under `data/pattern-library/records/`; when Postgres is configured, unauthenticated public pattern-library routes **MUST** return **401**, not filesystem fallback | TBD | TBD | stub |
| SEC-08 | **MUST NOT** auto-bootstrap a signed dev session unless `EDGE_ALLOW_OPEN_DEV_SESSION=1` (or `true`) **and** `NODE_ENV !== "production"`, or the caller provides a valid `EDGE_DEV_PASSPHRASE` via `POST /api/auth/dev-session` | TBD | TBD | stub |
| SEC-09 | **MUST** return **404** for `/api/dev/local-errors` in production; non-production access requires loopback peer or valid `EDGE_API_KEY` | TBD | TBD | stub |
| SEC-10 | **MUST NOT** map anonymous `/api/cron/*` requests to the shared dev user; require `EDGE_CRON_SECRET` header/Bearer or an authenticated session cookie | TBD | TBD | stub |
| SEC-11 | **MUST** mint a high-entropy `bridgeSecret` on AI session bridge registration; require `X-Edge-Bridge-Secret` (or body `bridgeSecret`) on `/api/ai/session/poll` and `/api/ai/session/result`; reject heartbeat hijack without matching secret (**409**); `/api/ai/session/execute` accepts matching bridge secret **or** valid API key (MCP/service) | TBD | TBD | stub |
| SEC-12 | **MUST** require persistence session cookie (or `EDGE_TRADING_SERVICE_SECRET` header/Bearer) for mutating `/api/trading/*` order routes when Postgres is configured; read-only brokerage/status routes remain API-key-only; when persistence is disabled (`dev:lite`), API key alone is sufficient for paper mutations | TBD | TBD | stub |
| SEC-13 | **MUST** validate same-user ownership before linking foreign keys: research-note `chartWorkspaceId`, journal snapshot `screenshotId`, alert trigger `notificationId` (app-layer checks via existing scoped getters) | TBD | TBD | stub |
| SEC-14 | **MUST** allowlist notification and UI link `href` values to `http:`, `https:`, and app-relative `/…` paths only; reject `javascript:`, `data:`, protocol-relative `//…`, and other schemes at schema/emit/render boundaries | TBD | TBD | stub |
| SEC-15 | **MUST** send enforced `Content-Security-Policy` on app routes via Next headers; document residual exceptions (`unsafe-inline` for Next/theme bootstrap, `wasm-unsafe-eval` for indicator QuickJS, `blob:` for snapshots/workers; **dev-only** `unsafe-eval` for React/Next call-stack reconstruction). **MUST** send `Strict-Transport-Security` only when `NODE_ENV=production` | TBD | TBD | stub |
| SEC-16 | **MUST** default `IBKR_SSL_VERIFY` to on (TLS certificate verification); set `IBKR_SSL_VERIFY=false` only for local self-signed IBKR Gateway certs | TBD | TBD | stub |
| SEC-17 | **MUST** require `TWS_SIDECAR_SECRET` when `TWS_SIDECAR_URL` hostname is not loopback (`127.0.0.1`, `localhost`, `::1`); loopback plaintext HTTP remains the default local exception | TBD | TBD | stub |
| SEC-18 | **MUST** enforce server-side max age on signed persistence session cookies (`iat` + optional `jti`; browser `Max-Age` matches server TTL, currently 14 days); reject legacy unsigned or expired cookies | TBD | TBD | stub |
| SEC-19 | **MUST** treat rotating `EDGE_AUTH_SECRET` as global logout for all signed session cookies | TBD | TBD | stub |
| SEC-20 | **MUST** keep untrusted workspace snapshots out of the Copilot system prompt; strip client-supplied `system` chat roles at orchestration; tool permission checks and confirmation tokens remain the hard boundary for destructive actions (prompt isolation reduces but does not eliminate LLM social-engineering risk) | TBD | TBD | stub |
| SEC-21 | **MUST NOT** add paid observability SaaS (Sentry, Datadog, PagerDuty, paid OTel backends, etc.) as **required** dependencies for production ops in this repo (Observability section) | TBD | TBD | stub |
| SEC-22 | **MUST** reuse `redactDiagnostic` / `safeErrorResponse` on ops surfaces; never log or persist tool args, tokens, IB account IDs, or raw provider payloads (Observability section) | TBD | TBD | stub |
| SEC-23 | **MUST** keep `/healthz` and `/readyz` cheap and secret-free in JSON responses when implemented — no connection strings, stacks, or internal URLs in probe bodies (Observability section) | TBD | TBD | stub |
