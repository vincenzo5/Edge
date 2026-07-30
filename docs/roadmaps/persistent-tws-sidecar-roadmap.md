# Persistent TWS Sidecar Roadmap

Make the TWS sidecar always-on with the IB Gateway stack: one Edge-owned Docker
service beside paper/live Gateways, shared by host `npm run dev` and container
`app-prod`, without baking Python into the third-party Gateway image.

**Last updated:** 2026-07-30

**Status:** Phase 0 **Passing** (2026-07-30). Phase 1 **Passing** (2026-07-30). Phase 2 **Passing** (2026-07-30). Phases 3–5 **Pending**.

**Origin:** 2026-07-30 operator pain (Gateways up, sidecar down / forgotten) +
architecture consult (GPT 5.6: Compose sidecar; Opus: LaunchAgent). Parent
synthesis chose Compose as the durable end state.

**Related:** [Dual Connection](./dual-connection-roadmap.md),
[TWS Sidecar Architecture Refactor](./tws-sidecar-refactor-roadmap.md) (package
layout complete — this track owns lifecycle/topology),
[Local Production Containerization](./local-production-containerization-roadmap.md)
(supersedes its “do not containerize sidecar” exclusion for this service only),
[Connections & Providers](./connections-providers-roadmap.md),
[Market Data Architecture](../../src/lib/marketData/ARCHITECTURE.md),
[Trading Architecture](../../src/lib/trading/ARCHITECTURE.md),
[Project Status](../PROJECT-STATUS.md),
[Repository Constraints](../CONSTRAINTS.md).

---

## Intent Classification

- **Primary:** Operations — broker-stack lifecycle so Gateways up ⇒ sidecar up.
- **Secondary:** Feature (config: bind + per-connection hosts); Bug fix (latent
  `127.0.0.1` bind vs `host.docker.internal` risk); Reliability (wedge self-exit).
- **Branch:** **OPS** (primary) · **DATA** / **LIVE** (secondary — TWS as
  connection + order path consumers).
- **Architecture review:** **Required** — self-review each phase; Phase 2 Compose
  networking and Phase 4 dual-consumer cutover are load-bearing.
- **Assumptions:**
  - One dual-socket sidecar still owns `ib-paper` + `ib-live` (existing client IDs).
  - Both Next processes stay `TWS_MANAGED=external` (app never owns sidecar lifecycle).
  - Gateways remain `ghcr.io/gnzsnz/ib-gateway:stable` — Edge does not fork that image.
  - WIP=1 — one phase Active at a time; quote command output in harness evidence.
  - LaunchAgent is explicitly **not** the v1 supervisor (optional interim only if
    Compose is blocked).

---

## Checklist Review

- **Missing:** Sidecar restart policy; Compose service; Edge-owned image; per-socket
  host/port for compose DNS; configurable HTTP bind; wedge → process exit for Docker
  restart; operator path that starts sidecar with Gateways.
- **Misalignment:** ARCHITECTURE “shared host sidecar” + containerization track
  “do not containerize sidecar” assumed operator `npm run tws:sidecar`; Gateways
  have `restart: unless-stopped`, sidecar has none → persistent “Sidecar unreachable.”
- **Risks:**
  - Container networking: host ports `4001`/`4002` ≠ internal `4003`/`4004`.
  - Loopback-only uvicorn bind may break `app-prod → host.docker.internal:8765`.
  - Healthcheck that requires Gateway login causes restart loops during 2FA/Sunday cold restart.
  - Host and container sidecars competing for `:8765`.
  - Shared secret drift across sidecar / `.env.local` / `production.env`.
  - Wedged-but-alive process never exits → Docker never restarts.
- **Decisions:**
  - Dedicated `tws-sidecar` service in `services/ib-gateway/docker-compose.yml`.
  - Immutable tag `edge-tws-sidecar:<git-sha>`; promote/rebuild explicit (not tied to `app-prod` deploy).
  - Publish `127.0.0.1:8765:8765`; bind `0.0.0.0` inside container; require `TWS_SIDECAR_SECRET`.
  - Per-connection env: paper → `ib-gateway-paper:4004`, live → `ib-gateway-live:4003`.
  - `/health` liveness only (process up); Gateway session readiness stays sidecar `/status` + app health.
  - Host `scripts/tws-sidecar.sh` remains emergency/fallback, not normal ops.
  - Reject: Python in Gateway image; Next spawn in prod; one sidecar per Gateway; LaunchAgent as v1.

---

## Product goal

After this track:

1. `npm run ib:gateway:up` starts live Gateway + paper Gateway + sidecar.
2. Sidecar survives crash and host reboot via Docker restart policy.
3. Hosts that are alive-but-wedged self-exit so Docker can restart them.
4. Host `npm run dev` and container `app-prod` both use the same `:8765` service
   (`127.0.0.1` vs `host.docker.internal`) with the same secret.
5. Gateway soft/cold restart still reconnects via existing sidecar supervisor —
   without restarting the sidecar container as part of Gateway restart.
6. Docs and ops commands no longer instruct “remember to start the sidecar”
   as the primary path.

### Success criteria (track-level)

- With Gateways compose up, `curl 127.0.0.1:8765/health` succeeds without a
  separate host Python process.
- Killing the sidecar container (or process inside it) results in automatic
  restart and restored `/health` without manual `npm run tws:sidecar`.
- From `app-prod`, authenticated reachability to the sidecar is proven
  (`host.docker.internal:8765`).
- When both Gateways are logged in, sidecar reports both sockets connected
  (existing dual-connection semantics unchanged).
- Forced wedge (or simulated `workerWedged`) causes process exit and container
  restart within the throttle window.
- Architecture docs describe Compose ownership; “no Docker Compose for sidecar”
  is superseded.

---

## End-state topology

```text
macOS host
├── next dev → 127.0.0.1:3003
│     TWS_MANAGED=external
│     TWS_SIDECAR_URL=http://127.0.0.1:8765
└── Docker
    ├── app-prod → 127.0.0.1:3000
    │     TWS_MANAGED=external
    │     TWS_SIDECAR_URL=http://host.docker.internal:8765
    └── Compose project: ib-gateway (or edge broker stack)
        ├── ib-gateway-live   (4001→4003, VNC 5901)
        ├── ib-gateway-paper  (4002→4004, VNC 5902)
        └── tws-sidecar       (127.0.0.1:8765→8765)
              ├── ib-paper → ib-gateway-paper:4004
              └── ib-live  → ib-gateway-live:4003
```

| Concern | Contract |
|---------|----------|
| Sidecar ownership | Docker Compose (`restart: unless-stopped`) |
| App ownership | Never — `TWS_MANAGED=external` only |
| HTTP surface | Unchanged paths/bodies; freeze for Next clients |
| Secret | Same `TWS_SIDECAR_SECRET` for sidecar + both apps |
| Host script | Emergency/fallback only |
| Image promote | Explicit rebuild/restart with Gateway ops |

---

## Non-goals

| Item | Why |
|------|-----|
| Bake Python into `ib-gateway` image | Couples Edge to IB login/2FA/soft-cold restart; forks third-party image |
| Next/`TWS_MANAGED=local` ownership in prod | Breaks container TWS boundary; two apps fight for `:8765` |
| One sidecar per Gateway | Duplicate HTTP + clientId / routing drift |
| LaunchAgent as primary v1 supervisor | Does not couple “Gateways up ⇒ sidecar up”; Mac-only |
| Changing paper/live client ID scheme | Dual-connection contract stays |
| HTTP path/body renames | Behavior-preserving lifecycle track |
| Sidecar → Postgres | Still not a persistence owner |
| Kubernetes / cloud broker hosting | Local Docker only |

---

## Current baseline

| Piece | Assessment |
|-------|------------|
| Dual Gateway compose | Shipped (`services/ib-gateway/docker-compose.yml`) |
| Dual-socket sidecar code | Shipped (`connectionId` + client IDs) |
| Shared host sidecar ops | Manual `npm run tws:sidecar`; often down |
| `TWS_MANAGED=external` + secret | Shipped for concurrent dev/prod |
| Package layout | Refactor track Phases 0–7 **Passing** |
| Reconnect supervisor | Shipped for Gateway daily soft restart |
| uvicorn bind | Hardcoded `127.0.0.1` — risk for container consumers |
| Single `TWS_HOST` | Insufficient for two compose service DNS names |

---

## Gap inventory

| Priority | Gap | Target phase |
|----------|-----|--------------|
| P0 | No restart policy / forgotten process | 2 |
| P0 | Contract freeze + supersede host-only docs | 0 |
| P0 | Bind + per-connection host/port config | 1 |
| P0 | Edge-owned image | 1 |
| P0 | Compose service + publish `:8765` | 2 |
| P1 | Wedge/self-exit for Docker restart | 3 |
| P1 | Dual-consumer cutover proof (dev + app-prod) | 4 |
| P1 | Ops commands / ARCHITECTURE / roadmap sync | 5 |
| P2 | Optional LaunchAgent interim | Skip unless Compose blocked |

---

## Phases

### Phase 0 — Contract freeze

**Band:** Now (docs + env contract)  
**Status:** **Passing** (2026-07-30)

**Outcome:** One written topology replacing “operator-owned host sidecar” as the
primary model; config matrix and anti-goals frozen before code.

| Work item | Scope |
|-----------|--------|
| Topology decision | Compose sidecar beside both Gateways; apps remain external clients |
| Env matrix | Document paper/live host+port, bind, secret, `TWS_MANAGED=external` for both apps |
| Supersede | Point ARCHITECTURE + dual-connection + containerization exclusion at this track |
| Bind verification note | Record need to prove `app-prod → host.docker.internal:8765` (current loopback bind risk) |
| Ops commands | Sketch `ib:gateway:up` includes sidecar; host script = fallback |

**Out of scope:** Dockerfile, Compose service, runtime watchdog.

**Verification:** Docs cross-links resolve; `npm run roadmaps:status-check` (or equivalent) accepts new track row; harness/status row optional until Phase 1 Active.

**Gate — Phase 0 Passing:** This roadmap Phase 0 marked Passing with quoted doc sync; no runtime required.

#### Phase 0 contract (frozen)

**Topology:** One `tws-sidecar` Compose service in the IB Gateway stack (`services/ib-gateway/docker-compose.yml`), `restart: unless-stopped`, published `127.0.0.1:8765:8765`. Both Next processes remain `TWS_MANAGED=external` — they never spawn, kill, or restart the sidecar.

**Consumer env (both apps):**

| Variable | Dev (`npm run dev`) | Container prod (`app-prod`) |
|----------|---------------------|-----------------------------|
| `TWS_MANAGED` | `external` | `external` |
| `TWS_SIDECAR_URL` | `http://127.0.0.1:8765` | `http://host.docker.internal:8765` |
| `TWS_SIDECAR_SECRET` | Same value on sidecar + both apps | Same |
| `EDGE_TRADING_ENVIRONMENT_LOCK` | `paper` | `live` |

**Sidecar env (Phase 1+ — not yet implemented in code):**

| Variable | Host script (interim fallback) | Compose service (target) |
|----------|-------------------------------|--------------------------|
| `TWS_SIDECAR_BIND` | `127.0.0.1` (default) | `0.0.0.0` (required for `host.docker.internal` reachability) |
| `TWS_PAPER_HOST` / `TWS_PAPER_PORT` | `127.0.0.1` / `4002` | `ib-gateway-paper` / `4004` (internal compose DNS) |
| `TWS_LIVE_HOST` / `TWS_LIVE_PORT` | `127.0.0.1` / `4001` | `ib-gateway-live` / `4003` (internal compose DNS) |
| `TWS_SIDECAR_SECRET` | Runtime env only — never baked into image | Same |

**Bind risk (Phase 4 gate):** Current uvicorn binds `127.0.0.1` inside the sidecar process. Before dual-consumer cutover, Phase 1 must add `TWS_SIDECAR_BIND` and Phase 4 must prove `app-prod → host.docker.internal:8765` with authenticated `/health`.

**Ops commands (target — Phase 2):**

| Command | Contract |
|---------|----------|
| `npm run ib:gateway:up` | Starts live Gateway + paper Gateway + sidecar |
| `npm run ib:gateway:down` | Stops full broker stack including sidecar |
| `npm run tws:sidecar` | Emergency/fallback only — not the primary path after Phase 2 |

**Health semantics:** `/health` = process liveness only (Docker healthcheck). Gateway session readiness stays on sidecar `/status` + app Data Health — healthcheck must **not** require Gateway login (avoids restart loops during 2FA/Sunday cold restart).

**Supersedes:** [Market Data ARCHITECTURE](../../src/lib/marketData/ARCHITECTURE.md) “operator-owned host sidecar” and “Docker Compose is **not** used for the sidecar”; [Local Production Containerization](./local-production-containerization-roadmap.md) “do not containerize sidecar” exclusion (for this service only).

---

### Phase 1 — Image + network config surface

**Band:** Now  
**Status:** **Passing** (2026-07-30)

**Outcome:** Reproducible `edge-tws-sidecar:<sha>` image; sidecar can target two
Gateway DNS names and bind a configurable HTTP host.

| Work item | Scope |
|-----------|--------|
| Dockerfile | Minimal Python image from `services/tws-sidecar/`; `npm ci`-equivalent pin via locked/pinned requirements |
| Bind | `TWS_SIDECAR_BIND` (default `127.0.0.1` host; `0.0.0.0` in container) |
| Dual hosts | Per-connection `TWS_PAPER_HOST`/`PORT`, `TWS_LIVE_HOST`/`PORT` (or equivalent) without breaking host-script defaults to `127.0.0.1:4002` / `:4001` |
| Secret | Image does not bake secrets; runtime env / compose env file only |
| Tests | Unit coverage for config resolution + bind defaults |

**Out of scope:** Adding the Compose service (Phase 2); wedge watchdog (Phase 3).

**Verification:** Image builds; container `curl` `/health` on published port with Gateways optional/down; focused sidecar tests green.

**Gate — Phase 1 Passing:** Image builds for current SHA; config tests prove dual-host resolution; host defaults unchanged for emergency script path.

---

### Phase 2 — Compose service in Gateway stack

**Band:** Now  
**Status:** **Passing** (2026-07-30)

**Outcome:** `npm run ib:gateway:up` starts sidecar with Gateways; Docker restarts it on crash.

| Work item | Scope |
|-----------|--------|
| Compose service | `tws-sidecar` in `services/ib-gateway/docker-compose.yml` |
| Publish | `127.0.0.1:8765:8765` only |
| Restart | `unless-stopped`; bounded Docker logs |
| Healthcheck | `GET /health` process liveness — **not** Gateway-connected |
| depends_on | Startup order only; sidecar tolerates offline Gateways |
| Env file | Ignored, mode-restricted runtime env with `TWS_SIDECAR_SECRET` |
| Conflict guard | Document/stop host sidecar before publish; refuse double-bind clearly |

**Out of scope:** App-prod deploy changes; wedge watchdog.

**Verification:** Fresh `ib:gateway:down` + `up` → `/health` ok without `npm run tws:sidecar`; kill container → auto-restart; Gateway logout does **not** flap sidecar unhealthy→restart loop.

**Gate — Phase 2 Passing:** Quoted compose up + health + kill/restart evidence.

---

### Phase 3 — Wedge watchdog

**Band:** Now  
**Status:** **Pending**

**Outcome:** Alive-but-wedged sidecar exits so Docker restarts it; external-mode
apps no longer dead-end on “restart operator sidecar” for wedge alone.

| Work item | Scope |
|-----------|--------|
| Watchdog | Background sample of worker diagnostics; if `workerWedged` ~60s continuous → structured log + non-zero exit |
| Optional | Same for durable `client_id_stuck` if safe (fresh process is documented fix for IB 326) |
| Tests | Unit/fake-clock or injectable diagnostics prove exit path without live IB |
| Policy | Do **not** exit solely because Gateway is disconnected/logging in |

**Out of scope:** Changing app Recover to spawn in external mode.

**Verification:** Sidecar tests for watchdog; manual or scripted wedge → container restart evidence.

**Gate — Phase 3 Passing:** Focused tests + one app-level or docker-level restart proof.

---

### Phase 4 — Dual-consumer cutover

**Band:** Now  
**Status:** **Pending**

**Outcome:** Dev and container prod both consume the Compose sidecar; host manual
path demoted.

| Work item | Scope |
|-----------|--------|
| Dev | `TWS_MANAGED=external`, `TWS_SIDECAR_URL=http://127.0.0.1:8765`, shared secret |
| Prod | Same secret; `TWS_SIDECAR_URL=http://host.docker.internal:8765`; prove curl/health from `app-prod` |
| Dual sockets | With both Gateways logged in, paper + live `gatewayConnected` (or equivalent) |
| Fallback | Keep `npm run tws:sidecar` documented as emergency only |
| Env examples | `.env.example`, ib-gateway `.env.example`, production.env notes |

**Out of scope:** Broader trading feature work; credential-gated dual-Gateway QA owned by Dual Connection / Wave 1 remains separate except socket connectivity needed here.

**Verification:** Host health; in-container health; both apps market-data/brokerage path not “Sidecar unreachable”; reconnect after Gateway soft restart still works (supervisor).

**Gate — Phase 4 Passing:** Quoted dual-consumer evidence in harness evidence file.

---

### Phase 5 — Docs, ops, harness closeout

**Band:** Now (small)  
**Status:** **Pending**

**Outcome:** Architecture and ops match Compose ownership; track complete.

| Work item | Scope |
|-----------|--------|
| ARCHITECTURE | Replace “operator-owned host sidecar” primary narrative with Compose service |
| npm scripts | Ensure `ib:gateway:*` messaging; optional `tws:sidecar:image` / promote helpers |
| Roadmaps | Sync dual-connection + containerization pointers; README + ROADMAP near-term |
| Harness | Closeout with evidence; Active Work row Passing |

**Verification:** Doc links; status table sync; closeout command with evidence file.

**Gate — Phase 5 Passing:** Track **Passing** / complete with quoted evidence.

---

## Verification Plan (track)

| Tier | When |
|------|------|
| Focused sidecar unit tests | Phases 1, 3 |
| Image build + compose config validate | Phases 1–2 |
| App-level host `/health` + kill/restart | Phase 2 |
| App-level `app-prod` → sidecar | Phase 4 |
| Dual-socket connected (Gateways logged in) | Phase 4 |
| Architecture self-review | Each phase; required on 2 and 4 |

---

## Harness Update

- **Active Work prefix:** `OPS — Persistent TWS sidecar — Phase N`
- **Evidence:** `docs/evidence/persistent-tws-sidecar-phase-N-YYYY-MM-DD.txt`
- **Closeout:** `npm run harness:closeout -- --name "OPS — Persistent TWS sidecar — Phase N" --evidence-file … --roadmap docs/roadmaps/persistent-tws-sidecar-roadmap.md`
- Do not mark a phase **Passing** in this file before Active Work has quoted evidence.

---

## Open questions (defaults)

| Question | Default |
|----------|---------|
| Sidecar promote vs Gateway up | Explicit image rebuild/restart; `ib:gateway:up` uses current tag/build |
| Linux later? | Keep `host.docker.internal:host-gateway` on app-prod; no LaunchAgent dependency |
| LaunchAgent interim? | **Skip** unless Compose blocked |
| Auto-install on `npm run dev`? | No — compose owns broker stack; startup may warn if TWS enabled and `:8765` down |
