import { useEffect, useMemo, useState } from 'react';
import Navbar from './components/Navbar';
import MediaCard from './components/MediaCard';
import HorizontalScroller from './components/HorizontalScroller';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import { fetchRecommendations, searchMusic, signup, login } from './services/api';

export default function App() {
  const [albums, setAlbums] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [currentUser, setCurrentUser] = useState(() => {
    const user = localStorage.getItem('ftt_user');
    return user ? JSON.parse(user) : null;
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchRecommendations();
        setAlbums(data);
      } catch {
        setError('Unable to load recommendations. Check backend and Spotify credentials.');
      }
    };

    load();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      const data = await searchMusic(query.trim());
      setResults(data);
    } catch {
      setError('Search failed.');
    }
  };

  const handleAuth = async (form) => {
    try {
      setAuthLoading(true);
      setAuthError('');
      const action = authMode === 'signup' ? signup : login;
      const payload = authMode === 'signup' ? form : { email: form.email, password: form.password };
      const data = await action(payload);
      localStorage.setItem('ftt_token', data.token);
      localStorage.setItem('ftt_user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setAuthMode(null);
    } catch (authErr) {
      setAuthError(authErr.response?.data?.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const topAlbums = useMemo(() => (results?.albums?.items || albums).slice(0, 20), [results, albums]);
  const artists = useMemo(() => {
    if (results?.artists?.items?.length) {
      return results.artists.items.slice(0, 20);
    }

    const uniqueArtists = new Map();
    for (const album of topAlbums) {
      for (const artist of album.artists || []) {
        if (!uniqueArtists.has(artist.id)) {
          uniqueArtists.set(artist.id, {
            id: artist.id,
            name: artist.name,
            followers: { total: 0 },
            images: []
          });
        }
      }
    }

    return Array.from(uniqueArtists.values()).slice(0, 20);
  }, [results, topAlbums]);

  return (
    <div className="app-shell">
      <Navbar
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
        onSignup={() => setAuthMode('signup')}
        onLogin={() => setAuthMode('login')}
        currentUser={currentUser}
      />

      <main className="dashboard">
        <header>
          <h2>Recommended Music</h2>
          <p>Drag horizontally to explore albums and artists.</p>
          {error && <p className="error">{error}</p>}
        </header>

        <section>
          <h3>Albums</h3>
          <HorizontalScroller>
            {topAlbums.map((album) => (
              <MediaCard
                key={album.id}
                title={album.name}
                subtitle={(album.artists || []).map((artist) => artist.name).join(', ')}
                image={album.images?.[1]?.url || album.images?.[0]?.url || 'https://via.placeholder.com/240'}
              />
            ))}
          </HorizontalScroller>
        </section>

        <section>
          <h3>Artists</h3>
          <HorizontalScroller>
            {artists.map((artist) => (
              <MediaCard
                key={artist.id}
                title={artist.name}
                subtitle={`${artist.followers?.total?.toLocaleString() || 0} followers`}
                image={artist.images?.[1]?.url || artist.images?.[0]?.url || 'https://via.placeholder.com/240'}
              />
            ))}
          </HorizontalScroller>
        </section>
      </main>

      <Footer />

      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSubmit={handleAuth}
          loading={authLoading}
          error={authError}
        />
      )}
    </div>
  );
}
