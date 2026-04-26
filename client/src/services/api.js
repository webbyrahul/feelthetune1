import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL
});

export const fetchRecommendations = async () => {
  const response = await api.get('/music/recommendations');
  return response.data.albums || [];
};

export const fetchPersonalizedRecommendations = async () => {
  const response = await api.get('/music/personalized-recommendations');
  return response.data;
};

export const searchMusic = async (query, options = {}) => {
  const { type = 'track,album,artist', limit = 20 } = options;
  const response = await api.get('/music/search', {
    params: { q: query, type, limit }
  });
  return response.data;
};

export const fetchLikedTracks = async (userId) => {
  const response = await api.get(`/likes/${userId}`);
  return response.data;
};

export const likeTrack = async (payload) => {
  const response = await api.post('/likes', payload);
  return response.data;
};

export const createPlaylist = async (payload) => {
  const response = await api.post('/playlists', payload);
  return response.data;
};

export const addTrackToPlaylist = async (playlistId, payload) => {
  const response = await api.post(`/playlists/${playlistId}/tracks`, payload);
  return response.data;
};

export const fetchUserPlaylists = async (userId) => {
  const response = await api.get(`/playlists/${userId}`);
  return response.data;
};

export const removeTrackFromPlaylist = async (playlistId, trackId) => {
  const response = await api.delete(`/playlists/${playlistId}/tracks/${trackId}`);
  return response.data;
};

export const deletePlaylist = async (playlistId) => {
  const response = await api.delete(`/playlists/${playlistId}`);
  return response.data;
};

export const signup = async (payload) => {
  const response = await api.post('/auth/signup', payload);
  return response.data;
};

export const login = async (payload) => {
  const response = await api.post('/auth/login', payload);
  return response.data;
};

export const fetchArtistsByIds = async (artistIds) => {
  const response = await api.get('/music/artists', {
    params: { ids: artistIds.join(',') }
  });
  return response.data.artists || [];
};

export const fetchAlbumTracks = async (albumId) => {
  const response = await api.get(`/music/album-tracks/${albumId}`);
  return response.data;
};

export const fetchArtistTopTracks = async (artistId, artistName = '') => {
  const response = await api.get(`/music/artist-top-tracks/${artistId}`, {
    params: { artistName }
  });
  return response.data.tracks || [];
};

export const fetchSpotifyAccessToken = async () => {
  const response = await api.get('/spotify/token');
  return response.data;
};

export const fetchRecentlyPlayed = async () => {
  const response = await api.get('/music/recently-played');
  return response.data.tracks || [];
};

export const getSpotifyLoginUrl = () => `${API_BASE_URL}/spotify/login?t=${Date.now()}`;

export const generateAiPlaylist = async (payload) => {
  const response = await api.post('/music/generate-playlist', payload);
  return response.data;
};

export const saveToSpotifyPlaylist = async (payload) => {
  const response = await api.post('/music/save-to-spotify', payload);
  return response.data;
};

export const upgradeToPremium = async (userId) => {
  const response = await api.post('/auth/upgrade-premium', { userId });
  return response.data;
};

export const getRazorpayKey = async () => {
  const response = await api.get('/payment/key');
  return response.data;
};

export const createPaymentOrder = async (payload) => {
  const response = await api.post('/payment/create-order', payload);
  return response.data;
};

export const verifyPayment = async (payload) => {
  const response = await api.post('/payment/verify', payload);
  return response.data;
};
