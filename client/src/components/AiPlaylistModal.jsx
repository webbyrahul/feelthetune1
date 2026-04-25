import { useState } from 'react';
import { generateAiPlaylist, createPlaylist, addTrackToPlaylist } from '../services/api';

const SUGGESTIONS = [
  "Late-night ghazals for relaxing",
  "Energetic gym songs",
  "90s Bollywood romance",
  "Rainy day indie vibes"
];

export default function AiPlaylistModal({ onClose, isSpotifyAuthed, currentUser, onPlaylistSaved }) {
  const [step, setStep] = useState('input'); // 'input' | 'results'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  // Primary Prompt State
  const [prompt, setPrompt] = useState('');

  // Secondary Advanced Form States
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [genre, setGenre] = useState('');
  const [artists, setArtists] = useState('');
  const [yearRange, setYearRange] = useState('');
  const [mood, setMood] = useState('');
  const [length, setLength] = useState(20);

  const [generatedData, setGeneratedData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleGenerate = async (e, skipYear = false) => {
    if (e) e.preventDefault();
    if (!prompt.trim() && !genre.trim() && !artists.trim()) {
      setError('Please provide a prompt or at least a genre/artist.');
      return;
    }

    setLoading(true);
    setError('');
    setWarning('');
    setSaved(false);

    try {
      const payload = {
        prompt: prompt.trim(),
        genre,
        artists: artists.split(',').map((a) => a.trim()).filter(Boolean),
        yearRange: skipYear ? '' : yearRange,
        mood,
        length: Math.max(Number(length), 15) // Ensure at least 15 songs requested
      };

      const data = await generateAiPlaylist(payload);
      
      if (!data.tracks || data.tracks.length === 0) {
        setError('No tracks found matching your criteria. Try rephrasing or expanding your search.');
      } else {
        setGeneratedData(data);
        if (data.warning) setWarning(data.warning);
        setStep('results');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate playlist.');
    } finally {
      setLoading(false);
    }
  };

  // Remove a track from the generated list before saving
  const handleRemoveTrack = (index) => {
    if (!generatedData) return;
    const updated = generatedData.tracks.filter((_, i) => i !== index);
    setGeneratedData({ ...generatedData, tracks: updated });
  };

  // Shuffle: re-fetch from backend to get fresh songs, keeping ~50% of current tracks
  const handleShuffle = async () => {
    if (!generatedData || loading) return;
    setLoading(true);
    setError('');

    try {
      const payload = {
        prompt: prompt.trim(),
        genre,
        artists: artists.split(',').map((a) => a.trim()).filter(Boolean),
        yearRange,
        mood,
        length: Math.max(Number(length), 15)
      };

      const freshData = await generateAiPlaylist(payload);
      
      if (!freshData.tracks || freshData.tracks.length === 0) {
        // If re-fetch fails, just do a simple reorder as fallback
        const shuffled = [...generatedData.tracks].sort(() => Math.random() - 0.5);
        setGeneratedData({ ...generatedData, tracks: shuffled });
        return;
      }

      // Keep ~50% of old tracks, replace the rest with new ones
      const currentIds = new Set(generatedData.tracks.map(t => t.id));
      const newTracks = freshData.tracks.filter(t => !currentIds.has(t.id));
      
      const halfCount = Math.ceil(generatedData.tracks.length / 2);
      const kept = generatedData.tracks.slice(0, halfCount);
      const replacements = newTracks.slice(0, generatedData.tracks.length - halfCount);
      
      // Combine kept + new, then shuffle the order
      const combined = [...kept, ...replacements].sort(() => Math.random() - 0.5);
      
      setGeneratedData({
        ...generatedData,
        tracks: combined.length > 0 ? combined : freshData.tracks
      });
    } catch {
      // Fallback: just reorder existing tracks
      const shuffled = [...generatedData.tracks].sort(() => Math.random() - 0.5);
      setGeneratedData({ ...generatedData, tracks: shuffled });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToLocalPlaylist = async () => {
    if (!currentUser) {
      setError('You must be logged in to save playlists.');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      const userId = currentUser._id || currentUser.id;
      
      // 1. Create a new local playlist in MongoDB
      const newPlaylist = await createPlaylist({
        userId,
        name: generatedData.title || 'AI Generated Playlist',
        description: `AI playlist: ${prompt || 'Custom mix'}`
      });
      
      // 2. Add each track to the local playlist
      for (const track of generatedData.tracks) {
        try {
          await addTrackToPlaylist(newPlaylist._id, {
            trackId: track.id,
            name: track.name,
            artist: (track.artists || []).map(a => a.name).join(', '),
            album: track.album?.name || '',
            imageUrl: track.album?.images?.[0]?.url || track.album?.images?.[1]?.url || '',
            previewUrl: track.preview_url || '',
            uri: track.uri || ''
          });
        } catch {
          // Skip tracks that fail to add (e.g. duplicates)
        }
      }
      
      setSaved(true);
      
      // Notify parent to refresh sidebar playlists
      if (onPlaylistSaved) onPlaylistSaved();
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save playlist.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal ai-playlist-modal">
        <button className="modal-close" onClick={onClose}>×</button>
        
        <h2>✨ AI Playlist Creator</h2>
        
        {error && <p className="error">{error}</p>}
        {warning && <p className="warning">{warning}</p>}
        
        {step === 'input' && (
          <form onSubmit={handleGenerate} className="ai-playlist-form">
            <div className="form-group prompt-group">
              <label>Describe the playlist you want...</label>
              <textarea 
                className="ai-prompt-input"
                placeholder="e.g. Late-night ghazals for relaxing" 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
            </div>

            <div className="ai-suggestions">
              {SUGGESTIONS.map((sug, idx) => (
                <span 
                  key={idx} 
                  className="ai-suggestion-chip"
                  onClick={() => setPrompt(sug)}
                >
                  {sug}
                </span>
              ))}
            </div>

            <div className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
            </div>

            {showAdvanced && (
              <div className="advanced-filters">
                <div className="form-group">
                  <label>Genre / Style</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Ghazals, Pop, Lo-fi" 
                    value={genre} 
                    onChange={(e) => setGenre(e.target.value)} 
                  />
                </div>
                
                <div className="form-group">
                  <label>Artists (comma-separated)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Jagjit Singh, Arijit Singh" 
                    value={artists} 
                    onChange={(e) => setArtists(e.target.value)} 
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Year Range</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1990-2010" 
                      value={yearRange} 
                      onChange={(e) => setYearRange(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Mood</label>
                    <select value={mood} onChange={(e) => setMood(e.target.value)}>
                      <option value="">Any</option>
                      <option value="relaxing">Relaxing</option>
                      <option value="sad">Sad / Melancholy</option>
                      <option value="romantic">Romantic</option>
                      <option value="party">Party / Upbeat</option>
                      <option value="nostalgic">Nostalgic</option>
                      <option value="focus">Focus</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Length</label>
                    <select value={length} onChange={(e) => setLength(e.target.value)}>
                      <option value="10">10 songs</option>
                      <option value="20">20 songs</option>
                      <option value="30">30 songs</option>
                      <option value="50">50 songs</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="primary-btn generate-btn" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Playlist'}
            </button>
          </form>
        )}

        {step === 'results' && generatedData && (
          <div className="ai-results">
            <div className="ai-results-header">
              <h3>{generatedData.title}</h3>
              <p>{generatedData.tracks.length} tracks</p>
            </div>
            
            <div className="ai-tracklist">
              {generatedData.tracks.map((track, i) => (
                <div key={`${track.id}-${i}`} className="ai-track-item">
                  <img src={track.album?.images?.[2]?.url || 'https://via.placeholder.com/40'} alt="cover" />
                  <div className="ai-track-info">
                    <strong>{track.name}</strong>
                    <small>{track.artists.map(a => a.name).join(', ')}</small>
                  </div>
                  <button 
                    className="ai-track-remove" 
                    onClick={() => handleRemoveTrack(i)}
                    title="Remove this track"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="ai-actions">
              {warning && (
                <button className="secondary" onClick={() => handleGenerate(null, true)} disabled={loading}>
                  Expand Search (Ignore Year)
                </button>
              )}
              <button className="secondary" onClick={handleShuffle} disabled={loading}>
                {loading ? 'Refreshing...' : '🔀 Shuffle & Refresh'}
              </button>
              <button className="secondary" onClick={() => setStep('input')}>Edit Details</button>
              
              {!saved ? (
                <button className="primary-btn" onClick={handleSaveToLocalPlaylist} disabled={saving || !currentUser}>
                  {saving ? 'Saving...' : !currentUser ? 'Login to Save' : 'Save to My Playlists'}
                </button>
              ) : (
                <span className="saved-label">✅ Saved to Your Playlists!</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
