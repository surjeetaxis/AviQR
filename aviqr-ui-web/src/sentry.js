/**
 * Sentry — crash reporting and performance monitoring.
 *
 * ADD to aviqr-ui-web/package.json:
 *   "@sentry/react": "^8.0.0"
 *
 * This file is imported once in main.jsx BEFORE <App/> renders.
 *
 * In main.jsx:
 *   import './sentry.js';          // must be first import
 *   import App from './App.jsx';
 *
 * Set VITE_SENTRY_DSN in .env.production:
 *   VITE_SENTRY_DSN=https://your-key@sentry.io/project-id
 */
import * as Sentry from '@sentry/react';

const DSN = import.meta.env?.VITE_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env?.MODE || 'production',
    release: 'aviqr-web@1.0.0',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate:   0.2,   // 20% of transactions sampled for performance
    replaysSessionSampleRate:  0.05,  // 5% of sessions recorded
    replaysOnErrorSampleRate:  1.0,   // 100% of error sessions recorded
    beforeSend(event) {
      // Strip sensitive data before sending to Sentry
      if (event.request?.headers?.Authorization) {
        delete event.request.headers.Authorization;
      }
      return event;
    },
  });
  console.info('[Sentry] Initialised — environment:', import.meta.env?.MODE);
} else {
  console.info('[Sentry] DSN not set — crash reporting disabled (set VITE_SENTRY_DSN to enable)');
}

export default Sentry;
