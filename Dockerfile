# syntax=docker/dockerfile:1

# =========================
# 🏗️ Build stage
# =========================
# Official Vite+ toolchain image: bundles `vp` + a native build toolchain
# (build-essential, python3) and provisions the exact Node.js from .node-version.
FROM ghcr.io/voidzero-dev/vite-plus:0.2.2 AS build

WORKDIR /app

# Copy workspace metadata for dependency installation (better layer caching).
# The image runs as the non-root `vp` user, so copy with --chown=vp:vp.
COPY --chown=vp:vp package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./

COPY --chown=vp:vp packages/shared/package.json ./packages/shared/package.json
COPY --chown=vp:vp apps/api/package.json ./apps/api/package.json
COPY --chown=vp:vp apps/web/package.json ./apps/web/package.json

RUN vp install --frozen-lockfile

# Copy source code
COPY --chown=vp:vp vite.config.ts ./
COPY --chown=vp:vp packages/shared ./packages/shared
COPY --chown=vp:vp apps/api ./apps/api
COPY --chown=vp:vp apps/web ./apps/web

# Build all workspaces (topological)
RUN vp run -r build

# Export the exact resolved Node.js binary for the runtime stage.
RUN cp "$(vp env which node | head -1)" /tmp/node


# =========================
# 📦 Production deps stage
# =========================
# A separate --prod install so devDependencies (including the vite-plus
# toolchain) are excluded from the runtime image.
FROM ghcr.io/voidzero-dev/vite-plus:0.2.2 AS deps

WORKDIR /app

COPY --chown=vp:vp package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
COPY --chown=vp:vp packages/shared/package.json ./packages/shared/package.json
COPY --chown=vp:vp apps/api/package.json ./apps/api/package.json
COPY --chown=vp:vp apps/web/package.json ./apps/web/package.json

RUN vp install --frozen-lockfile --prod


# =========================
# 🚀 Runtime stage
# =========================
# Small, vp-free, glibc runtime. Only the resolved Node.js binary, production
# dependencies, and built artifacts are copied in. An entrypoint repairs the
# data-volume ownership on startup, then drops privileges to the `node` user.
FROM debian:bookworm-slim AS runtime

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

# Node's prebuilt binary requires libatomic1 on debian-slim.
RUN apt-get update && apt-get install -y --no-install-recommends libatomic1 \
    && rm -rf /var/lib/apt/lists/*

# Non-root runtime user (the entrypoint drops to it via runuser).
RUN groupadd -g 1000 node && useradd -u 1000 -g node -m node

# The exact Node.js from .node-version (official, signature-verified build).
COPY --from=build /tmp/node /usr/local/bin/node

# -------------------------
# 📁 App files (only what is needed at runtime)
# -------------------------

# Production dependencies + workspace manifests/symlinks (all workspaces).
COPY --from=deps /app ./

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