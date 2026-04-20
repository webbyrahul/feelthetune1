import { useState, useCallback, useRef } from 'react';
import { searchMusic, createPlaylist, addTrackToPlaylist } from '../services/api';

export default function CreatePlaylistModal({ onClose, currentUser, onPlaylistCreated }) {
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [chosenTracks, setChosenTracks] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await searchMusic(q.trim(), { type: 'track', limit: 15 });
      setSearchResults(data.tracks?.items || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const onSearchInput = (value) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 400);
  };

  const addTrack = (track) => {
    if (chosenTracks.some((t) => t.id === track.id)) return;
    setChosenTracks((prev) => [...prev, track]);
  };

  const removeTrack = (trackId) => {
    setChosenTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  const handleCreate = async () => {
    if (!playlistName.trim()) {
      setError('Please enter a playlist name.');
      return;
    }
    if (!currentUser) {
      setError('You must be logged in to create a playlist.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const playlist = await createPlaylist({
        userId: currentUser._id || currentUser.id,
        name: playlistName.trim(),
        description: playlistDesc.trim()
      });

      // Add all chosen tracks to the playlist
      for (const track of chosenTracks) {
        await addTrackToPlaylist(playlist._id, {
          trackId: track.id,
          name: track.name,
          artist: (track.artists || []).map((a) => a.name).join(', '),
          album: track.album?.name || '',
          imageUrl: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
          previewUrl: track.preview_url || '',
          uri: track.uri || ''
        });
      }

      if (onPlaylistCreated) onPlaylistCreated({ ...playlist, tracks: chosenTracks });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create playlist.');
    } finally {
      setCreating(false);
    }
  };

  const isTrackChosen = (trackId) => chosenTracks.some((t) => t.id === trackId);

  const fmtDuration = (ms) => {
    if (!ms) return '—';
    return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal playlist-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="playlist-modal-header">
          <h2>Create Playlist</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <p className="error playlist-error">{error}</p>}

        {/* Playlist info */}
        <div className="playlist-info-fields">
          <input
            type="text"
            placeholder="Playlist name"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            id="playlist-name-input"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={playlistDesc}
            onChange={(e) => setPlaylistDesc(e.target.value)}
            id="playlist-desc-input"
          />
        </div>

        {/* Search songs */}
        <div className="playlist-search-wrap">
          <div className="playlist-search-bar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search songs to add..."
              value={searchQuery}
              onChange={(e) => onSearchInput(e.target.value)}
              id="playlist-search-input"
            />
          </div>

          {searching && <p className="playlist-searching">Searching...</p>}

          {searchResults.length > 0 && (
            <ul className="playlist-search-results">
              {searchResults.map((track) => (
                <li key={track.id} className={isTrackChosen(track.id) ? 'already-added' : ''}>
                  <img
                    src={track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || 'https://via.placeholder.com/40'}
                    alt={track.name}
                  />
                  <div className="search-result-info">
                    <span className="search-result-name">{track.name}</span>
                    <small>{(track.artists || []).map((a) => a.name).join(', ')}</small>
                  </div>
                  <small className="search-result-dur">{fmtDuration(track.duration_ms)}</small>
                  <button
                    className={`add-track-btn ${isTrackChosen(track.id) ? 'added' : ''}`}
                    onClick={() => isTrackChosen(track.id) ? removeTrack(track.id) : addTrack(track)}
                    title={isTrackChosen(track.id) ? 'Remove' : 'Add'}
                  >
                    {isTrackChosen(track.id) ? '✓' : '+'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Chosen tracks */}
        {chosenTracks.length > 0 && (
          <div className="chosen-tracks-section">
            <h4>
              <span className="chosen-count">{chosenTracks.length}</span> song{chosenTracks.length !== 1 ? 's' : ''} selected
            </h4>
            <ul className="chosen-track-list">
              {chosenTracks.map((track, index) => (
                <li key={track.id}>
                  <span className="chosen-index">{index + 1}</span>
                  <img
                    src={track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || 'https://via.placeholder.com/32'}
                    alt={track.name}
                  />
                  <div className="chosen-track-info">
                    <span>{track.name}</span>
                    <small>{(track.artists || []).map((a) => a.name).join(', ')}</small>
                  </div>
                  <button className="remove-track-btn" onClick={() => removeTrack(track.id)} title="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Create button */}
        <button
          className="create-playlist-submit"
          onClick={handleCreate}
          disabled={creating || !playlistName.trim()}
          id="create-playlist-btn"
        >
          {creating ? 'Creating...' : `Create Playlist${chosenTracks.length ? ` (${chosenTracks.length} songs)` : ''}`}
        </button>
      </div>
    </div>
  );
}
