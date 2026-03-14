import { spotifyRequest } from '../services/spotifyService.js';

export const getRecommendations = async (_req, res, next) => {
  try {
    const data = await spotifyRequest('/browse/new-releases', { limit: 20 });
    res.json({ albums: data.albums.items });
  } catch (error) {
    next(error);
  }
};

export const searchMusic = async (req, res, next) => {
  try {
    const { q, type = 'track,album,artist', limit = 20 } = req.query;
    if (!q) return res.status(400).json({ message: 'Query param q is required' });

    const data = await spotifyRequest('/search', { q, type, limit });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getNewReleases = async (req, res, next) => {
  try {
    const { limit = 20, country = 'US' } = req.query;
    const data = await spotifyRequest('/browse/new-releases', { limit, country });
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
