# Edge

Edge is a private financial charting platform built around a custom Canvas 2D chart engine, AI tool integration, and optional Postgres-backed persistence.

## Workspace Structure

| Package | Purpose |
|---------|---------|
| `src/app` | Next.js app routes and React UI |
| `src/lib/chart` | App chart engine, drawings, indicators, canvas renderer |
| `src/lib/ai` | AI tool registry, adapters, and app tool context |
| `src/lib/marketData` | Provider-neutral market-data service and vendor adapters |
| `src/lib/persistence` | Optional Postgres persistence and local fallback support |
| `packages/*` | Internal package boundaries used by the app and examples |
| `examples/*` | Internal smoke examples for package and integration checks |

## Quick Start

```bash
npm run setup
npm run check:startup
npm run dev
```

The dev server runs at http://localhost:3003.

Optional persistence:

```bash
cp .env.example .env.local
npm run db:up
npm run db:migrate
```

## Verification

```bash
npm run check:startup
npm test -- --run
npm run build
```

Use focused tests for the area you changed. Run the full gate when touching shared behavior:

```bash
npm run check
```

## Planning Docs

- [Roadmap](docs/ROADMAP.md) — consolidated product and engineering direction
- [Project status](docs/PROJECT-STATUS.md) — current verified state and next active work
