export default function Navbar({ query, onQueryChange, onSearch }) {
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
        <button className="secondary">Sign In</button>
        <button>Login</button>
      </div>
    </nav>
  );
}
