import { spotifyRequest } from '../services/spotifyService.js';

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

    const data = await spotifyRequest('/search', { q, type, limit: sanitizeLimit(limit) });
    res.json(data);
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
    const { market = DEFAULT_MARKET } = req.query;
    const data = await spotifyRequest(`/artists/${artistId}/top-tracks`, { market });
    const tracks = await enrichTracksWithPreview(data.tracks || []);
    res.json({ ...data, tracks });
  } catch (error) {
    next(error);
  }
};

export const getAlbumTracks = async (req, res, next) => {
  try {
    const { albumId } = req.params;
    const { market = DEFAULT_MARKET } = req.query;
    const [albumData, tracksData] = await Promise.all([
      spotifyRequest(`/albums/${albumId}`),
      spotifyRequest(`/albums/${albumId}/tracks`, { market, limit: 50 })
    ]);
    const tracks = await enrichTracksWithPreview(tracksData.items || []);

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
    res.json({ artists: data.artists || [] });
  } catch (error) {
    if (error.response?.status === 403) {
      // Some Spotify apps block /artists for client-credentials tokens.
      return res.status(200).json({
        artists: [],
        warning: 'Spotify artists endpoint is restricted for this app/token.'
      });
    }
    next(error);
  }
};
