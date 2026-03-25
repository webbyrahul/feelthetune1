import axios from 'axios';

let accessToken = null;
let tokenExpiry = 0;
let pendingTokenRequest = null;

const spotifyAuth = axios.create({
  baseURL: 'https://accounts.spotify.com/api'
});

const spotifyApi = axios.create({
  baseURL: 'https://api.spotify.com/v1'
});

const refreshAccessToken = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials in environment variables');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

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
  tokenExpiry = Date.now() + response.data.expires_in * 1000 - 30000;
  return accessToken;
};

const getAccessToken = async () => {
  const now = Date.now();
  if (accessToken && now < tokenExpiry) {
    return accessToken;
  }

  // Deduplicate concurrent refresh requests
  if (!pendingTokenRequest) {
    pendingTokenRequest = refreshAccessToken().finally(() => {
      pendingTokenRequest = null;
    });
  }

  return pendingTokenRequest;
};

const spotifyRequest = async (url, params = {}) => {
  try {
    const token = await getAccessToken();
    const response = await spotifyApi.get(url, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    // On 401, clear cached token and retry once to handle early invalidation / clock skew
    if (error.response?.status === 401) {
      accessToken = null;
      tokenExpiry = 0;
      try {
        const freshToken = await getAccessToken();
        const retryResponse = await spotifyApi.get(url, {
          params,
          headers: { Authorization: `Bearer ${freshToken}` }
        });
        return retryResponse.data;
      } catch (retryError) {
        const spotifyMessage = retryError.response?.data?.error?.message;
        if (spotifyMessage) {
          retryError.message = `Spotify API error: ${spotifyMessage}`;
        }
        throw retryError;
      }
    }

    const spotifyMessage = error.response?.data?.error?.message;
    if (spotifyMessage) {
      error.message = `Spotify API error: ${spotifyMessage}`;
    }
    throw error;
  }
};

export { spotifyRequest };
