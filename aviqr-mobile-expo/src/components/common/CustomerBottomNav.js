import { View, Text } from 'react-native';
import { FloatingPillNav, badgeStyles } from './FloatingPillNav.js';
import { HomeIcon, SearchIcon, CartIcon, PackageIcon, UserIcon } from './NavIcons.js';

// Mobile port of the web customer portal's floating pill nav
// (aviqr-ui-web/src/layouts/CustomerPortalShell.jsx + .css), built on the
// shared FloatingPillNav engine (see that file for the animation/notch
// details).
export const NAV_TABS = [
  { key: 'home', label: 'Home', Icon: HomeIcon },
  { key: 'search', label: 'Search', Icon: SearchIcon },
  { key: 'cart', label: 'Cart', Icon: CartIcon },
  { key: 'orders', label: 'Orders', Icon: PackageIcon },
  { key: 'profile', label: 'Profile', Icon: UserIcon },
];

export function CustomerBottomNav({ activeTab, onChangeTab, cartCount = 0, pageBackground }) {
  const activeIndex = Math.max(0, NAV_TABS.findIndex(t => t.key === activeTab));

  return (
    <FloatingPillNav
      tabs={NAV_TABS}
      activeIndex={activeIndex}
      onPressTab={tab => onChangeTab(tab.key)}
      pageBackground={pageBackground}
      renderBadge={(tab, i, isActive) => (
        tab.key === 'cart' && cartCount > 0 && !isActive ? (
          <View style={badgeStyles.badge}>
            <Text style={badgeStyles.badgeText}>{cartCount}</Text>
          </View>
        ) : null
      )}
    />
  );
}
