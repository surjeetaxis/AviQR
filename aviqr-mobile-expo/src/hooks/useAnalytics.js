import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { trackScreenView } from '../analytics.js';

/**
 * Sends a GA4 screen_view on every route change (mount included) — mirrors
 * aviqr-ui-web's usePageViews() hook, using expo-router's pathname instead
 * of react-router's location.
 */
export default function useScreenViews() {
  const pathname = usePathname();

  useEffect(() => {
    trackScreenView(pathname);
  }, [pathname]);
}
