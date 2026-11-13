const app = require('./app.json').expo;
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
const isProduction = process.env.NODE_ENV === 'production'
  || process.env.EAS_BUILD_PROFILE === 'production';

module.exports = {
  ...app,
  android: {
    ...app.android,
    usesCleartextTraffic: !isProduction && apiBaseUrl.startsWith('http://'),
  },
};
