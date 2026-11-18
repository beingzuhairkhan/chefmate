const app = require('./app.json').expo;
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
const isProduction = process.env.NODE_ENV === 'production'
  || process.env.EAS_BUILD_PROFILE === 'production';

module.exports = {
  ...app,
  platforms: ["ios", "android", "web"],
  android: {
    ...app.android,
    usesCleartextTraffic: !isProduction && apiBaseUrl.startsWith('http://'),
  },
  updates: {
    url: "https://u.expo.dev/845ea349-df9f-4eeb-b306-d0842725e506"
  },
  runtimeVersion: "1.0.0",
  extra: {
    ...app.extra,
    eas: {
      projectId: "845ea349-df9f-4eeb-b306-d0842725e506"
    },
  },
};