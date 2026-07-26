# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20-alpine

# --- deps: production install only ---
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/chart-core/package.json packages/chart-core/
COPY packages/chart-react/package.json packages/chart-react/
COPY packages/indicator-runtime/package.json packages/indicator-runtime/
COPY packages/ai-tools-core/package.json packages/ai-tools-core/
COPY packages/ai-tools-chart/package.json packages/ai-tools-chart/
RUN npm ci --omit=dev --ignore-scripts

# --- builder: full install + workspace build + next build (standalone) ---
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/chart-core/package.json packages/chart-core/
COPY packages/chart-react/package.json packages/chart-react/
COPY packages/indicator-runtime/package.json packages/indicator-runtime/
COPY packages/ai-tools-core/package.json packages/ai-tools-core/
COPY packages/ai-tools-chart/package.json packages/ai-tools-chart/
RUN npm ci --ignore-scripts
COPY . .
ARG NEXT_PUBLIC_WEBGL_CANDLES=0
ARG NEXT_PUBLIC_WEBGL_INDICATORS=0
ARG NEXT_PUBLIC_STREAM_TRANSPORT
ARG NEXT_PUBLIC_WATCHLIST_STREAM
ARG NEXT_PUBLIC_MARKET_DATA_TELEMETRY
ENV NEXT_PUBLIC_WEBGL_CANDLES=${NEXT_PUBLIC_WEBGL_CANDLES} \
    NEXT_PUBLIC_WEBGL_INDICATORS=${NEXT_PUBLIC_WEBGL_INDICATORS} \
    NEXT_PUBLIC_STREAM_TRANSPORT=${NEXT_PUBLIC_STREAM_TRANSPORT} \
    NEXT_PUBLIC_WATCHLIST_STREAM=${NEXT_PUBLIC_WATCHLIST_STREAM} \
    NEXT_PUBLIC_MARKET_DATA_TELEMETRY=${NEXT_PUBLIC_MARKET_DATA_TELEMETRY} \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
RUN npm run build:packages && npx next build

# --- migrate: one-shot target, same revision as runtime ---
FROM node:${NODE_VERSION} AS migrate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts/db-migrate.mts ./scripts/db-migrate.mts
COPY --from=builder /app/scripts/db-migrate-lib.mts ./scripts/db-migrate-lib.mts
COPY --from=builder /app/src/db/migrations ./src/db/migrations
RUN npm i --no-save tsx pg
ENTRYPOINT ["npx", "tsx", "scripts/db-migrate.mts"]

# --- runtime: minimal, non-root ---
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
LABEL org.opencontainers.image.source="https://github.com/vincentn/TV-AI"
LABEL org.opencontainers.image.revision=""
LABEL org.opencontainers.image.created=""

RUN addgroup -S edge && adduser -S -G edge edge \
 && mkdir -p /app/data/journal-screenshots /app/data/copilot-attachments \
 && chown -R edge:edge /app

COPY --from=builder --chown=edge:edge /app/.next/standalone ./
COPY --from=builder --chown=edge:edge /app/.next/static ./.next/static
COPY --from=builder --chown=edge:edge /app/public ./public

USER edge
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
