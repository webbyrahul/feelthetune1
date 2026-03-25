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

    // Use findOneAndUpdate with upsert to avoid a race condition between findOne and create
    const like = await LikedTrack.findOneAndUpdate(
      { userId, trackId },
      { $setOnInsert: { userId, trackId, name, artist, album, imageUrl, previewUrl } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(like);
  } catch (error) {
    next(error);
  }
};

export const unlikeTrack = async (req, res, next) => {
  try {
    // Accept userId/trackId from URL params (preferred) or fall back to body
    const userId = req.params.userId || req.body.userId;
    const trackId = req.params.trackId || req.body.trackId;
    if (!userId || !trackId) {
      return res.status(400).json({ message: 'userId and trackId are required' });
    }

    await LikedTrack.deleteOne({ userId, trackId });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
