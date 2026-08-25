/**
 * Google Analytics (GA4) — loaded via gtag.js.
 *
 * Set VITE_GA_MEASUREMENT_ID in .env.production (or wherever the build
 * pipeline injects VITE_ vars — see package-release.sh) to enable. Unset
 * (local dev, staging) means no script is injected and every call below
 * is a no-op — nothing is sent to Google.
 *
 * gtag.js only fires a pageview on initial script load; it has no idea
 * when React Router swaps routes client-side. usePageViews() (in
 * hooks/useAnalytics.js) sends the pageview on every route change instead.
 */
const MEASUREMENT_ID = import.meta.env?.VITE_GA_MEASUREMENT_ID;

let initialized = false;

export function initAnalytics() {
  if (!MEASUREMENT_ID || initialized) return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('js', new Date());
  // send_page_view: false — usePageViews() sends the initial pageview too,
  // once per route, so there's exactly one source of truth for pageviews.
  gtag('config', MEASUREMENT_ID, { send_page_view: false });
}

export function trackPageview(path) {
  if (!MEASUREMENT_ID || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function trackEvent(name, params = {}) {
  if (!MEASUREMENT_ID || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}
