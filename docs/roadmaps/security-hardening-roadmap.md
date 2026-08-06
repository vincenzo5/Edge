# Security Hardening Roadmap

Close the High and Medium findings from the 2026-07-23 application security audit in a phased, fail-closed sequence — without pretending Edge is multi-tenant SaaS auth yet.

**Last updated:** 2026-07-23

**Status:** Phase 0 **Passing** (2026-07-23); Phase 1 **Passing** (2026-07-23); Phase 2 **Passing** (2026-07-24); Phase 3 **Passing** (2026-07-24); Phase 4 **Passing** (2026-07-24); Phase 5 **Passing** (2026-07-24); Phase 6 **Passing** (2026-07-24). Track complete. Phase 0 (Critical perimeter) is a hard prerequisite before High/Medium work. Complements [Trading Execution](./trading-execution-roadmap.md), [AI Agent](./ai-agent-roadmap.md), [Connections & Providers](./connections-providers-roadmap.md), and persistence auth notes in [CONSTRAINTS.md](../CONSTRAINTS.md).

**Related:** [Project Status](../PROJECT-STATUS.md), [AI Tools Architecture](../../src/lib/ai/ARCHITECTURE.md), [Persistence Architecture](../../src/lib/persistence/ARCHITECTURE.md), [Trading Architecture](../../src/lib/trading/ARCHITECTURE.md), [Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md), audit canvas `edge-security-audit.canvas.tsx`.

**Origin:** 2026-07-23 security audit (static code review). Critical findings (C1–C4) are in Phase 0; this track’s product phases focus on High (H1–H6) and Medium (M1–M6).

---

## Intent Classification

- **Primary:** Bugfix — current trust boundaries fail open or are spoofable; confirmation and diagnostics leak control to the caller.
- **Secondary:** Feature — server-issued confirmation tokens, session-bridge binding, CSP/HSTS, cookie lifetime controls; Testing — adversarial unit/integration coverage for auth bypass combinations.
- **Checklists applied:** `bugfix-planning-checklist.md`, `feature-planning-checklist.md`, `testing-verification-checklist.md`, `harness-status-checklist.md`, `architecture-review-checklist.md`.
- **Assumptions:**
  - Edge remains a **single-operator / trusted-LAN** product until a real identity system replaces the signed-cookie placeholder (`CONSTRAINTS.md`).
  - Fail closed in non-dev / when secrets are configured; keep a documented local-dev escape hatch that cannot silently apply in production builds.
  - WIP=1 — one phase Active at a time; quote actual command output in harness evidence.
  - Do not bundle Memory efficiency or unrelated polish into this track.
  - Critical Phase 0 must **Passing** before activating Phase 1+.

---

## Checklist Review

- **Architecture review:** **Required** — self-review, **Passed for roadmap**. Implementation phases touch middleware/API auth, AI execute/session contracts, trading identity, cron, pattern-library storage, persistence cookies, HTTP security headers, and TLS defaults. Each phase needs its own exit review.
- **Aligned:** Zod validation on many routes; AI registry permission modes; trading kill switch / preview freshness / LIVE string; `/api/me/*` user_id scoping; secrets ignored in git; cookie HttpOnly + SameSite=Lax; existing `apiAuth.test.ts` / MCP / trading validation tests.
- **Missing:** Fail-closed API key policy; proxy-safe client IP; server-issued confirmations; pattern ID allowlist; session-bridge ownership; cron/dev gates; CSP/HSTS; href scheme allowlist; composite tenant FKs; cookie iat/jti; production npm advisory closeout for Next middleware.
- **Misalignments:** `CONSTRAINTS.md` still says “use the dev session cookie auth boundary … (not production auth)” — correct for product stage, but this track must make that boundary **explicit and hard to misconfigure** when the process is reachable beyond localhost.
- **Risks:** Breaking local `npm run dev` / `dev:lite` if fail-closed is too aggressive; trading/AI UX friction from real confirmation tokens; CSP breaking inline chart/bootstrap scripts; Next upgrade side effects; proxy deployments that rely on today’s spoofable localhost trust.
- **Recommendations:** Ship Phase 0 first; keep env knobs documented in `.env.example`; prefer extending `apiAuth.ts`, `executeTool`, and existing cookie helpers over new frameworks; add adversarial tests (header spoof, confirm forgery, path traversal, bridge hijack) alongside each phase.

---

## Product goal

After this track:

1. Sensitive routes (**trading, brokerage, AI, recovery/warmup/health**) refuse unauthenticated callers when not in an explicit local-dev mode.
2. Localhost trust cannot be claimed via client-controlled forwarding headers.
3. Destructive AI/trading actions require **server-issued** confirmation (or equivalent user-bound proof), not a client boolean.
4. Pattern-library IDs cannot escape the records directory; unauthenticated global writes are denied when persistence is on.
5. Dev bootstrap, cron, and diagnostic endpoints do not silently run as the shared user without secrets.
6. The AI session bridge is bound to a session secret / browser owner.
7. Trading routes are not anonymous network surfaces once trading is enabled.
8. Medium hardening (tenant FK integrity, href schemes, CSP/HSTS, TLS defaults, cookie lifetime, prompt boundaries) lands without waiting for full OAuth/IdP.

### Success criteria (track-level)

- With `NODE_ENV=production` (or equivalent deploy profile), unset `EDGE_API_KEY` → sensitive routes return **401**, not 200.
- Spoofed `X-Forwarded-For: 127.0.0.1` does **not** bypass API key when trust-localhost is on unless the peer is a configured trusted proxy.
- `POST /api/ai/tools/execute` with `confirmed: true` alone cannot run destructive tools without a valid server token / session confirm.
- Pattern record IDs reject `../` and non-slug forms; public filesystem fallback does not write without auth when Postgres is configured.
- `/api/dev/*` and cron routes require secrets (or are compiled out of production).
- AI session poll/heartbeat/result require a bridge token bound to the registering client.
- `npm audit` production tree no longer flags the Next middleware-bypass range applicable to the pinned version.
- Medium items M1–M6 each have focused tests or config defaults recorded as Passing.

---

## Finding inventory

| ID | Severity | Finding | Target phase |
|----|----------|---------|--------------|
| C1 | Critical | Optional API auth on trading/AI | Phase 0 |
| C2 | Critical | Spoofable localhost via forwarding headers | Phase 0 |
| C3 | Critical | Caller-asserted AI `confirmed` / `permissionMode` | Phase 0 |
| C4 | Critical | Pattern-library path traversal + public FS writes | Phase 0 |
| H1 | High | Dev session auto-bootstrap without passphrase | Phase 1 |
| H3 | High | Public `/api/dev/local-errors` | Phase 1 |
| H4 | High | Cron secret optional → runs as dev user | Phase 1 |
| H5 | High | `next@16.2.9` middleware / DoS advisories | Phase 2 |
| H2 | High | Global unauthenticated AI session bridge | Phase 3 |
| H6 | High | Trading routes not bound to persistence identity | Phase 3 |
| M1 | Medium | Cross-tenant FK integrity gaps | Phase 4 |
| M2 | Medium | Notification `href` scheme not allowlisted | Phase 4 |
| M3 | Medium | No CSP / HSTS | Phase 5 |
| M4 | Medium | IBKR TLS verify off; optional sidecar secret | Phase 5 |
| M5 | Medium | Signed cookie: no iat/jti/rotation | Phase 6 |
| M6 | Medium | Prompt-injection surface (workspace → system prompt) | Phase 6 |

---

## Design principles

1. **Fail closed for money and tools** — trading, brokerage, and AI execute default deny when secrets/env are missing outside explicit local-dev.
2. **Never trust client IP headers alone** — only a configured proxy may inject forwarding headers.
3. **Confirmation is a server capability** — UI may request confirm; the server mints and validates short-lived tokens.
4. **Dev convenience is opt-in and loud** — passphrase / API key / cron secret absences are errors in deploy profiles, not silent success.
5. **Least privilege on filesystem** — IDs are allowlisted; paths are resolved then checked to stay under a root.
6. **Extend existing gates** — `apiAuth.ts`, `executeTool`, `withPersistenceAuth`, trading `validateOrder` — no parallel auth stack.
7. **Adversarial tests** — each phase adds at least one test that would have caught the original finding.
8. **WIP=1** — one phase Active; harness evidence before Passing.

---

## Proposed Plan

### Phase 0 — Critical perimeter (prerequisite)

**Outcome:** Deploy/LAN exposure cannot place orders, forge AI confirms, or traverse pattern storage via the audit’s C1–C4 paths.

**Scope:**

| ID | Work |
|----|------|
| C1 | Fail closed: require `EDGE_API_KEY` for sensitive prefixes unless `EDGE_API_AUTH_MODE=dev-open` (or equivalent) **and** non-production. Document in `.env.example`. |
| C2 | Compute client IP from the socket / trusted proxy list only; ignore client-supplied `X-Forwarded-For` unless `EDGE_TRUSTED_PROXY_COUNT` (or similar) is set. Default trust-localhost uses loopback peer, not header spoof. |
| C3 | Destructive tools: server mints confirmation challenge; execute accepts `confirmationToken` (HMAC or store-backed), not bare `confirmed: true`. In-app orchestrator obtains token after UI confirm. MCP documents the same token flow. |
| C4 | Pattern IDs: UUID or `[a-zA-Z0-9_-]{1,64}` only; `path.resolve` + root prefix check; when Postgres enabled, unauthenticated global pattern write/read falls back must **401**, not filesystem. |

**Files (expected):** `src/lib/api/apiAuth.ts`, `src/middleware.ts`, `packages/ai-tools-core` / `src/lib/ai/adapters/execute*`, `src/app/api/ai/tools/execute/route.ts`, `src/app/api/ai/session/execute/route.ts`, `src/lib/patternLibrary/types.ts`, `src/lib/patternLibrary/storage.ts`, `src/lib/patternLibrary/patternLibraryStore.ts`, `.env.example`, focused tests, architecture/CONSTRAINTS notes.

**Exit evidence:**

- Focused: adversarial tests for header spoof, missing API key, confirm forgery, `../` pattern IDs.
- Build: `npm run build` (or packages + app compile) when middleware/contracts change.
- Architecture review: self-review Passed; update `CONSTRAINTS.md` Security section with fail-closed rules.

**State:** Passing (2026-07-23)

---

### Phase 1 — Operator secrets & diagnostics (H1, H3, H4)

**Outcome:** Bootstrap, cron, and local error logs cannot be used anonymously to become the shared user or exfiltrate stacks.

**Scope:**

| ID | Work |
|----|------|
| H1 | When persistence is enabled, require `EDGE_DEV_PASSPHRASE` (or documented `EDGE_ALLOW_OPEN_DEV_SESSION=1` only in development). Remove silent `ensurePersistenceSession` bootstrap in deploy profiles. **Superseded for single-user local container prod (2026-07-30):** local prod requires `EDGE_ALLOW_OPEN_DEV_SESSION=1` and forbids `EDGE_DEV_PASSPHRASE`; deploy preflight enforces both. |
| H3 | Gate `GET`/`POST` `/api/dev/local-errors` behind API key, passphrase, or `NODE_ENV !== "production"` + localhost peer. Prefer 404 in production builds. |
| H4 | Require `EDGE_CRON_SECRET` (Bearer / header) for all `/api/cron/*`; refuse with 401 when unset outside explicit dev-open mode. Do not map anonymous cron to the shared user. |

**Files (expected):** `src/lib/persistence/auth/devSession.ts`, `src/app/api/auth/dev-session/route.ts`, `src/app/api/dev/local-errors/route.ts`, `src/app/api/cron/*/route.ts`, `.env.example`, tests.

**Exit evidence:** Focused route tests (401 without secret; bootstrap blocked); architecture note in persistence ARCHITECTURE.

**State:** Passing (2026-07-23)

---

### Phase 2 — Next.js advisory closeout (H5)

**Outcome:** Production dependency tree is off the known Next middleware-bypass / related advisory range that applies to the pinned version.

**Scope:**

| ID | Work |
|----|------|
| H5 | Upgrade `next` to **≥ 16.2.11** (or current patched release at execution time). Re-run `npm audit --omit=dev`. Fix any breakages in middleware / App Router behavior. Triage remaining high vulns (sharp/postcss/undici) — patch or document accept/risk. |

**Files (expected):** `package.json`, `package-lock.json`, middleware smoke tests, brief note in Session Log / this roadmap.

**Exit evidence:** `npm ls next` shows patched version; focused `middleware.test.ts` + `apiAuth.test.ts` still pass; `npm run build` exit 0.

**State:** Passing (2026-07-24)

**Audit triage (2026-07-24):** Next middleware-bypass (H5) cleared at `16.2.11`. Residual production High: `postcss`/`sharp` (Next transitive — await upstream); `undici` via `@cursor/sdk` (no fix — accept/defer). Safe `npm audit fix` applied for `fast-uri`/`hono`.

---

### Phase 3 — AI bridge & trading identity (H2, H6)

**Outcome:** Session tools and order APIs are bound to an authenticated owner, not the open network.

**Scope:**

| ID | Work |
|----|------|
| H2 | AI session bridge: register returns a high-entropy `bridgeSecret`; heartbeat/poll/result/execute require it (header or body). Reject global hijack when another client registers. Optionally bind to persistence user when cookie present. |
| H6 | Trading/brokerage sensitive routes: after Phase 0 API key, additionally require persistence session (or explicit service principal) for mutating order endpoints. Keep read-only status behind API key at minimum. Align paper vs live confirmation policy (document; prefer same confirm token pattern as Phase 0 for live). |

**Files (expected):** `src/lib/ai/sessionBridgeStore.ts`, `src/app/api/ai/session/*/route.ts`, trading/brokerage route helpers, `src/lib/trading/*`, MCP adapter docs, tests.

**Exit evidence:** Focused bridge hijack tests; trading mutate without session → 401/403; architecture updates for AI + trading.

**State:** Passing (2026-07-24)

---

### Phase 4 — Tenant integrity & link safety (M1, M2)

**Outcome:** Known cross-user FK corruption paths and unsafe notification navigations are closed.

**Scope:**

| ID | Work |
|----|------|
| M1 | Validate ownership on create/update for `market_research_notes.chart_workspace_id`, journal snapshot `screenshotId`, and alert→notification links (same `user_id`). Prefer app-layer checks now; composite FKs only if migration cost is justified. |
| M2 | Allowlist notification `href` to `http:`, `https:`, and app-relative `/…` paths; reject `javascript:`, `data:`, etc. Apply same pattern anywhere user/upstream URLs become `<a href>`. |

**Files (expected):** research/journal/alert repositories + schemas, `NotificationBellMenu.tsx`, `notifications` schema, tests.

**Exit evidence:** Focused ownership + href validation tests; persistence ARCHITECTURE note.

**State:** Passing (2026-07-24)

---

### Phase 5 — Transport defaults & HTTP headers (M3, M4)

**Outcome:** Browser and broker TLS posture matches “secure by default” for deploy profiles.

**Scope:**

| ID | Work |
|----|------|
| M3 | Add Content-Security-Policy (start report-only if needed, then enforce) and HSTS for production HTTPS deploys in `next.config.mjs`. Keep existing frame/MIME/referrer/permissions headers. Document CSP exceptions for chart/bootstrap. |
| M4 | Default `IBKR_SSL_VERIFY=true` in `.env.example` and code path; require `TWS_SIDECAR_SECRET` when sidecar URL is non-loopback. Document loopback-only plaintext exception. |

**Files (expected):** `next.config.mjs`, IBKR client, `sidecarAuth.ts`, `.env.example`, market-data ARCHITECTURE.

**Exit evidence:** Header snapshot test or config assertion; TLS default unit test; manual note if CSP needs report-only soak.

**State:** Passing (2026-07-24)

---

### Phase 6 — Session lifetime & prompt boundaries (M5, M6)

**Outcome:** Stolen cookies age out; model context is harder to abuse for privilege escalation within tool permissions.

**Scope:**

| ID | Work |
|----|------|
| M5 | Extend signed cookie payload with `iat` (and optional `jti`); enforce max age server-side (e.g. 7–30 days, shorter than 1-year browser Max-Age or match Max-Age to server TTL). Document secret rotation = global logout. |
| M6 | Harden prompt assembly: stricter workspace snapshot sanitization/size; separate untrusted user content from system instructions; cap chat message count/bytes sent to OpenRouter; keep tool permission checks as the hard boundary (document residual LLM risk). |

**Files (expected):** `signedCookieCore.ts`, `getCurrentUser.ts`, `orchestrate.ts` / contracts, AI ARCHITECTURE, tests.

**Exit evidence:** Cookie expiry/reject tests; prompt size/sanitization tests; architecture notes on residual prompt-injection risk.

**State:** Passing (2026-07-24)

---

## Out of scope (this track)

- Full OAuth / OIDC / multi-user production IdP (future identity track).
- Broker-side IB Gateway hardening beyond app defaults (VNC, Gateway `READ_ONLY_API`, digest-pin Docker images) — note in Connections/Dual-connection ops.
- Live red-team / pentest engagement.
- Rewriting the AI permission model beyond confirmation + bridge binding.
- Closing every transitive npm advisory unrelated to Next middleware / direct runtime RCE.

---

## Verification Plan

| Tier | When |
|------|------|
| **Focused** | Every phase — adversarial Vitest for the findings closed that phase (`apiAuth`, middleware, AI execute, pattern storage, cron, bridge, trading mutate, href, cookies, prompts). |
| **Build** | Phases 0, 2, 5 (middleware / Next / headers); any phase that changes public API contracts. |
| **App-level** | Phase 0: place_order / destructive tool still works via UI confirm path; Phase 3: copilot session tools still poll; Phase 5: CSP does not blank the workspace (spot check). |
| **Full** | After Phase 0 and after Phase 3 (cross-cutting auth); optional `npm run check` before calling the track complete. |

---

## Harness Update

When this track is activated under WIP=1:

1. Pause or finish the current Active Work row (do not run Security in parallel).
2. Add Active Work row: `Security hardening — Phase N` with Behavior / State / Completion evidence / Files per phase exit criteria.
3. Create **Task Contract — Security hardening** (Status, Goal, Delivered, Verification, Blockers).
4. Append Session Log on each phase closeout with quoted test/build output.
5. Update this roadmap phase **State** to Passing and refresh [roadmaps/README.md](./README.md) status line.
6. On Phase 0 closeout, extend [CONSTRAINTS.md](../CONSTRAINTS.md) Security section with fail-closed API/confirm/pattern rules.
7. When the track completes, set Current Verified State next step away from Security unless follow-on identity work is scheduled.

**Initial harness note (roadmap only, 2026-07-23):** Track indexed as **Pending**; Memory efficiency remains the product WIP. Do not mark Security Active until Phase 0 is deliberately started.

---

## Suggested schedule (single operator)

| Order | Phase | Est. effort | Depends on |
|------:|-------|-------------|------------|
| 1 | Phase 0 — Critical perimeter | 1–2 days | — |
| 2 | Phase 1 — Operator secrets | 0.5–1 day | Phase 0 |
| 3 | Phase 2 — Next upgrade | 0.5 day | Phase 0 (safer after auth tests exist) |
| 4 | Phase 3 — Bridge + trading identity | 1–2 days | Phase 0 |
| 5 | Phase 4 — Tenant + href | 0.5–1 day | Phase 1 (session assumptions) |
| 6 | Phase 5 — Headers + TLS | 0.5–1 day | Phase 2 preferred (Next headers) |
| 7 | Phase 6 — Cookie + prompts | 1 day | Phase 3 (AI contracts stable) |

Phases 2 and 4 may swap if a Next security release is urgent; do not skip Phase 0.

---

## Phase checklist (copy into Active Work)

```text
[x] Phase 0 Critical perimeter (C1–C4)
[x] Phase 1 Operator secrets & diagnostics (H1, H3, H4)
[x] Phase 2 Next.js advisory closeout (H5)
[x] Phase 3 AI bridge & trading identity (H2, H6)
[x] Phase 4 Tenant integrity & link safety (M1, M2)
[x] Phase 5 Transport defaults & HTTP headers (M3, M4)
[x] Phase 6 Session lifetime & prompt boundaries (M5, M6)
```
