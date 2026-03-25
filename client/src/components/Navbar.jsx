export default function Navbar({ query, onQueryChange, onSearch }) {
  return (
    <nav className="navbar">
      <h1 className="logo">FeelTheTune</h1>
      <form
        className="search-group"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search tracks, albums, artists..."
        />
        <button type="submit">Search</button>
      </form>
      <div className="auth-actions">
        <button className="secondary">Sign In</button>
        <button>Login</button>
      </div>
    </nav>
  );
}
