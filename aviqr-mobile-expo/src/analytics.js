/**
 * Google Analytics (GA4) — sent via the Measurement Protocol HTTPS API.
 *
 * aviqr-ui-web loads gtag.js directly in the browser, but there's no
 * browser here, so screen views and events are POSTed straight to GA4's
 * collect endpoint instead: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 *
 * Set EXPO_PUBLIC_GA_MEASUREMENT_ID (same property as aviqr-ui-web:
 * G-GVW95252XV) and EXPO_PUBLIC_GA_API_SECRET to enable. Create the secret
 * in GA4 Admin > Data Streams > the app's stream > Measurement Protocol
 * API secrets — it's separate from the measurement ID. Either var unset
 * (local dev by default) means every call below is a no-op — nothing is
 * sent to Google.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { tokenStorage } from './api/tokenStorage.js';

const MEASUREMENT_ID = process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID;
const API_SECRET = process.env.EXPO_PUBLIC_GA_API_SECRET;
const ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const CLIENT_ID_KEY = 'aviqr_ga_client_id';

const ENABLED = Boolean(MEASUREMENT_ID && API_SECRET);

let clientIdPromise = null;

function getClientId() {
  if (!clientIdPromise) {
    clientIdPromise = (async () => {
      let id = await tokenStorage.get(CLIENT_ID_KEY);
      if (!id) {
        id = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
        await tokenStorage.set(CLIENT_ID_KEY, id);
      }
      return id;
    })();
  }
  return clientIdPromise;
}

async function send(events) {
  if (!ENABLED) return;
  try {
    const client_id = await getClientId();
    await fetch(`${ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`, {
      method: 'POST',
      body: JSON.stringify({
        client_id,
        user_properties: { platform: { value: Platform.OS } },
        events,
      }),
    });
  } catch {
    // Best-effort — analytics must never break the app.
  }
}

export function trackScreenView(screenName) {
  send([{
    name: 'screen_view',
    params: {
      screen_name: screenName,
      app_name: 'AviQR',
      app_version: Constants.expoConfig?.version,
    },
  }]);
}

export function trackEvent(name, params = {}) {
  send([{ name, params }]);
}
