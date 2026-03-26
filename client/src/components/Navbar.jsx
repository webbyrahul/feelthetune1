export default function Navbar({ query, onQueryChange, onSearch, onSignup, onLogin, currentUser }) {
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
        {currentUser ? (
          <span className="welcome">Hi, {currentUser.name}</span>
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
