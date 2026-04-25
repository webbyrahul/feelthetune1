import { Router } from 'express';
import * as musicController from '../controllers/musicController.js';

const router = Router();

const missingHandler = (_req, res) =>
  res.status(501).json({ message: 'Endpoint temporarily unavailable. Please update the server code.' });

router.get('/recommendations', musicController.getRecommendations || missingHandler);
router.get('/personalized-recommendations', musicController.getPersonalizedRecommendations || missingHandler);
router.get('/search', musicController.searchMusic || missingHandler);
router.get('/new-releases', musicController.getNewReleases || missingHandler);
router.get('/artist-top-tracks/:artistId', musicController.getArtistTopTracks || missingHandler);
router.get('/album-tracks/:albumId', musicController.getAlbumTracks || missingHandler);
router.get('/artists', musicController.getArtistsByIds || missingHandler);
router.get('/recently-played', musicController.getRecentlyPlayed || missingHandler);
router.post('/generate-playlist', musicController.generateAiPlaylist || missingHandler);
router.post('/save-to-spotify', musicController.saveToSpotify || missingHandler);

export default router;
