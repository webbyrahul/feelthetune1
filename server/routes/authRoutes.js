import { Router } from 'express';
import { login, signup, upgradeToPremium } from '../controllers/authController.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/upgrade-premium', upgradeToPremium);

export default router;
