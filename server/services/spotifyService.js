import axios from 'axios';

let accessToken = null;
let tokenExpiry = 0;
let tokenPromise = null;

const spotifyAuth = axios.create({
  baseURL: 'https://accounts.spotify.com/api'
});

const spotifyApi = axios.create({
  baseURL: 'https://api.spotify.com/v1'
});

const fetchNewToken = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials in environment variables');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const now = Date.now();

  const response = await spotifyAuth.post(
    '/token',
    new URLSearchParams({ grant_type: 'client_credentials' }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  accessToken = response.data.access_token;
  tokenExpiry = now + response.data.expires_in * 1000 - 30000;
  return accessToken;
};

const getAccessToken = async () => {
  const now = Date.now();
  if (accessToken && now < tokenExpiry) {
    return accessToken;
  }

  // Deduplicate concurrent refresh requests
  if (!tokenPromise) {
    tokenPromise = fetchNewToken().finally(() => {
      tokenPromise = null;
    });
  }

  return tokenPromise;
};

const spotifyRequest = async (url, params = {}, retry = true) => {
  try {
    const token = await getAccessToken();
    const response = await spotifyApi.get(url, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    // If Spotify invalidated the token early, clear cache and retry once
    if (retry && error.response?.status === 401) {
      accessToken = null;
      tokenExpiry = 0;
      return spotifyRequest(url, params, false);
    }
    const spotifyMessage = error.response?.data?.error?.message;
    if (spotifyMessage) {
      error.message = `Spotify API error: ${spotifyMessage}`;
    }
    throw error;
  }
};

export { spotifyRequest };
