import { useState, useCallback, useRef } from 'react';
import { searchMusic, addTrackToPlaylist } from '../services/api';

export default function AddToPlaylistModal({ onClose, playlistId, playlistName, existingTrackIds, onTracksAdded }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addedIds, setAddedIds] = useState(new Set(existingTrackIds || []));
  const [adding, setAdding] = useState(null);
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

  const handleAdd = async (track) => {
    if (addedIds.has(track.id)) return;
    setAdding(track.id);
    try {
      await addTrackToPlaylist(playlistId, {
        trackId: track.id,
        name: track.name,
        artist: (track.artists || []).map((a) => a.name).join(', '),
        album: track.album?.name || '',
        imageUrl: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
        previewUrl: track.preview_url || '',
        uri: track.uri || ''
      });
      setAddedIds((prev) => new Set([...prev, track.id]));
      if (onTracksAdded) onTracksAdded();
    } catch {
      // silent
    } finally {
      setAdding(null);
    }
  };

  const fmtDuration = (ms) => {
    if (!ms) return '—';
    return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal playlist-modal add-songs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="playlist-modal-header">
          <div>
            <h2>Add Songs</h2>
            <small className="add-songs-subtitle">to {playlistName}</small>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

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
              autoFocus
              id="add-songs-search-input"
            />
          </div>

          {searching && <p className="playlist-searching">Searching...</p>}

          {searchResults.length > 0 && (
            <ul className="playlist-search-results add-songs-results">
              {searchResults.map((track) => {
                const isAdded = addedIds.has(track.id);
                const isAdding = adding === track.id;
                return (
                  <li key={track.id} className={isAdded ? 'already-added' : ''}>
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
                      className={`add-track-btn ${isAdded ? 'added' : ''}`}
                      onClick={() => handleAdd(track)}
                      disabled={isAdded || isAdding}
                      title={isAdded ? 'Already added' : 'Add to playlist'}
                    >
                      {isAdding ? '…' : isAdded ? '✓' : '+'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!searching && !searchResults.length && searchQuery && (
            <p className="playlist-searching">No results found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
