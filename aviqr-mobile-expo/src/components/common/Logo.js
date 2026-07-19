import { View, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

// The real AviQR mark — mirrors aviqr-ui-web's Sidebar.jsx logo SVG exactly
// (same rects/colors), rendered in a black rounded-square badge like the web
// version's `.sidebar-logo-mark` (background: var(--black)). Every other
// screen that showed only the text wordmark was missing this badge.
export function Logo({ size = 32 }) {
  const pad = size * 0.125;
  const inner = size - pad * 2;
  return (
    <View style={[ss.badge, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <Svg width={inner} height={inner} viewBox="0 0 28 28">
        <Rect x="3" y="3" width="9" height="9" rx="2" fill="#1D9E75" />
        <Rect x="16" y="3" width="9" height="9" rx="2" fill="#FFFFFF" opacity="0.92" />
        <Rect x="3" y="16" width="9" height="9" rx="2" fill="#FFFFFF" opacity="0.92" />
        <Rect x="5.5" y="5.5" width="4" height="4" rx="1" fill="#111111" />
        <Rect x="18.5" y="5.5" width="4" height="4" rx="1" fill="#111111" />
        <Rect x="5.5" y="18.5" width="4" height="4" rx="1" fill="#111111" />
        <Rect x="16" y="16" width="4" height="4" rx="1" fill="#1D9E75" />
        <Rect x="21" y="16" width="4" height="4" rx="1" fill="#1D9E75" />
        <Rect x="16" y="21" width="4" height="4" rx="1" fill="#1D9E75" />
        <Rect x="21" y="21" width="4" height="4" rx="1" fill="#5DCAA5" />
      </Svg>
    </View>
  );
}

const ss = StyleSheet.create({
  badge: { backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
});
