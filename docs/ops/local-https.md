# Local HTTPS front door (`https://edge.local`)

Optional loopback-only HTTPS reverse proxy for **local production** on this Mac. The app container still listens on `http://127.0.0.1:3000`; Caddy terminates TLS on `127.0.0.1:443` and forwards to that upstream.

**Related:** [Observability operator runbook](../../src/lib/observability/ARCHITECTURE.md#operator-runbook), [Local production containerization roadmap](../roadmaps/local-production-containerization-roadmap.md).

---

## Concepts (quick)

| Piece | Role |
|-------|------|
| `/etc/hosts` | Maps `edge.local` → `127.0.0.1` on your Mac only |
| Port 443 | Default HTTPS port — browsers hide it in the URL |
| mkcert | Creates a TLS cert your Mac trusts for `edge.local` |
| Caddy | Listens on loopback 443, forwards to `127.0.0.1:3000` |
| Loopback | `127.0.0.1` — traffic never leaves this machine |

```text
Browser → edge.local (hosts) → Caddy 127.0.0.1:443 (TLS) → app-prod 127.0.0.1:3000 (HTTP)
```

Development stays on `http://127.0.0.1:3003`. Readiness watcher and CLI probes should keep using `http://127.0.0.1:3000/readyz`.

---

## One-time prerequisites

1. **Homebrew tools**

   ```bash
   brew install mkcert caddy
   mkcert -install
   ```

   `mkcert -install` adds a local CA to your macOS trust store (one-time).

2. **Hosts entry** (requires sudo once)

   ```bash
   grep -q '[[:space:]]edge\.local' /etc/hosts || \
     sudo sh -c 'echo "127.0.0.1 edge.local" >> /etc/hosts'
   ```

3. **Production app running**

   ```bash
   npm run local:prod:container:status   # container.state=running, container.readyz=pass
   ```

---

## Setup and lifecycle

From the repo root:

| Step | Command |
|------|---------|
| Generate TLS certs | `npm run local:https:install` |
| Start proxy (foreground session) | `npm run local:https:start` |
| Check status | `npm run local:https:status` |
| Stop proxy | `npm run local:https:stop` |
| Remove proxy + optional certs | `npm run local:https:uninstall` |

**Start at login (optional LaunchAgent):**

```bash
npm run local:https:service:install   # after install-certs
npm run local:https:service:status
npm run local:https:service:uninstall
```

TLS material and runtime state live under gitignored `.edge/local-https/`. Committed config: [`ops/caddy/Caddyfile`](../../ops/caddy/Caddyfile).

---

## Production env knob

Add to ignored `.edge/local-prod/production.env` (not committed):

```bash
EDGE_PUBLIC_APP_URL=https://edge.local
```

Then restart the app container so OpenRouter referer and any absolute URLs use the friendly hostname.

Leave `EDGE_TRUSTED_PROXY_COUNT` unset unless you see wrong client IP / rate-limit behavior through the proxy. If needed, set `EDGE_TRUSTED_PROXY_COUNT=1` and document why here.

---

## Verification

```bash
curl -sf https://edge.local/healthz
curl -sf https://edge.local/readyz
curl -sf http://127.0.0.1:3000/readyz   # direct probe unchanged
```

Open `https://edge.local/workspace` in the browser — valid cert, no port in the URL.

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| Certificate warning | Run `mkcert -install`, then `npm run local:https:install` |
| `connection refused` on 443 | `npm run local:https:start` or install LaunchAgent |
| Port 443 permission error | macOS requires sudo for privileged ports — `cd ops/caddy && sudo caddy start --config Caddyfile --adapter caddyfile` (or stop with `sudo caddy stop --config Caddyfile --adapter caddyfile`) |
| `edge.local` resolves slowly | `.local` can interact with mDNS; `/etc/hosts` line should be first choice |
| 502 / bad gateway | Production not up — `npm run local:prod:container:status` |
| Auth/cookies odd over HTTPS | Confirm `NODE_ENV=production` and `EDGE_PUBLIC_APP_URL=https://edge.local` |

---

## Out of scope

- LAN or internet exposure (no bind on `0.0.0.0`)
- Changing the app container port (`127.0.0.1:3000` contract stays)
- Cloud TLS (Let's Encrypt, etc.)
- HTTPS for development (`:3003` remains HTTP)
