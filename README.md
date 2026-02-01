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
