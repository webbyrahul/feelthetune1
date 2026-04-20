import mongoose from 'mongoose';

const trackSchema = new mongoose.Schema(
  {
    trackId: { type: String, required: true },
    name: { type: String, required: true },
    artist: String,
    album: String,
    imageUrl: String,
    previewUrl: String,
    uri: String
  },
  { _id: false }
);

const playlistSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: String,
    tracks: [trackSchema]
  },
  { timestamps: true }
);

export default mongoose.model('Playlist', playlistSchema);
