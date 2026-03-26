import { spotifyRequest } from '../services/spotifyService.js';

const sanitizeLimit = (value, fallback = 20, max = 20) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

export const getRecommendations = async (_req, res, next) => {
  try {
    try {
      const data = await spotifyRequest('/browse/new-releases', { country: 'US' });
      return res.json({ albums: data.albums.items, source: 'new-releases' });
    } catch (error) {
      // Some Spotify apps/tokens can receive 403 on browse endpoints.
      if (error.response?.status !== 403) throw error;

      const fallback = await spotifyRequest('/search', {
        q: 'top hits',
        type: 'track',
        market: 'US'
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
        market: 'US'
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

    const data = await spotifyRequest('/search', { q, type, limit: sanitizeLimit(limit) });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getNewReleases = async (req, res, next) => {
  try {
    const { limit = 20, country = 'US' } = req.query;
    const data = await spotifyRequest('/browse/new-releases', { limit: sanitizeLimit(limit), country });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getArtistTopTracks = async (req, res, next) => {
  try {
    const { artistId } = req.params;
    const { market = 'US' } = req.query;
    const data = await spotifyRequest(`/artists/${artistId}/top-tracks`, { market });
    res.json(data);
  } catch (error) {
    next(error);
  }
};
