# 🎬 Findarr

> Discover movies and TV shows, vote with friends, and manage requests for your media stack — all in one place.

---

<div align="center">
	<img src="screenshots/home.png" alt="Findarr Home" width="700" />
	<br />
	<img src="screenshots/vote.png" alt="Findarr Vote" width="700" />
	<br />
	<img src="screenshots/explore.png" alt="Findarr Explore" width="700" />
</div>

---

## ✨ Features

### 🔎 Smart Discovery

- Search movies and TV series with rich metadata
- Browse cast, ratings, release dates, and overviews
- Personalized recommendations powered by genre + keyword scoring

### 👍 Personalized Recommendations

- Like or dislike titles to train your recommendation feed
- Findarr learns what you enjoy over time
- Titles you've already rated are automatically hidden, so discovery stays fresh

### 📥 Media Requests

- Request movies and shows directly from the app
- Track request progress through your media pipeline
- Get notified when content becomes available in your library

### 🧩 Works With

- [TMDB API](https://www.themoviedb.org/)
- [Radarr](https://radarr.video/) / [Sonarr](https://sonarr.tv/)
- [Jellyfin](https://jellyfin.org/)
- [Docker](https://www.docker.com/)

---

## 🚀 Quick Start (Docker)

### Requirements

- Docker with Compose support
- Download or copy the [`docker-compose.yml`](/docker-compose.yml)

### Start Findarr

```bash
docker compose pull
docker compose up -d
```

Once running, open:

```txt
http://localhost:8585
```

---

## 🔐 First-Time Setup

1. Sign in with the default admin account:

```txt
Email:    admin@findarr.com
Password: changeme
```

2. Add your TMDB access token
3. Save your settings
4. Start discovering content 🎉

---

## 🧠 How Recommendations Work

Findarr builds recommendations using:

- Trending and recent movies and shows
- Your liked and disliked titles
- Genre and keyword preferences

The more you interact, the smarter your recommendations become.

---

## 📺 Everyday Workflow

```txt
Discover → Vote → Request → Watch
```

1. Search for a movie or TV show
2. Dislike and Like to request it
3. Track request and availability updates
4. Enjoy it once it lands in your library

---

## ❤️ Built For Self-Hosted Media Stacks

Findarr is designed to fit naturally into modern self-hosted media ecosystems and make group discovery painless.

## Metadata

This product uses the TMDB API but is not endorsed or certified by TMDB.
https://www.themoviedb.org/
