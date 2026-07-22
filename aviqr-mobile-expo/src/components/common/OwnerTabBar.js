import { View, Text } from 'react-native';
import { FloatingPillNav, badgeStyles } from './FloatingPillNav.js';
import { DashboardIcon, ShoppingBagIcon, BookOpenIcon, BarChartIcon, SettingsIcon } from './NavIcons.js';
import { Colors } from '../../theme/index.js';

// Custom tabBar for app/(owner)/_layout.js's <Tabs>. Built on the same
// FloatingPillNav engine as the web owner dashboard's mobile-width nav
// (src/components/OwnerBottomNav.jsx) and the customer portal's
// CustomerBottomNav.js — one shared design across every bottom nav in the
// product. Implements React Navigation's BottomTabBarProps contract
// (state/descriptors/navigation) so it drops straight into <Tabs tabBar={}>.
const ICONS = {
  dashboard: DashboardIcon,
  orders: ShoppingBagIcon,
  menu: BookOpenIcon,
  reports: BarChartIcon,
  settings: SettingsIcon,
};

export function OwnerTabBar({ state, descriptors, navigation, newOrderCount = 0 }) {
  // expo-router auto-registers every file in app/(owner)/ as a route on
  // this Tabs navigator (profile.js, campaigns.js, qrcodes.js, staff.js,
  // customers.js — not just the 5 primary destinations), so state.routes
  // has 10 entries, not 5. Only show the 5 we actually have icons/a design
  // for; the rest stay reachable via router.push() from elsewhere (e.g.
  // the dashboard's own "Quick actions" cards) without cluttering the bar.
  const visibleRoutes = state.routes.filter(route => ICONS[route.name]);
  const tabs = visibleRoutes.map(route => ({
    key: route.key,
    routeName: route.name,
    label: descriptors[route.key]?.options.title ?? route.name,
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
      renderBadge={(tab, i, isActive) => (
        tab.routeName === 'orders' && newOrderCount > 0 && !isActive ? (
          <View style={badgeStyles.badge}>
            <Text style={badgeStyles.badgeText}>{newOrderCount > 9 ? '9+' : newOrderCount}</Text>
          </View>
        ) : null
      )}
    />
  );
}
