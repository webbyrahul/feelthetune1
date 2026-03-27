import { useEffect, useMemo, useState } from 'react';
import Navbar from './components/Navbar';
import MediaCard from './components/MediaCard';
import HorizontalScroller from './components/HorizontalScroller';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import {
  fetchRecommendations,
  searchMusic,
  signup,
  login,
  fetchArtistsByIds,
  fetchAlbumTracks,
  fetchArtistTopTracks
} from './services/api';

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
  const [artistDetails, setArtistDetails] = useState([]);
  const [selectedView, setSelectedView] = useState(null);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

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

  useEffect(() => {
    if (results?.artists?.items?.length) return;

    const artistIds = Array.from(
      new Set(
        topAlbums
          .flatMap((album) => album.artists || [])
          .map((artist) => artist.id)
          .filter(Boolean)
      )
    ).slice(0, 30);

    if (!artistIds.length) {
      setArtistDetails([]);
      return;
    }

    const loadArtists = async () => {
      try {
        const fullArtists = await fetchArtistsByIds(artistIds);
        setArtistDetails(fullArtists);
      } catch {
        setArtistDetails([]);
      }
    };

    loadArtists();
  }, [results, topAlbums]);

  const artists = useMemo(() => {
    if (results?.artists?.items?.length) {
      return results.artists.items.slice(0, 20);
    }

    if (artistDetails.length) {
      return artistDetails.slice(0, 20);
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
  }, [results, topAlbums, artistDetails]);

  const openAlbumDetails = async (album) => {
    try {
      setDetailsLoading(true);
      setSelectedView({ type: 'album', id: album.id, title: album.name });
      const data = await fetchAlbumTracks(album.id);
      setSelectedTracks(data.tracks || []);
    } catch {
      setSelectedTracks([]);
      setError('Unable to load album songs.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const openArtistDetails = async (artist) => {
    try {
      setDetailsLoading(true);
      setSelectedView({ type: 'artist', id: artist.id, title: artist.name });
      const tracks = await fetchArtistTopTracks(artist.id);
      setSelectedTracks(tracks);
    } catch {
      setSelectedTracks([]);
      setError('Unable to load artist songs.');
    } finally {
      setDetailsLoading(false);
    }
  };

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
                onClick={() => openAlbumDetails(album)}
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
                onClick={() => openArtistDetails(artist)}
              />
            ))}
          </HorizontalScroller>
        </section>

        {selectedView && (
          <section className="details-panel">
            <h3>
              {selectedView.type === 'album' ? 'Album Songs' : 'Artist Top Songs'} · {selectedView.title}
            </h3>
            {detailsLoading ? (
              <p>Loading songs...</p>
            ) : selectedTracks.length ? (
              <div className="track-table">
                <div className="track-head">
                  <span>#</span>
                  <span>Song</span>
                  <span>Duration</span>
                </div>
                <ul className="track-list">
                  {selectedTracks.map((track, index) => (
                    <li key={track.id || `${track.name}-${index}`}>
                      <span className="track-index">{index + 1}</span>
                      <div className="track-meta">
                        <span>{track.name}</span>
                        <small>{(track.artists || []).map((artist) => artist.name).join(', ')}</small>
                      </div>
                      <small>
                        {track.duration_ms
                          ? `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}`
                          : ''}
                      </small>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>No songs found for this selection.</p>
            )}
          </section>
        )}
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
