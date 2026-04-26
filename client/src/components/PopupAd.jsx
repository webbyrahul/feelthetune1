import { useState, useEffect } from 'react';

const SESSION_KEY = 'ftt_popup_ad_shown';

export default function PopupAd({ isPremium, show, onClose }) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isPremium || !show) {
      setVisible(false);
      return;
    }
    // Prevent repeated popups in the same session
    if (sessionStorage.getItem(SESSION_KEY)) {
      return;
    }
    setVisible(true);
    sessionStorage.setItem(SESSION_KEY, '1');
  }, [isPremium, show]);

  if (!visible) return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      onClose?.();
    }, 280);
  };

  return (
    <div className={`popup-ad-backdrop${closing ? ' popup-ad-closing' : ''}`} onClick={handleClose}>
      <div className={`popup-ad${closing ? ' popup-ad-exit' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="popup-ad-close" onClick={handleClose} title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="popup-ad-visual">
          <div className="popup-ad-icon-ring">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
        </div>

        <h3 className="popup-ad-title">🎉 Unlock Premium</h3>
        <p className="popup-ad-text">
          Enjoy ad-free music, unlimited skips, and premium audio quality.
          Upgrade now for the best FeelTheTune experience!
        </p>

        <div className="popup-ad-benefits">
          <span>✓ No ads</span>
          <span>✓ Unlimited skips</span>
          <span>✓ HQ audio</span>
        </div>

        <button className="popup-ad-cta" onClick={handleClose}>
          Maybe Later
        </button>
      </div>
    </div>
  );
}
