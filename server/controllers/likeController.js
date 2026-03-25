import LikedTrack from '../models/LikedTrack.js';

export const getLikedTracks = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const likes = await LikedTrack.find({ userId }).sort({ createdAt: -1 });
    res.json(likes);
  } catch (error) {
    next(error);
  }
};

export const likeTrack = async (req, res, next) => {
  try {
    const { userId, trackId, name, artist, album, imageUrl, previewUrl } = req.body;
    if (!userId || !trackId || !name) {
      return res.status(400).json({ message: 'userId, trackId and name are required' });
    }

    const existing = await LikedTrack.findOne({ userId, trackId });
    if (existing) return res.json(existing);

    const like = await LikedTrack.create({
      userId,
      trackId,
      name,
      artist,
      album,
      imageUrl,
      previewUrl
    });

    res.status(201).json(like);
  } catch (error) {
    next(error);
  }
};

export const unlikeTrack = async (req, res, next) => {
  try {
    const { userId, trackId } = req.body;
    if (!userId || !trackId) {
      return res.status(400).json({ message: 'userId and trackId are required' });
    }

    await LikedTrack.deleteOne({ userId, trackId });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
