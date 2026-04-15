import { useEffect, useMemo, useState } from 'react';
import Navbar from './components/Navbar';
import MediaCard from './components/MediaCard';
import HorizontalScroller from './components/HorizontalScroller';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import useSpotifyWebPlayback from './hooks/useSpotifyWebPlayback';
import {
  fetchRecommendations,
  searchMusic,
  signup,
  login,
  fetchArtistsByIds,
  fetchAlbumTracks,
  fetchArtistTopTracks,
  fetchSpotifyAccessToken,
  getSpotifyLoginUrl
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
  const [currentQueue, setCurrentQueue] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [pendingTrackIndex, setPendingTrackIndex] = useState(null);
  const [requestedTrack, setRequestedTrack] = useState(null);
  const [spotifyToken, setSpotifyToken] = useState('');
  const [isSpotifyAuthed, setIsSpotifyAuthed] = useState(false);
  const refreshSpotifyToken = async () => {
    const tokenResponse = await fetchSpotifyAccessToken();
    setSpotifyToken(tokenResponse.accessToken);
    setIsSpotifyAuthed(true);
    return tokenResponse.accessToken;
  };
  const {
    deviceId,
    isPlaying,
    currentTrack,
    position,
    duration,
    error: playerError,
    playTrack,
    togglePlay,
    nextTrack,
    previousTrack,
    seek
  } = useSpotifyWebPlayback(spotifyToken, refreshSpotifyToken);

  useEffect(() => {
    refreshSpotifyToken().catch(() => {
      setSpotifyToken('');
      setIsSpotifyAuthed(false);
    });
  }, []);

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
        if (fullArtists.length) {
          setArtistDetails(fullArtists);
          return;
        }

        // Fallback when /artists endpoint is restricted: resolve artists via search by name.
        const names = Array.from(
          new Set(
            topAlbums
              .flatMap((album) => album.artists || [])
              .map((artist) => artist.name)
              .filter(Boolean)
          )
        ).slice(0, 20);

        const searchedArtists = await Promise.all(
          names.map(async (name) => {
            const data = await searchMusic(name);
            return data.artists?.items?.[0] || null;
          })
        );

        setArtistDetails(searchedArtists.filter(Boolean));
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
      setCurrentQueue(data.tracks || []);
      setCurrentTrackIndex(-1);
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
      const tracks = await fetchArtistTopTracks(artist.id, artist.name);
      const topTracks = tracks.slice(0, 10);
      setSelectedTracks(topTracks);
      setCurrentQueue(topTracks);
      setCurrentTrackIndex(-1);
    } catch {
      setSelectedTracks([]);
      setError('Unable to load artist songs.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const findPlayableIndex = (startIndex, direction = 1) => {
    if (!currentQueue.length) return -1;
    for (let step = 0; step < currentQueue.length; step += 1) {
      const idx = (startIndex + step * direction + currentQueue.length) % currentQueue.length;
      if (currentQueue[idx]?.uri) return idx;
    }
    return -1;
  };

  const startPlaybackAtIndex = async (playableIndex) => {
    try {
      setCurrentTrackIndex(playableIndex);
      setRequestedTrack(currentQueue[playableIndex] || null);
      const queueUris = currentQueue.filter((track) => track.uri).map((track) => track.uri);
      const uriToPlay = currentQueue[playableIndex].uri;
      const offset = queueUris.indexOf(uriToPlay);
      await playTrack(uriToPlay, queueUris.length ? queueUris : [uriToPlay], offset >= 0 ? offset : 0);
      setError('');
    } catch (playError) {
      setError(playError.message || 'Playback failed');
    }
  };

  const playTrackAtIndex = async (index) => {
    if (!currentQueue[index]) return;
    if (!spotifyToken) {
      setError('Login with Spotify to enable playback.');
      return;
    }
    const playableIndex = currentQueue[index]?.uri ? index : findPlayableIndex(index);
    if (playableIndex === -1) {
      setError('No playable Spotify tracks available in this list.');
      return;
    }
    if (!deviceId) {
      setPendingTrackIndex(playableIndex);
      setError('Spotify player is initializing; trying active-device playback and will auto-play when ready.');
    }
    await startPlaybackAtIndex(playableIndex);
  };

  useEffect(() => {
    if (!deviceId || pendingTrackIndex === null) return;
    startPlaybackAtIndex(pendingTrackIndex);
    setPendingTrackIndex(null);
  }, [deviceId, pendingTrackIndex]);

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

      <main className="dashboard layout-shell">
        <aside className="sidebar">
          <h3>Browse</h3>
          <button className="sidebar-item active">Home</button>
          <button className="sidebar-item">Albums</button>
          <button className="sidebar-item">Artists</button>
          <button className="sidebar-item">Playlists</button>
        </aside>

        <section className="main-panel">
        <header>
          <h2>Recommended Music</h2>
          <p>Drag horizontally to explore albums and artists.</p>
          {(error || playerError) && <p className="error">{error || playerError}</p>}
          {!isSpotifyAuthed && (
            <div className="token-box">
              <p>Login with Spotify to enable Web Playback SDK.</p>
              <div className="token-row">
                <button onClick={() => (window.location.href = getSpotifyLoginUrl())}>Login with Spotify</button>
              </div>
            </div>
          )}
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
                    <li
                      key={track.id || `${track.name}-${index}`}
                      onClick={() => playTrackAtIndex(index)}
                      className={!track.uri ? 'track-disabled' : ''}
                    >
                      <span className="track-index">{index + 1}</span>
                      <div className="track-meta">
                        <span>{track.name}</span>
                        <small>{(track.artists || []).map((artist) => artist.name).join(', ')}</small>
                      </div>
                      <small>
                        {!track.uri
                          ? 'Unavailable'
                          : track.duration_ms
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
        </section>
      </main>

      <Footer />
      <div className="player-bar">
        <div className="now-playing">
          <img
            src={
              currentTrack?.album?.images?.[2]?.url ||
              currentTrack?.album?.images?.[0]?.url ||
              requestedTrack?.album?.images?.[2]?.url ||
              requestedTrack?.album?.images?.[0]?.url ||
              'https://via.placeholder.com/56'
            }
            alt={currentTrack?.name || requestedTrack?.name || 'track'}
          />
          <div>
            <strong>{currentTrack?.name || requestedTrack?.name || 'Select a song'}</strong>
            <small>
              {currentTrack
                ? (currentTrack.artists || []).map((artist) => artist.name).join(', ')
                : requestedTrack
                ? (requestedTrack.artists || []).map((artist) => artist.name).join(', ')
                : 'No song selected'}
            </small>
          </div>
        </div>
        <div className="player-controls">
          <button onClick={previousTrack} disabled={!deviceId}>
            ◀◀
          </button>
          <button onClick={togglePlay} disabled={!deviceId}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button onClick={nextTrack} disabled={!deviceId}>
            ▶▶
          </button>
        </div>
        <div className="seek-wrap">
          <input type="range" min="0" max={duration || 0} value={position} onChange={(event) => seek(Number(event.target.value))} />
          <small>
            {Math.floor(position / 60000)}:{String(Math.floor((position % 60000) / 1000)).padStart(2, '0')} /{' '}
            {Math.floor((duration || 0) / 60000)}:{String(Math.floor(((duration || 0) % 60000) / 1000)).padStart(2, '0')}
          </small>
          <small>{deviceId ? 'Spotify device ready' : 'Initializing Spotify device...'}</small>
        </div>
      </div>

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
