import { Router } from 'express';
import {
  addTrackToPlaylist,
  createPlaylist,
  getUserPlaylists
} from '../controllers/playlistController.js';

const router = Router();

router.get('/:userId', getUserPlaylists);
router.post('/', createPlaylist);
router.post('/:playlistId/tracks', addTrackToPlaylist);

export default router;
