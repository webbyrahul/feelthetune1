import { useState } from 'react';
import PricingCard from './PricingCard';
import FeatureComparisonTable from './FeatureComparisonTable';
import { createPaymentOrder, verifyPayment as verifyPaymentApi } from '../services/api';

const PLANS = [
  {
    plan: 'Mini',
    price: 49,
    features: ['Ad-free music', 'Basic audio quality', 'Limited skips', 'Single device'],
    recommended: false,
  },
  {
    plan: 'Individual',
    price: 99,
    features: ['Ad-free music', 'Unlimited skips', 'High quality audio', 'Offline downloads', 'Premium badge', 'Single device'],
    recommended: true,
    badge: 'Best Value',
  },
  {
    plan: 'Family',
    price: 149,
    features: ['Up to 5 accounts', 'Ad-free music', 'Unlimited skips', 'High quality audio', 'Offline downloads', 'Family profiles'],
    recommended: false,
  },
];

const WHY_ITEMS = [
  { icon: '🎵', text: 'Enjoy uninterrupted listening' },
  { icon: '🔊', text: 'Better sound quality' },
  { icon: '📥', text: 'Download songs offline' },
  { icon: '⏭️', text: 'Unlimited skips' },
  { icon: '✨', text: 'Premium experience' },
];

export default function PremiumPage({ onBack, currentUser, onPaymentSuccess }) {
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const handlePlanSelect = async ({ plan, price }) => {
    if (!currentUser) {
      setPaymentError('Please login first to purchase a plan.');
      return;
    }

    setLoading(true);
    setPaymentError('');

    try {
      const userId = currentUser._id || currentUser.id;

      // 1. Create Razorpay order
      const { order, key } = await createPaymentOrder({
        amount: price,
        planName: plan,
        userId,
      });

      // 2. Open Razorpay checkout
      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: 'FeelTheTune',
        description: `${plan} Plan - Premium Subscription`,
        order_id: order.id,
        handler: async (response) => {
          // 3. Verify payment on server
          try {
            const data = await verifyPaymentApi({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId,
            });

            if (data.success) {
              onPaymentSuccess?.(data.user);
            }
          } catch {
            setPaymentError('Payment verification failed. Contact support if amount was deducted.');
          }
        },
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
        },
        theme: {
          color: '#8a2be2',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        setPaymentError(`Payment failed: ${resp.error.description}`);
        setLoading(false);
      });
      rzp.open();
    } catch {
      setPaymentError('Could not initiate payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="premium-page" id="premium-page">
      {/* Back Button */}
      <button className="premium-page-back" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      {/* Hero Section */}
      <div className="premium-hero">
        <div className="premium-hero-glow" />
        <div className="premium-hero-icon">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <h1 className="premium-hero-title">Get Premium</h1>
        <p className="premium-hero-sub">
          Choose the perfect plan and enjoy an ad-free music experience with exclusive premium features.
        </p>
      </div>

      {paymentError && (
        <div className="payment-error">
          <span>⚠️</span> {paymentError}
        </div>
      )}

      {/* Pricing Cards */}
      <div className="pricing-grid">
        {PLANS.map((p) => (
          <PricingCard key={p.plan} {...p} onSelect={handlePlanSelect} loading={loading} />
        ))}
      </div>

      {/* Feature Comparison */}
      <FeatureComparisonTable />

      {/* Why Go Premium */}
      <div className="why-premium">
        <h2 className="why-premium-title">Why Go Premium?</h2>
        <div className="why-premium-grid">
          {WHY_ITEMS.map((item) => (
            <div className="why-premium-card" key={item.text}>
              <span className="why-premium-icon">{item.icon}</span>
              <span className="why-premium-text">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
