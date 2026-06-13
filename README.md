# 🎬 Findarr

![Docker](https://img.shields.io/badge/docker-ready-blue?logo=docker)
![Self-Hosted](https://img.shields.io/badge/self--hosted-yes-green)
![TMDB](https://img.shields.io/badge/TMDB-API-01b4e4)
![Radarr](https://img.shields.io/badge/Radarr-supported-orange)
![Sonarr](https://img.shields.io/badge/Sonarr-supported-blue)

> Stop searching. Start finding.

Find movies and shows you actually want — without the repetition.

---

<div align="center">
	<img src="screenshots/home.png" alt="Findarr Home" width="700" />
	<br />
	<img src="screenshots/vote.png" alt="Findarr Vote" width="700" />
	<br />
	<img src="screenshots/explore.png" alt="Findarr Explore" width="700" />
</div>

---

## ✨ What makes Findarr different

Finding something to watch shouldn’t feel like scrolling the same lists every day.

Findarr is built on a simple idea:

- If you’ve already rated something, you won’t see it again
- No re-evaluating the same titles over and over
- Your feed always stays fresh

You go through content once — like it or dislike it — then move on.

No repetition. No clutter. No déjà vu lists.

---

## ⚡ The experience

Discover → Like / Dislike → New content only

Everything you’ve already rated disappears from your discovery flow.

What’s left is always new.

---

## 📥 Requests (automatic)

Everything you **like** is automatically sent to:

- Radarr: https://radarr.video/
- Sonarr: https://sonarr.tv/

---

## 🧠 Smart filtering

- Learns from what you like and dislike
- Builds your taste from genres + keywords
- Finds more of what fits your taste
- Removes anything you’ve already rated
- Keeps discovery always fresh

---

## 🧩 Integrations

- [TMDB API](https://www.themoviedb.org/)
- [Radarr](https://radarr.video/) / [Sonarr](https://sonarr.tv/)
- [Jellyfin](https://jellyfin.org/)
- [Docker](https://www.docker.com/)

---

## 🚀 Quick start

Create or a copy the [`docker-compose.yml`](/docker-compose.yml) file:

```yaml
services:
  findarr:
    image: ghcr.io/lillifee/findarr:latest
    restart: unless-stopped
    ports:
      - 8585:8585
    volumes:
      - ./data:/app/apps/api/data
```

Run:

```bash
docker compose up -d
```

Open:

```txt
http://localhost:8585
```

---

## 🔐 Setup

1. Create admin account
2. Add TMDB token
3. Start discovering

---

## ❤️ Built for self-hosters

Findarr is made for people who want a clean, personal way to discover what to watch — without noise, repetition, or endless scrolling.

---

## Metadata

This product uses the TMDB API but is not endorsed or certified by TMDB.
https://www.themoviedb.org/
