/* eslint-disable no-restricted-globals */
/**
 * AviQR Service Worker
 * ─────────────────────────────────────────────────────────────────────────
 * Scope: the whole app (registered at "/", see src/pwa/registerServiceWorker.js).
 * Goal: near-instant repeat loads after a customer scans a table QR code,
 * while never risking stale or cached responses for anything money- or
 * session-sensitive (auth, cart, orders, payments, table/QR state, stock,
 * customer profile).
 *
 * __BUILD_ID__ below is replaced at build time (see vite.config.js) with a
 * fresh value on every `npm run build`. Because that edits the *bytes* of
 * this file, the browser's normal SW update check (a byte-diff against the
 * previously installed sw.js, run on every navigation) detects the change,
 * installs the new worker, and — once it activates — CACHE_NAME below no
 * longer matches any existing cache, so old caches get swept in `activate`.
 * This is what makes cache invalidation automatic on every deploy: nobody
 * has to remember to bump a version number by hand.
 */
const BUILD_ID = '__BUILD_ID__';
const CACHE_NAME = `aviqr-static-${BUILD_ID}`;
const API_CACHE_NAME = `aviqr-api-${BUILD_ID}`;

// Everything the app needs to render an offline app-shell / offline page,
// fetched eagerly on install so the very first offline visit still works.
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── URL classification ──────────────────────────────────────────────────────
// Every request is routed to exactly one strategy below. When in doubt, a
// request falls through to "network only" — caching is opt-in per category,
// never opt-out, so a new/unclassified endpoint can't accidentally end up
// serving stale or sensitive data from cache.

/** Menu/catalog reads — safe to show stale-then-refresh. Read-only, public,
 *  and the whole point of a QR menu is that it should open instantly. */
const STALE_WHILE_REVALIDATE_PATTERNS = [
  /\/api\/v1\/menu\/public\//,
  /\/api\/v1\/categories\/shop\//,
  /\/api\/v1\/items\/shop\//,
  /\/api\/v1\/pricing-rules\/shop\//,
];

/** Anything session-, money-, or state-sensitive. Must always hit the
 *  network and must never be read from or written to any cache — matched
 *  first, and checked again even for GETs (mutations are already excluded
 *  from caching by the method check in `route()` below, this list is the
 *  extra guarantee for sensitive GETs like order status or profile). */
const NETWORK_ONLY_PATTERNS = [
  /\/api\/v1\/auth\//,                 // login, OTP, register, profile, admin
  /\/api\/v1\/orders\//,               // cart submission, order status, history, confirmation codes
  /\/api\/v1\/payments\//,             // Razorpay create-order/verify/refund — never cached, ever
  /\/api\/v1\/qr-codes\//,             // table/QR status + redirects
  /\/api\/v1\/inventory\//,            // live stock
  /\/api\/v1\/customers\//,            // customer profile
  /\/api\/v1\/favorites\//,
  /\/api\/v1\/addresses\//,
];

/** Same-origin static assets: hashed JS/CSS bundles, fonts, icons, images.
 *  Vite content-hashes these filenames, so a fetch for a given URL always
 *  returns byte-identical content — perfect for a long-lived Cache First. */
const STATIC_ASSET_EXT = /\.(?:js|mjs|css|woff2?|ttf|otf|eot|svg|png|jpe?g|gif|webp|avif|ico)$/i;

function isStaticAsset(url) {
  return url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') || STATIC_ASSET_EXT.test(url.pathname));
}

function matches(pathname, patterns) {
  return patterns.some((re) => re.test(pathname));
}

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // Activate the new worker immediately instead of waiting for every
      // open tab to close — combined with the update-prompt flow in
      // registerServiceWorker.js, the user controls when the page actually
      // reloads onto the new version.
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Cache cleanup: drop every cache from a previous build.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Lets the page force an update without waiting for all tabs to close —
// see registerServiceWorker.js's "New version available" prompt.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ── Fetch strategies ─────────────────────────────────────────────────────────

/** Cache First: serve from cache if present, otherwise fetch, cache, return.
 *  Right strategy for content-hashed static assets — they never change
 *  under a given URL, so there's no freshness to worry about. */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    // Awaited deliberately: respondWith() only keeps the worker alive until
    // this function's returned promise settles, so an unawaited put() here
    // could be killed mid-write and silently never populate the cache.
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

/** Stale-While-Revalidate: return the cached response immediately (if any)
 *  for a fast paint, while a background fetch refreshes the cache for next
 *  time. The customer never blocks on the network for the menu screen. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null); // offline with nothing cached yet — handled below

  if (cached) {
    network.catch(() => {}); // let the revalidation continue, but don't block on it
    return cached;
  }
  const fresh = await network;
  if (fresh) return fresh;
  // Nothing cached and the network failed — surface a real error rather
  // than a silent empty response, so the UI's existing error handling
  // (OfflineBanner, per-page catch blocks) can react to it normally.
  throw new Error('Network unavailable and no cached response for ' + request.url);
}

/** Network Only: always hit the network, never read or write any cache.
 *  Used for anything mutating and anything sensitive — see
 *  NETWORK_ONLY_PATTERNS above for exactly what falls here. */
async function networkOnly(request) {
  return fetch(request);
}

/** Navigation requests (address-bar loads, QR-code deep links, reloads):
 *  try the network first so users get live content whenever possible, and
 *  only fall back to a cached shell / the offline page when the network is
 *  genuinely unreachable. */
async function navigationHandler(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE_NAME);
    const cached = (await cache.match(request)) ||
                   (await cache.match('/')) ||
                   (await cache.match('/offline.html'));
    if (cached) return cached;

    // Last-resort guaranteed-valid response: if the precache was ever
    // evicted (storage pressure, manual clear, or a request racing the
    // install step before cache.addAll() finishes), the three lookups
    // above all miss — returning `undefined` here would make respondWith()
    // fail with a hard browser network-error page instead of anything
    // friendly. This inline response has no external dependencies, so it
    // always succeeds even with an empty cache.
    return new Response(
      '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>You’re offline — AviQR</title>' +
      '<style>body{font-family:system-ui,sans-serif;background:#0F172A;color:#fff;' +
      'display:flex;align-items:center;justify-content:center;height:100vh;margin:0;' +
      'text-align:center;padding:24px}button{margin-top:16px;padding:10px 20px;' +
      'border-radius:8px;border:none;background:#1D9E75;color:#fff;font-weight:600;' +
      'cursor:pointer}</style></head><body><div><h1>You’re offline</h1>' +
      '<p>Check your connection and try again.</p>' +
      '<button onclick="location.reload()">Try again</button></div></body></html>',
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

// ── Router ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only ever intercept GET — POST/PUT/PATCH/DELETE (logins, cart submits,
  // order creation, payment calls, profile edits, ...) always go straight
  // to the network, untouched. This alone guarantees payments and order
  // creation are never served from or written to a cache.
  if (request.method !== 'GET') return;

  // Full-page navigations (including the very first load after a QR scan).
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Explicit deny-list wins over everything else below, even though it's
  // already GET-only here — e.g. GET /api/v1/orders/{id} (order status
  // polling) and GET /api/v1/customers/{id}/profile must never be cached.
  if (matches(url.pathname, NETWORK_ONLY_PATTERNS)) {
    event.respondWith(networkOnly(request));
    return;
  }

  if (matches(url.pathname, STALE_WHILE_REVALIDATE_PATTERNS)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else (third-party requests, unclassified endpoints) — pass
  // through untouched rather than guessing a caching strategy for it.
});
