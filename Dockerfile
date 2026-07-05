# ─── Build ──────────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ─── Runtime ────────────────────────────────────────────────────────────────────
FROM oven/bun:1 AS runtime
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist
COPY drizzle.config.ts ./drizzle.config.ts
COPY drizzle ./drizzle
COPY server.prod.ts ./server.prod.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENV NODE_ENV=production
# Baked in at build time from the triggering release tag (or commit SHA for
# workflow_dispatch builds) — see .github/workflows/deploy.yml. Lets the running
# app report its own version on /debug and check for newer releases.
ARG RELEASE_VERSION=dev
ENV RELEASE_VERSION=${RELEASE_VERSION}
ENTRYPOINT ["./docker-entrypoint.sh"]
