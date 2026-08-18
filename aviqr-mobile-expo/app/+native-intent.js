// expo-router's Native Intent API: intercepts an incoming Universal Link
// (iOS) / App Link (Android) or aviqr:// scheme URL BEFORE route matching,
// so a tapped https://aviqr.com/menu/{id} link (shared, or surfaced by a
// search engine/AI assistant) opens straight to the right in-app screen
// instead of the app's default landing route. Reuses the exact same target
// resolution as the in-app QR scanner (src/utils/deepLink.js) so a scanned
// code and a tapped link always land in the same place.
//
// Only takes effect once the OS has verified ownership of the domain —
// see app.json's ios.associatedDomains / android.intentFilters, and the
// apple-app-site-association / assetlinks.json files served from
// aviqr-ui-web's .well-known/ — otherwise the OS just opens the link in a
// normal browser tab, which still works fine on its own.
import { resolveSystemPath, targetToPathString } from '../src/utils/deepLink.js';

export function redirectSystemPath({ path }) {
  try {
    const target = resolveSystemPath(path);
    const routable = targetToPathString(target);
    return routable || path;
  } catch {
    return path;
  }
}
