export const environment = {
  apiBaseUrl: globalThis.location?.hostname === 'vindesertao-app.onrender.com'
    ? 'https://vindesertao-api.onrender.com'
    : '/api'
};
