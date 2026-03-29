import mongoose from 'mongoose';

const likedTrackSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    trackId: { type: String, required: true },
    name: { type: String, required: true },
    artist: String,
    album: String,
    imageUrl: String,
    previewUrl: String
  },
  { timestamps: true }
);

likedTrackSchema.index({ userId: 1, trackId: 1 }, { unique: true });

export default mongoose.model('LikedTrack', likedTrackSchema);
