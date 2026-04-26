export default function PremiumUpsell({ isPremium, onUpgrade }) {
  if (isPremium) return null;

  return (
    <div className="premium-upsell" id="premium-upsell">
      <div className="premium-upsell-glow" />
      <h4 className="premium-upsell-title">Go Premium</h4>
      <ul className="premium-upsell-benefits">
        <li>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Ad-free music
        </li>
        <li>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Unlimited skips
        </li>
        <li>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          High-quality audio
        </li>
        <li>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Premium badge
        </li>
      </ul>
      <button className="premium-upsell-btn" onClick={onUpgrade}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        Upgrade Now
      </button>
    </div>
  );
}
