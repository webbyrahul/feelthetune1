# FeelTheTune MERN Streaming App

A full-stack MERN starter for a Spotify-powered music streaming website.

## Features
- Spotify-powered recommendations, albums, artists, and search.
- Dashboard with horizontally draggable cards for albums/artists/tracks.
- Authentication-ready API structure.
- User playlists and liked tracks stored in MongoDB.
- Navbar with search and login/sign-up buttons.
- Footer across the site.

## Tech Stack
- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Music Data:** Spotify Web API

## Project Structure
- `client/` React frontend
- `server/` Express API + Mongo models

## Setup

### 1) Install dependencies
```bash
npm run install:all
```

### 2) Configure environment variables
Create `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/feelthetune
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
CLIENT_URL=http://localhost:5173
```

### 3) Run development servers
```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## API Endpoints
- `GET /api/music/recommendations`
- `GET /api/music/search?q=<term>&type=track,album,artist`
- `GET /api/music/new-releases`
- `GET /api/music/artist-top-tracks/:artistId`
- `GET /api/playlists/:userId`
- `POST /api/playlists`
- `POST /api/playlists/:playlistId/tracks`
- `GET /api/likes/:userId`
- `POST /api/likes`
- `DELETE /api/likes`

## Notes
- Spotify's client credentials flow is used for catalog browsing/search.
- User-specific Spotify account features require OAuth user authorization flow; this starter focuses on app-managed playlist/likes with Spotify catalog items.
