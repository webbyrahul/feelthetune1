const store = {
  accessToken: '',
  refreshToken: '',
  expiresAt: 0
};

export const setSpotifyTokens = ({ accessToken, refreshToken, expiresIn }) => {
  store.accessToken = accessToken;
  if (refreshToken) store.refreshToken = refreshToken;
  store.expiresAt = Date.now() + Number(expiresIn || 3600) * 1000 - 30000;
};

export const getSpotifyTokens = () => ({ ...store });

export const hasValidAccessToken = () => !!store.accessToken && Date.now() < store.expiresAt;
