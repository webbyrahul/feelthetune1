export default function PricingCard({ plan, price, features, recommended, badge, onSelect, loading }) {
  return (
    <div className={`pricing-card${recommended ? ' pricing-card--recommended' : ''}`}>
      {recommended && <div className="pricing-card-ribbon">Most Popular</div>}
      {badge && <span className="pricing-card-badge">{badge}</span>}
      <h3 className="pricing-card-name">{plan}</h3>
      <div className="pricing-card-price">
        <span className="pricing-card-currency">₹</span>
        <span className="pricing-card-amount">{price}</span>
        <span className="pricing-card-period">/ month</span>
      </div>
      <ul className="pricing-card-features">
        {features.map((feature, i) => (
          <li key={i}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <button
        className="pricing-card-btn"
        onClick={() => onSelect?.({ plan, price })}
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Get Premium Now'}
      </button>
    </div>
  );
}
