import Playlist from '../models/Playlist.js';

export const getUserPlaylists = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const playlists = await Playlist.find({ userId }).sort({ createdAt: -1 });
    res.json(playlists);
  } catch (error) {
    next(error);
  }
};

export const createPlaylist = async (req, res, next) => {
  try {
    const { userId, name, description } = req.body;
    if (!userId || !name) return res.status(400).json({ message: 'userId and name are required' });

    const playlist = await Playlist.create({ userId, name, description, tracks: [] });
    res.status(201).json(playlist);
  } catch (error) {
    next(error);
  }
};

export const addTrackToPlaylist = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const { trackId, name, artist, album, imageUrl, previewUrl } = req.body;

    if (!trackId || !name) {
      return res.status(400).json({ message: 'trackId and name are required' });
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    const exists = playlist.tracks.some((track) => track.trackId === trackId);
    if (!exists) {
      playlist.tracks.push({ trackId, name, artist, album, imageUrl, previewUrl });
      await playlist.save();
    }

    res.json(playlist);
  } catch (error) {
    next(error);
  }
};
