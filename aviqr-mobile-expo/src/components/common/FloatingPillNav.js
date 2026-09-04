import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Colors } from '../../theme/index.js';

// Shared engine behind every bottom nav in the app — mobile port of
// aviqr-ui-web/src/layouts/CustomerPortalShell.jsx (customer portal) and
// src/components/OwnerBottomNav.jsx (owner web dashboard, mobile widths).
// The active tab gets a "U" badge — flat top, deeply rounded bottom two
// corners — that slides between tabs via one animated transform, instead
// of each tab button drawing its own copy that would just pop in/out with
// no motion. It sits fully inside the bar's own height (no part of it
// floats above the bar's top edge — earlier versions raised a circle out
// over the top, which read as detached rather than "part of the bar").
//
// The indicator's target position is the ACTIVE TAB'S OWN MEASURED CENTER
// (via each tab's onLayout), not `index * (navWidth / tabCount)`. The
// earlier percentage-based version put the first/last tab's center only a
// few px past the pill's rounded corner, so a wide indicator rode up over
// the corner at the edges. Measuring each tab's real position sidesteps
// that arithmetic entirely; `ROW_PADDING` below gives the corner extra
// clearance too, as a second line of defense.
//
// Every tab always shows a text label under its icon, not just the active
// one — an unlabeled icon-only bar leans entirely on icon recognition,
// and a few of this app's hand-drawn icons (settings, PMS's book) aren't
// unambiguous at 20px on their own. The bar is tall enough to fit both
// without cramping either.
//
// Domain-agnostic: callers supply `tabs`/`activeIndex`/`onPressTab`, and
// may override `accentColor` to match their own section's branding instead
// of the app-default teal — see CustomerBottomNav.js, OwnerTabBar.js and
// HotelTabBar.js for the current wrappers (all three stay on the shared
// teal today, by not passing an override).
//
// The pill itself is frosted glass (iOS-style): a real backdrop blur
// (expo-blur's BlurView) of whatever scrolls behind it, with a translucent
// accentColor wash on top so it still reads as "the teal/purple nav", not
// a plain gray blur. `experimentalBlurMethod="dimezisBlurView"` opts into
// expo-blur's real-blur backend on Android — its default Android fallback
// is a flat tinted rectangle with no actual blur, which would make the
// "glass" look pointless there.
const NAV_HEIGHT = 68;
const ROW_PADDING = 30; // horizontal inset so the indicator never reaches the pill's rounded corners
const U_WIDTH = 54;
const U_HEIGHT = 33;
const U_RADIUS = 15; // deep bottom-corner rounding — about half U_HEIGHT — for a pronounced "U", not just a rounded rect
const U_TOP = 4; // small gap from the bar's own top edge; bottom edge (U_TOP + U_HEIGHT) must clear the label row below it

export function FloatingPillNav({
  tabs, activeIndex, onPressTab, renderBadge,
  accentColor = Colors.primary,
  bottomOffset, reserveSpace = false,
}) {
  // Clear the home indicator on notched iPhones and the gesture-nav strip
  // on modern Android — a bare `bottom: 16` (the pre-safe-area default)
  // sits the pill flush against, or partly under, both. Callers can still
  // pass an explicit bottomOffset to opt out.
  const insets = useSafeAreaInsets();
  const resolvedBottomOffset = bottomOffset ?? Math.max(16, insets.bottom + 8);
  const [tabCenters, setTabCenters] = useState({});
  const indicatorX = tabCenters[activeIndex];

  const translateX = useSharedValue(0);

  useEffect(() => {
    if (indicatorX == null) return;
    translateX.value = withTiming(indicatorX - U_WIDTH / 2, {
      duration: 380,
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    });
  }, [indicatorX, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const activeTab = tabs[activeIndex];

  const pill = (
    <View style={[styles.navShadow, { bottom: resolvedBottomOffset, shadowColor: accentColor }]}>
      <BlurView
        intensity={40}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={styles.navBlur}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: accentColor, opacity: 0.55 }]} />
        <View style={styles.row}>
          {indicatorX != null && (
            <Animated.View
              pointerEvents="none"
              style={[styles.indicator, indicatorStyle]}
            >
              <View style={styles.uShape}>
                {activeTab && <activeTab.Icon size={20} color={accentColor} strokeWidth={2} />}
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
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={[styles.label, isActive && styles.labelActive]}
                >
                  {tab.label}
                </Text>
                {renderBadge?.(tab, i, isActive)}
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
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
  return <View style={{ height: NAV_HEIGHT + resolvedBottomOffset }}>{pill}</View>;
}

const styles = StyleSheet.create({
  // Split from the blurred pill on purpose: iOS clips a shadow to nothing
  // if it's drawn on the same view as `overflow:'hidden'` (needed below to
  // clip the blur itself to the rounded corners), so the shadow lives on
  // this plain, non-clipping wrapper instead.
  navShadow: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: NAV_HEIGHT,
    borderRadius: 22, // matches web's BottomNav.css (26px on a 70px bar) — less curved than a full pill
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  navBlur: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
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
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  labelActive: {
    color: Colors.white,
    fontWeight: '800',
  },
  indicator: {
    position: 'absolute',
    top: U_TOP,
    left: 0,
    width: U_WIDTH,
  },
  uShape: {
    width: U_WIDTH,
    height: U_HEIGHT,
    borderBottomLeftRadius: U_RADIUS,
    borderBottomRightRadius: U_RADIUS,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
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
