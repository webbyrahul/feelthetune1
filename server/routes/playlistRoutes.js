import { Router } from 'express';
import {
  addTrackToPlaylist,
  createPlaylist,
  getUserPlaylists,
  removeTrackFromPlaylist,
  deletePlaylist
} from '../controllers/playlistController.js';

const router = Router();

router.get('/:userId', getUserPlaylists);
router.post('/', createPlaylist);
router.post('/:playlistId/tracks', addTrackToPlaylist);
router.delete('/:playlistId/tracks/:trackId', removeTrackFromPlaylist);
router.delete('/:playlistId', deletePlaylist);

export default router;
