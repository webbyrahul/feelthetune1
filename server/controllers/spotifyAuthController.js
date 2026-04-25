import axios from 'axios';
import { getSpotifyTokens, hasValidAccessToken, setSpotifyTokens } from '../services/spotifyOAuthStore.js';

const buildAuthHeader = () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
};

const redirectUri = () => process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/spotify/callback';

export const spotifyLogin = (_req, res) => {
  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state',
    'user-read-recently-played',
    'user-top-read',
    'playlist-modify-public',
    'playlist-modify-private'
  ].join(' ');

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', process.env.SPOTIFY_CLIENT_ID || '');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('redirect_uri', redirectUri());
  authUrl.searchParams.set('show_dialog', 'true');
  return res.redirect(authUrl.toString());
};

export const spotifyCallback = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ message: 'Missing code from Spotify callback' });

    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri()
      }),
      {
        headers: {
          Authorization: buildAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    setSpotifyTokens({
      accessToken: tokenResponse.data.access_token,
      refreshToken: tokenResponse.data.refresh_token,
      expiresIn: tokenResponse.data.expires_in,
      scope: tokenResponse.data.scope // Pass the scope to the store
    });

    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}?spotify_auth=success`);
  } catch (error) {
    next(error);
  }
};

export const refreshSpotifyToken = async () => {
  const tokens = getSpotifyTokens();
  if (!tokens.refreshToken) {
    throw new Error('No Spotify refresh token available. Re-authentication required.');
  }

  const tokenResponse = await axios.post(
    'https://accounts.spotify.com/api/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken
    }),
    {
      headers: {
        Authorization: buildAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  setSpotifyTokens({
    accessToken: tokenResponse.data.access_token,
    refreshToken: tokenResponse.data.refresh_token || tokens.refreshToken,
    expiresIn: tokenResponse.data.expires_in,
    scope: tokenResponse.data.scope || tokens.scope
  });

  return getSpotifyTokens().accessToken;
};

export const getSpotifyAccessToken = async (_req, res, next) => {
  try {
    if (!hasValidAccessToken()) {
      await refreshSpotifyToken();
    }

    const tokens = getSpotifyTokens();
    if (!tokens.accessToken) {
      return res.status(401).json({ message: 'Spotify not authenticated. Login required.' });
    }

    return res.json({ accessToken: tokens.accessToken, expiresAt: tokens.expiresAt });
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
};
