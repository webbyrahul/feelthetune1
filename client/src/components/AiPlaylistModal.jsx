import { useState } from 'react';
import { generateAiPlaylist, saveToSpotifyPlaylist } from '../services/api';

const SUGGESTIONS = [
  "Late-night ghazals for relaxing",
  "Energetic gym songs",
  "90s Bollywood romance",
  "Rainy day indie vibes"
];

export default function AiPlaylistModal({ onClose, isSpotifyAuthed }) {
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
  const [savedUrl, setSavedUrl] = useState('');

  const handleGenerate = async (e, skipYear = false) => {
    if (e) e.preventDefault();
    if (!prompt.trim() && !genre.trim() && !artists.trim()) {
      setError('Please provide a prompt or at least a genre/artist.');
      return;
    }

    setLoading(true);
    setError('');
    setWarning('');
    setSavedUrl('');

    try {
      const payload = {
        prompt: prompt.trim(), // LLM handles this if present
        genre,
        artists: artists.split(',').map((a) => a.trim()).filter(Boolean),
        yearRange: skipYear ? '' : yearRange,
        mood,
        length: Number(length)
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

  const handleSave = async () => {
    if (!isSpotifyAuthed) {
      setError('You must be logged in with Spotify to save playlists.');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      const res = await saveToSpotifyPlaylist({
        title: generatedData.title,
        trackUris: generatedData.tracks.map(t => t.uri)
      });
      if (res.success) {
        setSavedUrl(res.externalUrl);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        let detailMsg = '';
        try {
          detailMsg = typeof err.response?.data?.details === 'string' 
            ? err.response?.data?.details 
            : JSON.stringify(err.response?.data?.details || {});
        } catch (e) { detailMsg = 'unparseable'; }
        
        setError(`Permission denied. Details: ${detailMsg}. You may need to re-authenticate.`);
      } else {
        setError(err.response?.data?.message || 'Failed to save to Spotify.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleShuffle = () => {
    if (!generatedData) return;
    const shuffled = [...generatedData.tracks].sort(() => Math.random() - 0.5);
    setGeneratedData({ ...generatedData, tracks: shuffled });
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
                <div key={i} className="ai-track-item">
                  <img src={track.album?.images?.[2]?.url || 'https://via.placeholder.com/40'} alt="cover" />
                  <div className="ai-track-info">
                    <strong>{track.name}</strong>
                    <small>{track.artists.map(a => a.name).join(', ')}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="ai-actions">
              {warning && (
                <button className="secondary" onClick={() => handleGenerate(null, true)} disabled={loading}>
                  Expand Search (Ignore Year)
                </button>
              )}
              <button className="secondary" onClick={handleShuffle}>Shuffle</button>
              <button className="secondary" onClick={() => setStep('input')}>Edit Details</button>
              
              {!savedUrl ? (
                error && error.includes('Permission denied') ? (
                  <button className="primary-btn" onClick={() => window.location.href = `http://localhost:5000/api/spotify/login?t=${Date.now()}`}>
                    Re-Authenticate Spotify
                  </button>
                ) : (
                  <button className="primary-btn" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save to Spotify'}
                  </button>
                )
              ) : (
                <a href={savedUrl} target="_blank" rel="noreferrer" className="btn-link">Open in Spotify</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
