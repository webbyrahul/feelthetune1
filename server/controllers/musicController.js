import axios from 'axios';
import { spotifyRequest } from '../services/spotifyService.js';
import { getSpotifyTokens, hasValidAccessToken } from '../services/spotifyOAuthStore.js';
import { refreshSpotifyToken } from './spotifyAuthController.js';

const sanitizeLimit = (value, fallback = 20, max = 20) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};
const DEFAULT_MARKET = process.env.SPOTIFY_MARKET || 'IN';

const enrichTracksWithPreview = async (tracks) => {
  const missingPreview = tracks
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => !track.preview_url && track.id)
    .slice(0, 20);

  if (!missingPreview.length) return tracks;

  const resolved = await Promise.all(
    missingPreview.map(async ({ track, index }) => {
      try {
        const fullTrack = await spotifyRequest(`/tracks/${track.id}`, { market: DEFAULT_MARKET });
        return { index, previewUrl: fullTrack.preview_url || null };
      } catch {
        return { index, previewUrl: null };
      }
    })
  );

  const updated = [...tracks];
  for (const { index, previewUrl } of resolved) {
    if (previewUrl) {
      updated[index] = { ...updated[index], preview_url: previewUrl };
    }
  }
  return updated;
};

export const getRecommendations = async (_req, res, next) => {
  try {
    try {
      const data = await spotifyRequest('/browse/new-releases', { country: DEFAULT_MARKET });
      return res.json({ albums: data.albums.items, source: 'new-releases' });
    } catch (error) {
      // Some Spotify apps/tokens can receive 403 on browse endpoints.
      if (error.response?.status !== 403) throw error;

      const fallback = await spotifyRequest('/search', {
        q: 'top hits',
        type: 'track',
        market: DEFAULT_MARKET
      });

      const uniqueAlbums = new Map();
      for (const track of fallback.tracks?.items || []) {
        const album = track.album;
        if (album?.id && !uniqueAlbums.has(album.id)) {
          uniqueAlbums.set(album.id, album);
        }
      }

      return res.json({
        albums: Array.from(uniqueAlbums.values()).slice(0, 20),
        source: 'search-fallback'
      });
    }
  } catch (error) {
    // Keep homepage usable even when Spotify blocks recommendations.
    try {
      const genreFallback = await spotifyRequest('/search', {
        q: 'genre:pop',
        type: 'album',
        market: DEFAULT_MARKET
      });

      return res.json({
        albums: genreFallback.albums?.items || [],
        source: 'genre-fallback',
        warning: 'Spotify recommendation endpoints unavailable. Served fallback results.'
      });
    } catch (fallbackError) {
      console.error('Recommendation fallback failed at genre search:', fallbackError.message);
      return res.status(200).json({
        albums: [],
        source: 'empty-fallback',
        warning: 'Unable to fetch recommendations from Spotify right now.'
      });
    }
  }
};

export const searchMusic = async (req, res, next) => {
  try {
    const { q, type = 'track,album,artist', limit = 20 } = req.query;
    if (!q) return res.status(400).json({ message: 'Query param q is required' });
    try {
      const data = await spotifyRequest('/search', { q, type, limit: sanitizeLimit(limit) });
      return res.json(data);
    } catch (error) {
      const isInvalidLimit = error.response?.status === 400 && /invalid limit/i.test(error.message || '');
      if (!isInvalidLimit) throw error;

      // Fallback for Spotify apps that reject explicit search limit values.
      const data = await spotifyRequest('/search', { q, type });
      return res.json(data);
    }
  } catch (error) {
    next(error);
  }
};

export const getNewReleases = async (req, res, next) => {
  try {
    const { limit = 20, country = DEFAULT_MARKET } = req.query;
    const data = await spotifyRequest('/browse/new-releases', { limit: sanitizeLimit(limit), country });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getArtistTopTracks = async (req, res, next) => {
  try {
    const { artistId } = req.params;
    const { market = DEFAULT_MARKET, artistName = '' } = req.query;

    // Prefer user OAuth token if available
    if (hasValidAccessToken()) {
      const { accessToken } = getSpotifyTokens();
      try {
        const response = await axios.get(
          `https://api.spotify.com/v1/artists/${artistId}/top-tracks`,
          { params: { market }, headers: { Authorization: `Bearer ${accessToken}` } }
        );
        return res.json({ tracks: response.data.tracks || [] });
      } catch {
        // Fall through to client_credentials
      }
    }

    try {
      const data = await spotifyRequest(`/artists/${artistId}/top-tracks`, { market });
      return res.json({ tracks: data.tracks || [] });
    } catch (error) {
      if (error.response?.status !== 403) throw error;

      // Fallback for apps where artist top-tracks endpoint is restricted.
      if (!artistName) {
        return res.status(200).json({ tracks: [], warning: 'Artist top tracks unavailable for this token/app.' });
      }

      const fallback = await spotifyRequest('/search', {
        q: `artist:\"${artistName}\"`,
        type: 'track',
        market
      });
      return res.json({ tracks: (fallback.tracks?.items || []).slice(0, 10), source: 'search-fallback' });
    }
  } catch (error) {
    next(error);
  }
};

export const getAlbumTracks = async (req, res, next) => {
  try {
    const { albumId } = req.params;
    const { market = DEFAULT_MARKET } = req.query;

    // Prefer user OAuth token if available (separate rate limit bucket)
    let albumData;
    if (hasValidAccessToken()) {
      const { accessToken } = getSpotifyTokens();
      try {
        const response = await axios.get(`https://api.spotify.com/v1/albums/${albumId}`, {
          params: { market },
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        albumData = response.data;
      } catch {
        // Fall through to client_credentials
      }
    }

    if (!albumData) {
      albumData = await spotifyRequest(`/albums/${albumId}`, { market });
    }

    // The full album response already includes tracks — no need for a separate tracks call
    const tracks = (albumData.tracks?.items || []).map((track) => ({
      ...track,
      // Album tracks don't include album info, add it for playback
      album: {
        id: albumData.id,
        name: albumData.name,
        images: albumData.images
      }
    }));

    res.json({
      album: albumData,
      tracks
    });
  } catch (error) {
    next(error);
  }
};

export const getArtistsByIds = async (req, res, next) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ message: 'Query param ids is required' });
    }

    const idList = String(ids)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 50);

    if (!idList.length) {
      return res.status(400).json({ message: 'At least one artist id is required' });
    }

    const data = await spotifyRequest('/artists', { ids: idList.join(',') });
    const artists = (data.artists || []).filter(Boolean);
    res.json({ artists });
  } catch (error) {
    if (error.response?.status === 403) {
      // Some Spotify apps block /artists batch endpoint. Fallback to per-artist fetch.
      try {
        const artists = (
          await Promise.all(
            String(req.query.ids)
              .split(',')
              .map((id) => id.trim())
              .filter(Boolean)
              .slice(0, 50)
              .map(async (artistId) => {
                try {
                  return await spotifyRequest(`/artists/${artistId}`);
                } catch {
                  return null;
                }
              })
          )
        ).filter(Boolean);

        return res.status(200).json({
          artists,
          source: 'artist-id-fallback',
          warning: artists.length
            ? undefined
            : 'Spotify artists endpoint is restricted for this app/token.'
        });
      } catch {
        return res.status(200).json({
          artists: [],
          warning: 'Spotify artists endpoint is restricted for this app/token.'
        });
      }
    }
    next(error);
  }
};

/**
 * Personalized recommendations based on user's listening history.
 * Uses the user's OAuth token to fetch top tracks / recently played,
 * then seeds Spotify /recommendations.
 */
export const getPersonalizedRecommendations = async (_req, res, next) => {
  try {
    // Ensure we have a valid user OAuth token
    if (!hasValidAccessToken()) {
      try {
        await refreshSpotifyToken();
      } catch {
        return res.status(401).json({ message: 'Spotify login required for personalized recommendations.' });
      }
    }

    const { accessToken } = getSpotifyTokens();
    if (!accessToken) {
      return res.status(401).json({ message: 'Spotify login required.' });
    }

    const userApi = axios.create({
      baseURL: 'https://api.spotify.com/v1',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Try to get seed data from user's listening history
    let seedTrackIds = [];
    let seedArtistIds = [];

    // 1. Try top tracks first (most reliable for taste)
    try {
      const topTracks = await userApi.get('/me/top/tracks', {
        params: { limit: 10, time_range: 'short_term' }
      });
      const items = topTracks.data.items || [];
      seedTrackIds = items.map((t) => t.id).slice(0, 3);
      seedArtistIds = Array.from(
        new Set(items.flatMap((t) => (t.artists || []).map((a) => a.id)))
      ).slice(0, 2);
    } catch {
      // short_term may be empty for new accounts
    }

    // 2. If not enough seeds, try recently played
    if (seedTrackIds.length < 2) {
      try {
        const recent = await userApi.get('/me/player/recently-played', {
          params: { limit: 20 }
        });
        const recentItems = recent.data.items || [];
        const recentTrackIds = recentItems.map((item) => item.track.id);
        const recentArtistIds = recentItems.flatMap((item) =>
          (item.track.artists || []).map((a) => a.id)
        );
        seedTrackIds = Array.from(new Set([...seedTrackIds, ...recentTrackIds])).slice(0, 3);
        seedArtistIds = Array.from(new Set([...seedArtistIds, ...recentArtistIds])).slice(0, 2);
      } catch {
        // recently-played may also fail
      }
    }

    // 3. If still not enough, try medium_term top tracks
    if (seedTrackIds.length < 1) {
      try {
        const mediumTop = await userApi.get('/me/top/tracks', {
          params: { limit: 10, time_range: 'medium_term' }
        });
        const items = mediumTop.data.items || [];
        seedTrackIds = items.map((t) => t.id).slice(0, 3);
        seedArtistIds = Array.from(
          new Set(items.flatMap((t) => (t.artists || []).map((a) => a.id)))
        ).slice(0, 2);
      } catch {
        // fall through
      }
    }

    // If we have seeds, get personalized recommendations
    if (seedTrackIds.length > 0 || seedArtistIds.length > 0) {
      const params = {
        limit: 40,
        market: DEFAULT_MARKET
      };
      if (seedTrackIds.length) params.seed_tracks = seedTrackIds.join(',');
      if (seedArtistIds.length) params.seed_artists = seedArtistIds.join(',');

      // Total seeds must be <= 5
      const totalSeeds = seedTrackIds.length + seedArtistIds.length;
      if (totalSeeds > 5) {
        params.seed_tracks = seedTrackIds.slice(0, 3).join(',');
        params.seed_artists = seedArtistIds.slice(0, 2).join(',');
      }

      try {
        const recResponse = await userApi.get('/recommendations', { params });
        const tracks = recResponse.data.tracks || [];

        // Extract unique albums from recommended tracks
        const albumMap = new Map();
        for (const track of tracks) {
          const album = track.album;
          if (album?.id && !albumMap.has(album.id)) {
            albumMap.set(album.id, album);
          }
        }

        return res.json({
          albums: Array.from(albumMap.values()).slice(0, 20),
          tracks: tracks.slice(0, 20),
          source: 'personalized',
          seedInfo: {
            trackSeeds: seedTrackIds.length,
            artistSeeds: seedArtistIds.length
          }
        });
      } catch (recError) {
        console.error('Recommendations API failed:', recError.response?.data || recError.message);
        // Fall through to generic fallback
      }
    }

    // Fallback: return top tracks as "recommendations"
    try {
      const topTracks = await userApi.get('/me/top/tracks', {
        params: { limit: 20, time_range: 'medium_term' }
      });
      const items = topTracks.data.items || [];
      const albumMap = new Map();
      for (const track of items) {
        const album = track.album;
        if (album?.id && !albumMap.has(album.id)) {
          albumMap.set(album.id, album);
        }
      }
      return res.json({
        albums: Array.from(albumMap.values()).slice(0, 20),
        tracks: items.slice(0, 20),
        source: 'top-tracks-fallback'
      });
    } catch {
      return res.status(200).json({
        albums: [],
        tracks: [],
        source: 'empty',
        warning: 'No listening history available yet. Play some songs first!'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch user's recently played tracks from Spotify.
 * Requires a valid user OAuth token.
 */
export const getRecentlyPlayed = async (_req, res, next) => {
  try {
    if (!hasValidAccessToken()) {
      try {
        await refreshSpotifyToken();
      } catch {
        return res.status(401).json({ message: 'Spotify login required for recently played.' });
      }
    }

    const { accessToken } = getSpotifyTokens();
    if (!accessToken) {
      return res.status(401).json({ message: 'Spotify login required.' });
    }

    const response = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
      params: { limit: 30 },
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const items = response.data.items || [];

    // Deduplicate by track id, keeping first (most recent) occurrence
    const seen = new Set();
    const tracks = [];
    for (const item of items) {
      const track = item.track;
      if (track && !seen.has(track.id)) {
        seen.add(track.id);
        tracks.push({
          id: track.id,
          name: track.name,
          uri: track.uri,
          artists: track.artists || [],
          album: track.album || {},
          duration_ms: track.duration_ms,
          played_at: item.played_at
        });
      }
    }

    return res.json({ tracks });
  } catch (error) {
    next(error);
  }
};
