import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payment/create-order
export const createOrder = async (req, res, next) => {
  try {
    const { amount, planName, userId } = req.body;

    if (!amount || !planName || !userId) {
      return res.status(400).json({ message: 'amount, planName and userId are required' });
    }

    const options = {
      amount: amount * 100, // Razorpay expects paise
      currency: 'INR',
      receipt: `ftt_${userId.slice(-8)}_${Date.now().toString(36)}`,
      notes: {
        planName,
        userId,
      },
    };

    const order = await razorpay.orders.create(options);
    res.json({ order, key: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    next(error);
  }
};

// POST /api/payment/verify
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed — invalid signature' });
    }

    // Upgrade user to premium
    const user = await User.findByIdAndUpdate(userId, { isPremium: true }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      user: { id: user._id, name: user.name, email: user.email, isPremium: user.isPremium },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payment/key — expose the public key to the client
export const getKey = (_req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID });
};
