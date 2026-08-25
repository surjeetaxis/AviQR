import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageview } from '../analytics.js';

/**
 * Sends a GA4 pageview on every route change (mount included) — gtag.js's
 * own auto pageview only fires once, on the initial script load, so it
 * never sees in-app navigation in this SPA.
 */
export default function usePageViews() {
  const location = useLocation();

  useEffect(() => {
    trackPageview(location.pathname + location.search);
  }, [location.pathname, location.search]);
}
