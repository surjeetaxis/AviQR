/**
 * Sentry — crash reporting for Expo React Native.
 *
 * ADD to aviqr-mobile-expo/package.json:
 *   "@sentry/react-native": "^5.0.0"
 *
 * ADD to app.json plugins:
 *   "@sentry/react-native/expo"
 *
 * In app/_layout.js (root layout):
 *   import '../src/sentry.js';
 *
 * Set SENTRY_DSN in app.json extra or EAS environment:
 *   extra: { sentryDsn: "https://..." }
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = Constants.expoConfig?.extra?.sentryDsn;

if (dsn) {
  Sentry.init({
    dsn,
    environment:  __DEV__ ? 'development' : 'production',
    release:      'aviqr-mobile@1.0.0',
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
    beforeSend(event) {
      // Don't send errors in dev (noise reduction)
      if (__DEV__) return null;
      return event;
    },
  });
  console.log('[Sentry] Mobile crash reporting initialised');
} else {
  console.log('[Sentry] Mobile DSN not set — set extra.sentryDsn in app.json');
}

export default Sentry;
