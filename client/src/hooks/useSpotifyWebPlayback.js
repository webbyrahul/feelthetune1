import { useEffect, useMemo, useRef, useState } from 'react';

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

export default function useSpotifyWebPlayback(accessToken, refreshAccessToken) {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const scriptAddedRef = useRef(false);

  useEffect(() => {
    if (!accessToken) return;

    const setupPlayer = () => {
      if (!window.Spotify) return;

      const webPlayer = new window.Spotify.Player({
        name: 'My Web Player',
        getOAuthToken: (cb) => cb(accessToken),
        volume: 0.8
      });

      webPlayer.addListener('ready', ({ device_id }) => {
        console.log('[Spotify SDK] ready. device_id:', device_id);
        setDeviceId(device_id);
      });

      webPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('[Spotify SDK] not ready. device_id:', device_id);
      });

      webPlayer.addListener('initialization_error', ({ message }) => {
        console.error('[Spotify SDK] initialization_error:', message);
        setError(message);
      });
      webPlayer.addListener('authentication_error', ({ message }) => {
        console.error('[Spotify SDK] authentication_error:', message);
        setError('Token expired or invalid. Please login again.');
      });
      webPlayer.addListener('account_error', ({ message }) => {
        console.error('[Spotify SDK] account_error:', message);
        setError(message);
      });
      webPlayer.addListener('playback_error', ({ message }) => {
        console.error('[Spotify SDK] playback_error:', message);
        setError(message);
      });

      webPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;
        setIsPlaying(!state.paused);
        setPosition(state.position || 0);
        setDuration(state.duration || 0);

        const track = state.track_window.current_track;
        if (track) {
          setCurrentTrack({
            id: track.id,
            name: track.name,
            uri: track.uri,
            artists: track.artists || [],
            album: {
              name: track.album?.name,
              images: track.album?.images || []
            }
          });
        }
      });

      webPlayer.connect().then((success) => {
        console.log('[Spotify SDK] connect result:', success);
      });

      setPlayer(webPlayer);
    };

    if (window.Spotify) {
      setupPlayer();
      return;
    }

    if (!scriptAddedRef.current) {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      document.body.appendChild(script);
      scriptAddedRef.current = true;
    }

    window.onSpotifyWebPlaybackSDKReady = setupPlayer;

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [accessToken]);

  const playTrack = async (trackUri, queueUris = [trackUri], offset = 0) => {
    try {
      if (!accessToken) throw new Error('Missing Spotify access token');
      const endpoint = deviceId
        ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
        : 'https://api.spotify.com/v1/me/player/play';
      if (!deviceId) {
        console.warn('[Spotify Play API] deviceId missing, trying active device fallback');
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: queueUris,
          offset: { position: offset }
        })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[Spotify Play API] error:', response.status, text);
        if (response.status === 401 && refreshAccessToken) {
          await refreshAccessToken();
          throw new Error('RETRY_PLAYBACK');
        }
        if (response.status === 404 && deviceId) {
          await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ device_ids: [deviceId], play: false })
          });
          throw new Error('RETRY_PLAYBACK');
        }
        if (response.status === 404) throw new Error('Device not found. Open Spotify app on any device and retry.');
        throw new Error(`Playback failed (${response.status})`);
      }

      console.log('[Spotify Play API] playback started for:', trackUri);
      setError('');
    } catch (err) {
      if (err.message === 'RETRY_PLAYBACK') {
        return playTrack(trackUri, queueUris, offset);
      }
      console.error('[Spotify Play API] failed:', err);
      setError(err.message || 'Failed to play track');
      throw err;
    }
  };

  const controls = useMemo(
    () => ({
      togglePlay: async () => {
        if (!player) return;
        await player.togglePlay();
      },
      nextTrack: async () => {
        if (!player) return;
        await player.nextTrack();
      },
      previousTrack: async () => {
        if (!player) return;
        await player.previousTrack();
      },
      seek: async (ms) => {
        if (!player) return;
        await player.seek(ms);
      }
    }),
    [player]
  );

  return {
    player,
    deviceId,
    isPlaying,
    currentTrack,
    position,
    duration,
    error,
    setError,
    playTrack,
    ...controls
  };
}
