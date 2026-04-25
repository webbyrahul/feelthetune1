import { useEffect, useMemo, useState } from 'react';
import Navbar from './components/Navbar';
import MediaCard from './components/MediaCard';
import HorizontalScroller from './components/HorizontalScroller';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import CreatePlaylistModal from './components/CreatePlaylistModal';
import AddToPlaylistModal from './components/AddToPlaylistModal';
import AiPlaylistModal from './components/AiPlaylistModal';
import useSpotifyWebPlayback from './hooks/useSpotifyWebPlayback';
import {
  fetchRecommendations,
  fetchPersonalizedRecommendations,
  searchMusic,
  signup,
  login,
  fetchArtistsByIds,
  fetchAlbumTracks,
  fetchArtistTopTracks,
  fetchSpotifyAccessToken,
  getSpotifyLoginUrl,
  fetchUserPlaylists,
  removeTrackFromPlaylist as apiRemoveTrack,
  deletePlaylist as apiDeletePlaylist,
  fetchRecentlyPlayed
} from './services/api';

export default function App() {
  const [albums, setAlbums] = useState([]);
  const [recommendedTracks, setRecommendedTracks] = useState([]);
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

  // Playlist state
  const [playlists, setPlaylists] = useState([]);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState(null);

  // Recently played
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [showAllRecent, setShowAllRecent] = useState(false);

  // AI Playlist
  const [showAiPlaylist, setShowAiPlaylist] = useState(false);

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
    let cancelled = false;

    const load = async () => {
      try {
        // Try personalized recommendations first when Spotify is authed
        if (isSpotifyAuthed) {
          try {
            const personalData = await fetchPersonalizedRecommendations();
            if (cancelled) return;
            if (personalData.albums?.length) {
              setAlbums(personalData.albums);
              setRecommendedTracks(personalData.tracks || []);
              return;
            }
          } catch {
            if (cancelled) return;
            // Fall through to generic recommendations
          }
        }
        // Generic fallback
        const data = await fetchRecommendations();
        if (cancelled) return;
        setAlbums(data);
        setRecommendedTracks([]);
      } catch {
        if (cancelled) return;
        setError('Unable to load recommendations. Check backend and Spotify credentials.');
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isSpotifyAuthed]);

  // Load recently played tracks
  useEffect(() => {
    if (!isSpotifyAuthed) {
      setRecentlyPlayed([]);
      return;
    }
    const loadRecent = async () => {
      try {
        const tracks = await fetchRecentlyPlayed();
        setRecentlyPlayed(tracks);
      } catch {
        // silent fail
      }
    };
    loadRecent();
  }, [isSpotifyAuthed]);

  // Load user playlists
  useEffect(() => {
    if (!currentUser) {
      setPlaylists([]);
      return;
    }
    const loadPlaylists = async () => {
      try {
        const data = await fetchUserPlaylists(currentUser._id || currentUser.id);
        setPlaylists(data);
      } catch {
        // silent fail
      }
    };
    loadPlaylists();
  }, [currentUser]);

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

  const handleLogout = () => {
    localStorage.removeItem('ftt_token');
    localStorage.removeItem('ftt_user');
    setCurrentUser(null);
    setAuthMode('login');
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

        const searchedArtists = await Promise.allSettled(
          names.map(async (name) => {
            const data = await searchMusic(name, { type: 'artist', limit: 5 });
            const matched = (data.artists?.items || []).find(
              (artist) => artist.name?.toLowerCase() === name.toLowerCase()
            );
            return matched || data.artists?.items?.[0] || null;
          })
        );

        const resolvedArtists = searchedArtists
          .filter((result) => result.status === 'fulfilled' && result.value)
          .map((result) => result.value);

        setArtistDetails(resolvedArtists);
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
      setActivePlaylistId(null);
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
      setActivePlaylistId(null);
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

  // Playlist handlers
  const openPlaylistDetails = (playlist) => {
    setActivePlaylistId(playlist._id);
    setSelectedView({ type: 'playlist', id: playlist._id, title: playlist.name });
    // Convert stored tracks to a playable format
    const tracks = (playlist.tracks || []).map((t) => ({
      id: t.trackId,
      name: t.name,
      artists: [{ name: t.artist || '' }],
      album: { name: t.album || '', images: t.imageUrl ? [{ url: t.imageUrl }] : [] },
      duration_ms: null,
      uri: t.uri || null,
      preview_url: t.previewUrl || null
    }));
    setSelectedTracks(tracks);
    setCurrentQueue(tracks);
    setCurrentTrackIndex(-1);
  };

  const handleRemoveFromPlaylist = async (playlistId, trackId) => {
    try {
      const updated = await apiRemoveTrack(playlistId, trackId);
      setPlaylists((prev) =>
        prev.map((p) => (p._id === playlistId ? updated : p))
      );
      // If currently viewing this playlist, refresh the track list
      if (activePlaylistId === playlistId) {
        const tracks = (updated.tracks || []).map((t) => ({
          id: t.trackId,
          name: t.name,
          artists: [{ name: t.artist || '' }],
          album: { name: t.album || '', images: t.imageUrl ? [{ url: t.imageUrl }] : [] },
          duration_ms: null,
          uri: t.uri || null
        }));
        setSelectedTracks(tracks);
        setCurrentQueue(tracks);
      }
    } catch {
      setError('Failed to remove track.');
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    try {
      await apiDeletePlaylist(playlistId);
      setPlaylists((prev) => prev.filter((p) => p._id !== playlistId));
      if (activePlaylistId === playlistId) {
        setActivePlaylistId(null);
        setSelectedView(null);
        setSelectedTracks([]);
      }
    } catch {
      setError('Failed to delete playlist.');
    }
  };

  const handlePlaylistCreated = () => {
    // Reload playlists from server
    if (!currentUser) return;
    fetchUserPlaylists(currentUser._id || currentUser.id)
      .then(setPlaylists)
      .catch(() => {});
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
        onLogout={handleLogout}
        currentUser={currentUser}
        onOpenAiPlaylist={() => setShowAiPlaylist(true)}
      />

      <main className="dashboard layout-shell">
        <aside className="sidebar">
          <h3>Recently Played</h3>
          {recentlyPlayed.length > 0 ? (
            <>
              <ul className="sidebar-recent-list" id="recently-played-list">
                {recentlyPlayed.slice(0, showAllRecent ? 6 : 3).map((track) => (
                  <li
                    key={track.id}
                    className="sidebar-recent-item"
                    onClick={() => {
                      setCurrentQueue(recentlyPlayed);
                      const idx = recentlyPlayed.findIndex((t) => t.id === track.id);
                      playTrackAtIndex(idx >= 0 ? idx : 0);
                    }}
                    title={`${track.name} — ${(track.artists || []).map((a) => a.name).join(', ')}`}
                  >
                    <img
                      src={track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || 'https://via.placeholder.com/40'}
                      alt={track.name}
                    />
                    <div className="sidebar-recent-info">
                      <span>{track.name}</span>
                      <small>{(track.artists || []).map((a) => a.name).join(', ')}</small>
                    </div>
                  </li>
                ))}
              </ul>
              {recentlyPlayed.length > 3 && (
                <button
                  className="sidebar-see-more"
                  onClick={() => setShowAllRecent((prev) => !prev)}
                  id="see-more-recent-btn"
                >
                  {showAllRecent ? 'See less' : 'See more'}
                </button>
              )}
            </>
          ) : (
            <p className="sidebar-recent-empty">
              {isSpotifyAuthed ? 'No recent songs yet.' : 'Login with Spotify to see history.'}
            </p>
          )}

          {/* Playlist Section */}
          <div className="sidebar-divider" />
          <div className="sidebar-playlist-section">
            <div className="sidebar-playlist-header">
              <h3 className="sidebar-playlists-title">Your Playlists</h3>
              <button
                className="sidebar-create-playlist-icon"
                onClick={() => {
                  if (!currentUser) {
                    setAuthMode('login');
                    return;
                  }
                  setShowCreatePlaylist(true);
                }}
                id="create-playlist-sidebar-btn"
                title="Create Playlist"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
            {playlists.length > 0 ? (
              <div
                className="sidebar-playlist-scroller"
                onMouseDown={(e) => {
                  const el = e.currentTarget;
                  el.dataset.dragging = 'true';
                  el.dataset.startX = e.pageX;
                  el.dataset.scrollStart = el.scrollLeft;
                }}
                onMouseMove={(e) => {
                  const el = e.currentTarget;
                  if (el.dataset.dragging !== 'true') return;
                  e.preventDefault();
                  const dx = e.pageX - Number(el.dataset.startX);
                  el.scrollLeft = Number(el.dataset.scrollStart) - dx;
                }}
                onMouseUp={(e) => { e.currentTarget.dataset.dragging = 'false'; }}
                onMouseLeave={(e) => { e.currentTarget.dataset.dragging = 'false'; }}
              >
                {playlists.map((pl) => (
                  <div
                    key={pl._id}
                    className={`sidebar-playlist-card${activePlaylistId === pl._id ? ' active' : ''}`}
                    onClick={() => openPlaylistDetails(pl)}
                    title={pl.name}
                  >
                    <button
                      className="sidebar-playlist-card-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(pl._id);
                      }}
                      title="Delete playlist"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                    <div className="sidebar-playlist-card-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                    </div>
                    <span className="sidebar-playlist-card-name">{pl.name}</span>
                    <small className="sidebar-playlist-card-count">{pl.tracks?.length || 0} songs</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="sidebar-recent-empty">No playlists yet. Create one!</p>
            )}
          </div>
        </aside>

        <section className="main-panel">
        <header>

          {(error || playerError) && <p className="error">{error || playerError}</p>}
          {!isSpotifyAuthed && (
            <div className="token-box">
              <p>Login with Spotify to enable Web Playback SDK and personalized recommendations.</p>
              <div className="token-row">
                <button onClick={() => (window.location.href = getSpotifyLoginUrl())}>Login with Spotify</button>
              </div>
            </div>
          )}
        </header>

        {recommendedTracks.length > 0 && (
          <section>
            <h3>Recommended Tracks</h3>
            <HorizontalScroller>
              {recommendedTracks.map((track) => (
                <MediaCard
                  key={track.id}
                  title={track.name}
                  subtitle={(track.artists || []).map((a) => a.name).join(', ')}
                  image={track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || 'https://via.placeholder.com/240'}
                  onClick={() => {
                    setCurrentQueue(recommendedTracks);
                    const idx = recommendedTracks.findIndex((t) => t.id === track.id);
                    playTrackAtIndex(idx >= 0 ? idx : 0);
                  }}
                />
              ))}
            </HorizontalScroller>
          </section>
        )}

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
            <div className="details-panel-header">
              <h3>
                {selectedView.type === 'album'
                  ? 'Album Songs'
                  : selectedView.type === 'artist'
                  ? 'Artist Top Songs'
                  : 'Playlist'}{' '}
                · {selectedView.title}
              </h3>
              {selectedView.type === 'playlist' && (
                <button
                  className="add-songs-btn"
                  onClick={() => setShowAddSongs(true)}
                  id="add-songs-to-playlist-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Songs
                </button>
              )}
            </div>
            {detailsLoading ? (
              <p>Loading songs...</p>
            ) : selectedTracks.length ? (
              <div className="track-table">
                <div className="track-head">
                  <span>#</span>
                  <span>Song</span>
                  <span>{selectedView.type === 'playlist' ? '' : 'Duration'}</span>
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
                      {selectedView.type === 'playlist' ? (
                        <button
                          className="track-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromPlaylist(selectedView.id, track.id);
                          }}
                          title="Remove from playlist"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      ) : (
                        <small>
                          {!track.uri
                            ? 'Unavailable'
                            : track.duration_ms
                            ? `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}`
                            : ''}
                        </small>
                      )}
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

      {showCreatePlaylist && (
        <CreatePlaylistModal
          onClose={() => setShowCreatePlaylist(false)}
          currentUser={currentUser}
          onPlaylistCreated={handlePlaylistCreated}
        />
      )}

      {showAddSongs && activePlaylistId && (
        <AddToPlaylistModal
          onClose={() => setShowAddSongs(false)}
          playlistId={activePlaylistId}
          playlistName={selectedView?.title || 'Playlist'}
          existingTrackIds={selectedTracks.map((t) => t.id)}
          onTracksAdded={() => {
            // Reload playlists and refresh the current view
            if (!currentUser) return;
            fetchUserPlaylists(currentUser._id || currentUser.id)
              .then((data) => {
                setPlaylists(data);
                const updated = data.find((p) => p._id === activePlaylistId);
                if (updated) openPlaylistDetails(updated);
              })
              .catch(() => {});
          }}
        />
      )}

      {showAiPlaylist && (
        <AiPlaylistModal 
          onClose={() => setShowAiPlaylist(false)} 
          isSpotifyAuthed={isSpotifyAuthed}
          currentUser={currentUser}
          onPlaylistSaved={() => {
            // Refresh sidebar playlists after AI playlist is saved
            if (!currentUser) return;
            fetchUserPlaylists(currentUser._id || currentUser.id)
              .then(setPlaylists)
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
