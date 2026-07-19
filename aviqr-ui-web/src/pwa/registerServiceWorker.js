// Service Worker registration — see public/sw.js for the caching logic.
//
// Framework-agnostic on purpose (no React imports): this module owns the
// browser SW lifecycle only. UI for "a new version is available" is a
// separate concern — see src/components/UpdateAvailableBanner.jsx, which
// listens for the CustomEvent dispatched below.
//
// Update flow: public/sw.js calls self.skipWaiting() during `install`, so a
// new worker activates (and cleans up old caches) automatically, with no
// action required from the user or this module — that's what makes cache
// updates automatic on every deploy. The only thing gated behind a user
// action is *reloading the already-open tab*: the tab's in-memory JS is
// still the old version until it reloads, and forcing that reload silently
// mid-order (mid-checkout, mid-payment) would be a bad idea, so we surface
// a banner instead and let the customer choose when to refresh.

export const SW_UPDATE_EVENT = 'aviqr:sw-update-available';

/**
 * Registers the Service Worker. Safe to call unconditionally: it no-ops in
 * dev (registering a SW against the Vite dev server is a classic footgun —
 * it can serve stale cached modules over HMR) and on browsers without SW
 * support (older iOS Safari, some in-app webviews). Service Workers also
 * only register at all on HTTPS or localhost — anything else is rejected
 * by the browser itself, no separate feature-detection needed for that.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      // Capture this BEFORE registering: `clients.claim()` in sw.js's
      // `activate` means even a brand-new install fires `controllerchange`
      // shortly after page load — the only way to tell "first-ever
      // activation" apart from "a real update replacing an older worker"
      // is whether this tab already had a controller before we started.
      const hadControllerBeforeRegister = Boolean(navigator.serviceWorker.controller);

      await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // Fires once a worker takes over this tab — by this point sw.js has
      // already installed, cleaned up old caches, and activated on its
      // own. All that's left is telling the open tab that a reload would
      // pick up the new JS/CSS bundle.
      let announced = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadControllerBeforeRegister || announced) return;
        announced = true;
        window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT));
      });
    } catch (err) {
      // Registration failure should never break the app — it just means
      // no offline/PWA support for this session.
      console.warn('[SW] registration failed:', err);
    }
  });
}
