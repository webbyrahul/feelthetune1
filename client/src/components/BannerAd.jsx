import { useMemo } from 'react';

/* ─── Ad inventory ─── */
const HORIZONTAL_ADS = [
  {
    image: '/ads/headphones.png',
    title: 'Feel Every Beat in HD Sound',
    text: 'Premium noise-cancelling headphones for true audiophiles.',
    cta: 'Shop Now',
    accent: '138, 43, 226',
  },
  {
    image: '/ads/earbuds.png',
    title: 'Wireless Earbuds Sale',
    text: 'Crystal-clear sound. Zero wires. Limited offer — up to 40% off.',
    cta: 'Buy Now',
    accent: '0, 201, 255',
  },
  {
    image: '/ads/concert.png',
    title: 'Live Concert Tickets Available',
    text: 'Book tickets for your favourite artists performing near you.',
    cta: 'Explore',
    accent: '168, 85, 247',
  },
  {
    image: '/ads/speaker.png',
    title: 'Premium Bluetooth Speakers',
    text: 'Room-filling sound, portable design. Take the party anywhere.',
    cta: 'Shop Now',
    accent: '0, 180, 216',
  },
  {
    image: '/ads/guitar.png',
    title: 'Learn Guitar in 30 Days',
    text: 'Structured lessons from pro musicians. Start your journey today.',
    cta: 'Join Now',
    accent: '234, 179, 8',
  },
  {
    image: '/ads/production.png',
    title: 'Become a Music Producer',
    text: 'Professional music production course — from beginner to pro.',
    cta: 'Enroll Today',
    accent: '147, 51, 234',
  },
];

const SIDEBAR_ADS = [
  {
    image: '/ads/sidebar_guitar.png',
    title: 'Learn Guitar Online',
    text: 'Structured course for beginners.',
    cta: 'Join Now',
  },
  {
    image: '/ads/headphones.png',
    title: 'Buy Premium Headphones',
    text: 'HD Sound. Noise cancellation.',
    cta: 'Shop',
  },
  {
    image: '/ads/earbuds.png',
    title: 'Wireless Earbuds',
    text: '40% off — limited time.',
    cta: 'Buy Now',
  },
  {
    image: '/ads/production.png',
    title: 'Music Production 101',
    text: 'Create beats like a pro.',
    cta: 'Enroll',
  },
];

/**
 * Pick a random ad from a list, stable per mount.
 * The `seed` prop lets you get different ads in different placements.
 */
function pickAd(ads, seed = 0) {
  const idx = (Math.floor(Math.random() * 997) + seed) % ads.length;
  return ads[idx];
}

export default function BannerAd({ isPremium, variant = 'main', seed = 0 }) {
  if (isPremium) return null;

  const ad = useMemo(
    () => (variant === 'sidebar' ? pickAd(SIDEBAR_ADS, seed) : pickAd(HORIZONTAL_ADS, seed)),
    [variant, seed]
  );

  /* ─── Sidebar variant ─── */
  if (variant === 'sidebar') {
    return (
      <div className="banner-ad banner-ad--sidebar" id={`banner-ad-sidebar-${seed}`}>
        <img className="banner-ad-img banner-ad-img--sidebar" src={ad.image} alt={ad.title} loading="lazy" />
        <div className="banner-ad-overlay">
          <strong>{ad.title}</strong>
          <p>{ad.text}</p>
          <button className="banner-ad-cta">{ad.cta}</button>
        </div>
        <span className="banner-ad-label">AD</span>
      </div>
    );
  }

  /* ─── Horizontal variant (main / footer) ─── */
  return (
    <div
      className={`banner-ad banner-ad--horizontal banner-ad--${variant}`}
      id={`banner-ad-${variant}-${seed}`}
      style={{ '--ad-accent': ad.accent || '138, 43, 226' }}
    >
      <img className="banner-ad-img banner-ad-img--horizontal" src={ad.image} alt={ad.title} loading="lazy" />
      <div className="banner-ad-content">
        <strong className="banner-ad-title">{ad.title}</strong>
        <p className="banner-ad-text">{ad.text}</p>
        <button className="banner-ad-cta">{ad.cta}</button>
      </div>
      <span className="banner-ad-label">AD</span>
    </div>
  );
}
