import { useEffect, useMemo, useState } from 'react';
import Navbar from './components/Navbar';
import MediaCard from './components/MediaCard';
import HorizontalScroller from './components/HorizontalScroller';
import Footer from './components/Footer';
import { fetchRecommendations, searchMusic } from './services/api';

export default function App() {
  const [albums, setAlbums] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

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

  const topAlbums = useMemo(() => (results?.albums?.items || albums).slice(0, 20), [results, albums]);
  const artists = useMemo(() => (results?.artists?.items || []).slice(0, 20), [results]);

  return (
    <div className="app-shell">
      <Navbar query={query} onQueryChange={setQuery} onSearch={handleSearch} />

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
    </div>
  );
}
