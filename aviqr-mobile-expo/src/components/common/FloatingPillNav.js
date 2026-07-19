import { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../theme/index.js';

// Shared engine behind every bottom nav in the app — mobile port of
// aviqr-ui-web/src/layouts/CustomerPortalShell.jsx (customer portal) and
// src/components/OwnerBottomNav.jsx (owner web dashboard, mobile widths).
// A single indicator (raised circle + notch cutout) slides between tabs
// via one animated transform, instead of each tab button drawing its own
// copy that would just pop in/out with no motion.
//
// The indicator's target position is the ACTIVE TAB'S OWN MEASURED CENTER
// (via each tab's onLayout), not `index * (navWidth / tabCount)`. The
// earlier percentage-based version put the first/last tab's center only a
// few px past the pill's rounded corner — closer than the notch's own
// half-width — so the notch cutout (sized for a tab in open space) rode
// up over the corner and sliced a visible chunk out of the ring at the
// edges. Measuring each tab's real position sidesteps that arithmetic
// entirely; `ROW_PADDING` below gives the corner extra clearance too, as
// a second line of defense.
//
// Domain-agnostic: callers supply `tabs`/`activeIndex`/`onPressTab` — see
// CustomerBottomNav.js and OwnerTabBar.js for the two current wrappers.
const NAV_HEIGHT = 60;
const ROW_PADDING = 30; // horizontal inset so the notch/ring never reach the pill's rounded corners
const BADGE_SIZE = 50;
const RING_WIDTH = 4;
const RING_SIZE = BADGE_SIZE + RING_WIDTH * 2;
const RAISE = 18; // how far the ring's center sits above the pill's vertical center
// Notch geometry: one continuous symmetric curve, both halves meeting at
// the center with matching HORIZONTAL tangents (C1-smooth, zero kink) —
// a flat-bottomed trough the ring (drawn on top) fully covers, rather than
// two independently-positioned wing pieces with a straight vertical edge
// that can't hug the ring's curved boundary everywhere.
const NOTCH_HALF_W = 46;
const NOTCH_DEPTH = 36;
const NOTCH_WIDTH = NOTCH_HALF_W * 2;
const NOTCH_PATH = `M0,0 C${NOTCH_WIDTH * 0.25},0 ${NOTCH_WIDTH * 0.413},${NOTCH_DEPTH} ${NOTCH_WIDTH * 0.5},${NOTCH_DEPTH} C${NOTCH_WIDTH * 0.587},${NOTCH_DEPTH} ${NOTCH_WIDTH * 0.75},0 ${NOTCH_WIDTH},0 Z`;
const DEFAULT_PAGE_BG = '#F9FAFB';

export function FloatingPillNav({ tabs, activeIndex, onPressTab, renderBadge, pageBackground = DEFAULT_PAGE_BG, bottomOffset = 16, reserveSpace = false }) {
  const [tabCenters, setTabCenters] = useState({});
  const indicatorX = tabCenters[activeIndex];

  const translateX = useSharedValue(0);

  useEffect(() => {
    if (indicatorX == null) return;
    translateX.value = withTiming(indicatorX - NOTCH_WIDTH / 2, {
      duration: 380,
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    });
  }, [indicatorX, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const ActiveIcon = tabs[activeIndex]?.Icon;

  const pill = (
    <View style={[styles.nav, { bottom: bottomOffset }]}>
      <View style={styles.row}>
        {indicatorX != null && (
          <Animated.View
            pointerEvents="none"
            style={[styles.indicator, { width: NOTCH_WIDTH }, indicatorStyle]}
          >
            <View style={styles.wing}>
              <Svg width={NOTCH_WIDTH} height={NOTCH_DEPTH} viewBox={`0 0 ${NOTCH_WIDTH} ${NOTCH_DEPTH}`}>
                <Path d={NOTCH_PATH} fill={pageBackground} />
              </Svg>
            </View>
            <View style={[styles.ring, { left: NOTCH_WIDTH / 2 - RING_SIZE / 2 }]}>
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
              onLayout={e => {
                const { x, width } = e.nativeEvent.layout;
                setTabCenters(prev => (prev[i] === x + width / 2 ? prev : { ...prev, [i]: x + width / 2 }));
              }}
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: ROW_PADDING,
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
