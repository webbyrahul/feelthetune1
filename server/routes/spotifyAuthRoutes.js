import { Router } from 'express';
import { getSpotifyAccessToken, spotifyCallback, spotifyLogin } from '../controllers/spotifyAuthController.js';

const router = Router();

router.get('/login', spotifyLogin);
router.get('/callback', spotifyCallback);
router.get('/token', getSpotifyAccessToken);

export default router;
