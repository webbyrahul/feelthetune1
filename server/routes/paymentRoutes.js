import { Router } from 'express';
import { createOrder, verifyPayment, getKey } from '../controllers/paymentController.js';

const router = Router();

router.get('/key', getKey);
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);

export default router;
