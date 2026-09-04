import { FloatingPillNav } from './FloatingPillNav.js';
import { HomeIcon, BookOpenIcon, UserIcon, BedIcon, SettingsIcon } from './NavIcons.js';
import { Colors } from '../../theme/index.js';

// Custom tabBar for app/(hotel)/_layout.js's <Tabs>. Same FloatingPillNav
// engine as OwnerTabBar.js/CustomerBottomNav.js — one shared bottom-nav
// design across the app.
const ICONS = {
  'hotel-home': HomeIcon,
  'pms/index': BookOpenIcon,
  guests: UserIcon,
  housekeeping: BedIcon,
  'hotel-settings': SettingsIcon,
};

const LABELS = {
  'hotel-home': 'Home',
  'pms/index': 'PMS',
  guests: 'Guests',
  housekeeping: 'Housekeeping',
  'hotel-settings': 'Settings',
};

export function HotelTabBar({ state, descriptors, navigation }) {
  // app/(hotel)/ has many more files/folders than the 5 primary
  // destinations below (hotel-staff, hotel-reports, maintenance, messages,
  // service-desk, qr-management, hotel-subscription, outlets/…) — those
  // stay reachable from the Home screen's own nav grid instead of
  // cluttering the bar, same tradeoff as OwnerTabBar.js.
  const visibleRoutes = state.routes.filter(route => ICONS[route.name]);
  const tabs = visibleRoutes.map(route => ({
    key: route.key,
    routeName: route.name,
    label: LABELS[route.name] ?? descriptors[route.key]?.options.title ?? route.name,
    Icon: ICONS[route.name],
  }));
  const activeRouteKey = state.routes[state.index].key;
  const activeIndex = Math.max(0, visibleRoutes.findIndex(route => route.key === activeRouteKey));

  const handlePress = (tab) => {
    const event = navigation.emit({ type: 'tabPress', target: tab.key, canPreventDefault: true });
    if (activeRouteKey !== tab.key && !event.defaultPrevented) {
      navigation.navigate(tab.routeName);
    }
  };

  return (
    <FloatingPillNav
      tabs={tabs}
      activeIndex={activeIndex}
      onPressTab={handlePress}
      pageBackground={Colors.background}
      reserveSpace
    />
  );
}
