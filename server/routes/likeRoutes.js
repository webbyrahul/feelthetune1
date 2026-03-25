import { Router } from 'express';
import { getLikedTracks, likeTrack, unlikeTrack } from '../controllers/likeController.js';

const router = Router();

router.get('/:userId', getLikedTracks);
router.post('/', likeTrack);
router.delete('/:userId/:trackId', unlikeTrack);

export default router;
