import { Router } from 'express';
import {
  getRecommendations,
  searchMusic,
  getNewReleases,
  getArtistTopTracks,
  getArtistsByIds,
  getAlbumTracks
} from '../controllers/musicController.js';

const router = Router();

router.get('/recommendations', getRecommendations);
router.get('/search', searchMusic);
router.get('/new-releases', getNewReleases);
router.get('/artist-top-tracks/:artistId', getArtistTopTracks);
router.get('/album-tracks/:albumId', getAlbumTracks);
router.get('/artists', getArtistsByIds);

export default router;
