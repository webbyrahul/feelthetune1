import axios from 'axios';

let accessToken = null;
let tokenExpiry = 0;

const spotifyAuth = axios.create({
  baseURL: 'https://accounts.spotify.com/api'
});

const spotifyApi = axios.create({
  baseURL: 'https://api.spotify.com/v1'
});

const getAccessToken = async () => {
  const now = Date.now();
  if (accessToken && now < tokenExpiry) {
    return accessToken;
  }

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
  tokenExpiry = now + response.data.expires_in * 1000 - 30000;
  return accessToken;
};

const spotifyRequest = async (url, params = {}) => {
  const token = await getAccessToken();
  const response = await spotifyApi.get(url, {
    params,
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export { spotifyRequest };
