const store = {
  accessToken: '',
  refreshToken: '',
  expiresAt: 0,
  scope: ''
};

export const setSpotifyTokens = ({ accessToken, refreshToken, expiresIn, scope }) => {
  store.accessToken = accessToken;
  if (refreshToken) store.refreshToken = refreshToken;
  if (scope) store.scope = scope;
  store.expiresAt = Date.now() + Number(expiresIn || 3600) * 1000 - 30000;
};

export const getSpotifyTokens = () => ({ ...store });

export const hasValidAccessToken = () => !!store.accessToken && Date.now() < store.expiresAt;
