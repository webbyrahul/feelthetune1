import { Router } from 'express';
import {
  getRecommendations,
  searchMusic,
  getNewReleases,
  getArtistTopTracks
} from '../controllers/musicController.js';

const router = Router();

router.get('/recommendations', getRecommendations);
router.get('/search', searchMusic);
router.get('/new-releases', getNewReleases);
router.get('/artist-top-tracks/:artistId', getArtistTopTracks);

export default router;
