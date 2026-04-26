import PremiumBadge from './PremiumBadge';

export default function Navbar({ query, onQueryChange, onSearch, onSignup, onLogin, onLogout, currentUser, onOpenAiPlaylist, isPremium, onGetPremium }) {
  return (
    <nav className="navbar">
      <h1 className="logo">FeelTheTune</h1>
      <div className="search-group">
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search tracks, albums, artists..."
        />
        <button onClick={onSearch}>Search</button>
      </div>
      <div className="auth-actions">
        <button className="ai-playlist-btn" onClick={onOpenAiPlaylist}>
          ✨ AI Playlist
        </button>
        {currentUser ? (
          <>
            {isPremium && <PremiumBadge />}
            <span className="welcome">Hi, {currentUser.name}</span>
            {!isPremium && (
              <button className="get-premium-btn" onClick={onGetPremium} id="get-premium-nav-btn">
                ✨ Get Premium
              </button>
            )}
            <button className="secondary" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <button className="secondary" onClick={onSignup}>
              Sign Up
            </button>
            <button onClick={onLogin}>Login</button>
          </>
        )}
      </div>
    </nav>
  );
}
