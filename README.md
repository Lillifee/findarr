# Findarr

A full-stack TypeScript application for discovering movies and shows using the TMDB API, with future integration for media management systems like Jellyseer, Radarr, and Sonarr.

## Tech Stack

- **Backend**: Node.js + TypeScript + Fastify + Zod
- **Frontend**: React + TypeScript + Vite
- **APIs**: TMDB API (for movie/show data)
- **Validation**: Zod for runtime type safety

## Features

- 🎬 Search for movies and TV shows via TMDB API
- 🔍 Detailed movie/show information and metadata
- 🎯 Type-safe API requests with Zod validation
- 🚀 High-performance backend with Fastify
- ⚛️ Modern React frontend with TypeScript
- 🔄 Future integration with media management tools

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- TMDB API key (get one at [themoviedb.org](https://www.themoviedb.org/settings/api))

### Installation

1. **Clone and install**:

   ```bash
   git clone <your-repo-url>
   cd findarr
   npm install
   ```

2. **Setup environment**:

   ```bash
   cp server/.env.example server/.env
   # Edit server/.env and add your API keys
   ```

3. **Start developing**:
   ```bash
   npm run dev
   ```

This will start:

- Backend server on http://localhost:3000
- Frontend development server on http://localhost:5173

## Docker Deployment

The project can be deployed as a single container that serves both the Fastify API and the built React app.

### Prerequisites

- Docker Engine with Docker Compose support
- A Findarr admin account for the initial TMDB setup

### Run With Docker Compose

1. Copy [.env.example](.env.example) to `.env`.
2. Optionally change `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before first start.
3. Pull and start the published image:

   ```bash
   docker compose pull
   docker compose up -d
   ```

4. Open http://localhost:3000, sign in as an admin, then go to Integrations and save your TMDB access token.

The production deployment stores the SQLite database and the generated session secret in a named volume mounted at `/app/server/data`, so both survive container restarts without extra secret management.

Compose now keeps stable runtime defaults inside the image and application code, while `.env` is limited to optional instance-specific bootstrap overrides such as the initial admin account.

### Local Development Override

If you want local development convenience instead of the production deployment shape, use [docker-compose.dev.yml](docker-compose.dev.yml) as an override. It builds from the local Dockerfile and bind-mounts `./data` so the SQLite database is directly visible on the host.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

This override is intended for local development and troubleshooting, not the default production deployment.

### Build And Publish With GitHub Actions

This repository now includes GitHub Actions workflows for both CI validation and Docker image publishing.

- `.github/workflows/ci.yml` runs type-check, lint, format check, and build on pushes and pull requests.
- `.github/workflows/docker-publish.yml` builds the production image and publishes it to GitHub Container Registry on pushes to `main`, version tags, or manual runs.

The published image is configured directly in [docker-compose.yml](docker-compose.yml) as `ghcr.io/lillifee/findarr:latest`, while [docker-compose.dev.yml](docker-compose.dev.yml) is the local build override.

### Runtime Notes

- The health check endpoint remains available at `GET /health`.
- API routes remain under `/api`.
- Client-side routes such as `/explore` and `/admin/users` are served by the same container through a production SPA fallback.
- Reverse proxy and HTTPS are not included in this first-pass deployment.

## Project Structure

```
findarr/
├── client/          # React frontend
├── server/          # Fastify backend
├── shared/          # Shared types and utilities
└── package.json     # Root package with workspace config
```

## API Endpoints

- `GET /api/search/movie` - Search for movies
- `GET /api/search/tv` - Search for TV shows
- `GET /api/movie/:id` - Get movie details
- `GET /api/tv/:id` - Get TV show details

## Future Features

- Integration with Jellyseer for media requests
- Direct integration with Radarr/Sonarr APIs
- User authentication and request management
- Download status tracking
