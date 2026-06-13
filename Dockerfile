# =========================
# 🏗️ Build stage
# =========================
FROM node:24-bookworm-slim AS build

WORKDIR /app

# Install CA certificates (required by vp pack, ~400KB)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Enable pnpm
RUN corepack enable

# Copy workspace metadata for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source code
COPY vite.config.ts ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Build all workspaces
RUN pnpm build


# =========================
# 🚀 Runtime stage
# =========================
FROM node:24-bookworm-slim AS runtime

WORKDIR /app

# -------------------------
# 📦 Metadata
# -------------------------
LABEL org.opencontainers.image.title="Findarr"
LABEL org.opencontainers.image.description="Findarr media discovery platform"
LABEL org.opencontainers.image.source="https://github.com/lillifee/findarr"
LABEL org.opencontainers.image.licenses="MIT"

# -------------------------
# ⚙️ Environment
# -------------------------
ENV NODE_ENV=production
ENV DATA_PATH=/app/apps/api/data

RUN corepack enable

# -------------------------
# 📁 App files (only what is needed at runtime)
# -------------------------

# Workspace metadata
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

# Install production deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

# Built artifacts
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=build /app/apps/web/dist ./apps/web/dist

# Entrypoint
COPY --chmod=755 docker/entrypoint.sh /entrypoint.sh

# Expose app port
EXPOSE 8585

# -------------------------
# 🚀 Start command
# -------------------------
ENTRYPOINT ["/entrypoint.sh"]