import { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../theme/index.js';

// Shared engine behind every bottom nav in the app — mobile port of
// aviqr-ui-web/src/layouts/CustomerPortalShell.jsx + .css (customer portal)
// and src/components/OwnerBottomNav.jsx (owner web dashboard, mobile
// widths). A single indicator (raised circle + two flanking notch "wings")
// slides between tabs via one animated transform, instead of each tab
// button drawing its own copy that would just pop in/out with no motion.
// Domain-agnostic: callers supply `tabs`/`activeIndex`/`onPressTab` — see
// CustomerBottomNav.js and OwnerTabBar.js for the two current wrappers.
const NAV_HEIGHT = 60;
const BADGE_SIZE = 42;
const RING_WIDTH = 5;
const RING_SIZE = BADGE_SIZE + RING_WIDTH * 2;
const RAISE = 16; // how far the badge's center sits above the pill's vertical center — kept
                  // small so the badge stays mostly WITHIN the pill's own height, anchored
                  // inside the nav rather than floating fully above it
// Notch geometry: ONE continuous symmetric curve spanning both sides of the
// ring, not two independently-positioned wing pieces. Two separate pieces
// each had a straight VERTICAL closing edge at a fixed distance from
// center — but the ring is a CIRCLE, whose boundary curves inward toward
// its top and bottom, so a straight wall can't hug it everywhere; it poked
// through wherever the circle's true edge was closer to center than that
// fixed wall, producing thin "wisp" artifacts instead of a clean U. This
// single path dips from the pill's flat edge to a flat-bottomed trough —
// both halves meet at the center with matching HORIZONTAL tangents, so
// it's C1-smooth with zero kink — sized to stay SHALLOWER and NARROWER
// than the ring's own circle at every point along the trough (34px deep vs
// the ring's 40px reach: RING_SIZE/2 + RAISE-offset). A first attempt made
// the trough DEEPER than the ring on the assumption that "deeper is
// safer," but that pokes a visible sliver out past the ring's bottom
// instead — the ring (drawn on top) only fully hides a trough that stays
// inside its footprint.
const NOTCH_HALF_W = 60;
const NOTCH_DEPTH = 34;
const DEFAULT_PAGE_BG = '#F9FAFB';

export function FloatingPillNav({ tabs, activeIndex, onPressTab, renderBadge, pageBackground = DEFAULT_PAGE_BG, bottomOffset = 16, reserveSpace = false }) {
  const [navWidth, setNavWidth] = useState(0);
  const slotWidth = navWidth / tabs.length;

  const translateX = useSharedValue(0);

  useEffect(() => {
    if (!navWidth) return;
    translateX.value = withTiming(activeIndex * slotWidth, {
      duration: 380,
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    });
  }, [activeIndex, slotWidth, navWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const ActiveIcon = tabs[activeIndex]?.Icon;
  const notchWidth = NOTCH_HALF_W * 2;
  const notchPath = `M0,0 C30,0 50,${NOTCH_DEPTH} 60,${NOTCH_DEPTH} C70,${NOTCH_DEPTH} 90,0 ${notchWidth},0 Z`;

  const pill = (
    <View style={[styles.nav, { bottom: bottomOffset }]} onLayout={e => setNavWidth(e.nativeEvent.layout.width)}>
      {navWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { width: slotWidth }, indicatorStyle]}
        >
          <View style={[styles.wing, { left: slotWidth / 2 - NOTCH_HALF_W }]}>
            <Svg width={notchWidth} height={NOTCH_DEPTH} viewBox={`0 0 ${notchWidth} ${NOTCH_DEPTH}`}>
              <Path d={notchPath} fill={pageBackground} />
            </Svg>
          </View>
          <View style={[styles.ring, { left: slotWidth / 2 - RING_SIZE / 2 }]}>
            <View style={styles.circle}>
              {ActiveIcon && <ActiveIcon size={20} color={Colors.primary} strokeWidth={2} />}
            </View>
          </View>
        </Animated.View>
      )}

      {tabs.map((tab, i) => {
        const isActive = i === activeIndex;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.item}
            activeOpacity={0.7}
            onPress={() => onPressTab(tab, i)}
            accessibilityLabel={tab.label}
            accessibilityRole="button"
          >
            <View style={{ opacity: isActive ? 0 : 1 }}>
              <tab.Icon size={20} color="rgba(255,255,255,0.85)" strokeWidth={2} />
            </View>
            {renderBadge?.(tab, i, isActive)}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // reserveSpace=false (default): the pill is a pure position:absolute
  // overlay, exactly as before — for callers like CustomerBottomNav.js
  // that render it manually inside a screen which already manages its own
  // scroll-content bottom padding.
  //
  // reserveSpace=true: wrap it in a normal (non-absolute) View with a real
  // height, so a parent that measures this component's rendered size to
  // decide how much space to reserve under scene content — like React
  // Navigation's <Tabs tabBar={}> does — sees real space instead of zero
  // (an absolutely-positioned root contributes nothing to a parent's
  // intrinsic layout size). Used by OwnerTabBar.js.
  if (!reserveSpace) return pill;
  return <View style={{ height: NAV_HEIGHT + bottomOffset }}>{pill}</View>;
}

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: NAV_HEIGHT,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: NAV_HEIGHT,
  },
  wing: {
    position: 'absolute',
    top: -1,
  },
  ring: {
    position: 'absolute',
    top: NAV_HEIGHT / 2 - RAISE - RING_SIZE / 2,
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  circle: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: 10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  badgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' },
});
