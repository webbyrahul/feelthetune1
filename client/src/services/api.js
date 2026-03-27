import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL
});

export const fetchRecommendations = async () => {
  const response = await api.get('/music/recommendations');
  return response.data.albums || [];
};

export const searchMusic = async (query) => {
  const response = await api.get('/music/search', {
    params: { q: query, type: 'track,album,artist', limit: 20 }
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

export const fetchArtistTopTracks = async (artistId) => {
  const response = await api.get(`/music/artist-top-tracks/${artistId}`);
  return response.data.tracks || [];
};
