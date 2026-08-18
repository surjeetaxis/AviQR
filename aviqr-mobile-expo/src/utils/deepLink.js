// Shared target-resolution for every way an AviQR URL can reach the app:
// the in-app QR scanner ((customer)/scan.js) and incoming Universal
// Links/App Links (app/+native-intent.js, once app.json's associatedDomains/
// intentFilters are verified by Apple/Google — see app.json comments).
// One parser for both keeps them from drifting apart.
//
// Mirrors QrService.buildUrl on the backend (order-qr-service/QrService.java)
// — the URL shapes a shop/table/mall/brand/hotel QR code actually encodes
// (https://aviqr.com/menu/{shopId}?table=…, /food-court/{mallId}, /brand/{brandId},
// /hotel-services/{hotelId}?room=…). Parsed by hand rather than the URL global
// to avoid depending on a Hermes polyfill that may not be present.

function parseQuery(qs) {
  const out = {};
  if (!qs) return out;
  qs.split('&').forEach(pair => {
    const [k, v = ''] = pair.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  });
  return out;
}

// Used by the in-app QR scanner: full https:// URL in, expo-router
// pathname/params object out (for router.replace(target)).
export function resolveTarget(raw) {
  const m = /^https?:\/\/[^/]+(\/[^?#]*)(?:\?([^#]*))?/.exec((raw || '').trim());
  if (!m) return null;
  const [, path, qs] = m;
  return resolvePath(path, parseQuery(qs));
}

// Used by app/+native-intent.js: expo-router already strips scheme/host and
// hands us just the path + query string, so this skips the https:// parse.
export function resolveSystemPath(path, qs) {
  const [cleanPath, inlineQs] = (path || '').split('?');
  return resolvePath(cleanPath, parseQuery(qs || inlineQs));
}

function resolvePath(path, q) {
  let mm;
  if ((mm = /^\/menu\/([^/]+)\/?$/.exec(path))) {
    return { pathname: '/(customer)/shop/menu', params: { shopId: mm[1], tableNumber: q.table } };
  }
  if ((mm = /^\/food-court\/([^/]+)\/?$/.exec(path))) {
    return { pathname: '/food-court/[mallId]', params: { mallId: mm[1] } };
  }
  if ((mm = /^\/brand\/([^/]+)\/?$/.exec(path))) {
    return { pathname: '/brand/[brandId]', params: { brandId: mm[1] } };
  }
  if ((mm = /^\/hotel-services\/([^/]+)\/?$/.exec(path))) {
    return { pathname: '/(customer)/hotel-services', params: { hotelId: mm[1], room: q.room, area: q.area } };
  }
  return null;
}

// expo-router's redirectSystemPath wants a plain routable path string back
// (no route-group parentheses — those aren't part of a real URL), not the
// {pathname, params} object router.replace() takes. Two of the four target
// shapes above use a dynamic route file ([mallId].js, [brandId].js), where
// the id has to land in the path itself for expo-router to match the file
// at all — a "?mallId=..." query string on those would 404. The other two
// (menu, hotel-services) are static files that read their params via
// useLocalSearchParams(), so those go in the query string as usual.
export function targetToPathString(target) {
  if (!target) return null;
  let routable = target.pathname.replace(/\([^)]+\)\//g, '');
  const remaining = { ...(target.params || {}) };
  routable = routable.replace(/\[([^\]]+)\]/g, (_, key) => {
    const value = remaining[key];
    delete remaining[key];
    return encodeURIComponent(value ?? '');
  });
  const qsParams = Object.entries(remaining).filter(([, v]) => v != null);
  if (qsParams.length === 0) return routable;
  const qs = qsParams.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return `${routable}?${qs}`;
}
