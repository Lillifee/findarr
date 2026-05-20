# =========================
# 🏗️ Build stage
# =========================
FROM node:24-bookworm-slim AS build

WORKDIR /app

# Install dependencies first (better caching)
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/package.json
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json

RUN npm ci

# Copy full source
COPY shared ./shared
COPY server ./server
COPY client ./client

# Build all workspaces
RUN npm run build

# Remove dev dependencies AFTER build
RUN npm prune --omit=dev


# =========================
# 🚀 Runtime stage
# =========================
FROM node:24-bookworm-slim AS runtime

WORKDIR /app

# -------------------------
# 📦 Image metadata
# -------------------------
LABEL org.opencontainers.image.title="Findarr"
LABEL org.opencontainers.image.description="Findarr media discovery platform"
LABEL org.opencontainers.image.source="https://github.com/lillifee/findarr"
LABEL org.opencontainers.image.licenses="MIT"

# -------------------------
# ⚙️ Environment
# -------------------------
ENV NODE_ENV=production
ENV DATA_PATH=/app/server/data

# -------------------------
# 📁 App files (only what is needed at runtime)
# -------------------------

# Workspace metadata (IMPORTANT for Node resolution)
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/package.json
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json

# Production dependencies from build stage
COPY --from=build /app/node_modules ./node_modules

# Built artifacts only
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server/drizzle ./server/drizzle

# Entrypoint
COPY --chmod=755 docker/entrypoint.sh /app/docker/entrypoint.sh

# Expose app port
EXPOSE 8585

# -------------------------
# 🚀 Start command
# -------------------------
ENTRYPOINT ["/app/docker/entrypoint.sh"]