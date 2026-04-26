const FEATURES = [
  { name: 'Ads', free: 'Yes', premium: 'No' },
  { name: 'Unlimited Skips', free: 'No', premium: 'Yes' },
  { name: 'Offline Downloads', free: 'No', premium: 'Yes' },
  { name: 'High Quality Audio', free: 'No', premium: 'Yes' },
  { name: 'Premium Badge', free: 'No', premium: 'Yes' },
  { name: 'Multiple Devices', free: 'Limited', premium: 'Yes' },
];

export default function FeatureComparisonTable() {
  return (
    <div className="comparison-section">
      <h2 className="comparison-title">Compare Plans</h2>
      <p className="comparison-subtitle">See what you get when you upgrade to Premium.</p>
      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Free Plan</th>
              <th className="comparison-premium-col">Premium</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f.name}>
                <td>{f.name}</td>
                <td>
                  <span className={`comparison-val comparison-val--${f.free === 'Yes' ? 'negative' : f.free === 'No' ? 'negative' : 'neutral'}`}>
                    {f.free === 'Yes' && f.name === 'Ads' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    ) : f.free === 'No' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    ) : f.free}
                  </span>
                </td>
                <td>
                  <span className="comparison-val comparison-val--positive">
                    {f.premium === 'Yes' || (f.name === 'Ads' && f.premium === 'No') ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : f.premium}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
