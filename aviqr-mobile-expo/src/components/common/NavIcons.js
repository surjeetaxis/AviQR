import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';

// Hand-drawn, lucide-style line icons (24x24, stroke-based) for the customer
// bottom nav — no icon library is installed in this app (@expo/vector-icons
// isn't in package.json/node_modules, and the `Icon` component menu.js
// references doesn't exist anywhere in src/), so these are self-contained
// react-native-svg components matching the shapes used by the web app's
// lucide-react icons (Home, Search, ShoppingCart, Package, User).
const base = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

export function HomeIcon({ size = 20, color = '#000', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke={color} strokeWidth={strokeWidth}>
      <Path d="M3 9.5 12 2l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Path d="M9 22V12h6v10" />
    </Svg>
  );
}

export function SearchIcon({ size = 20, color = '#000', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke={color} strokeWidth={strokeWidth}>
      <Circle cx="11" cy="11" r="8" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  );
}

export function CartIcon({ size = 20, color = '#000', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke={color} strokeWidth={strokeWidth}>
      <Circle cx="9" cy="21" r="1" />
      <Circle cx="20" cy="21" r="1" />
      <Path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </Svg>
  );
}

export function PackageIcon({ size = 20, color = '#000', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke={color} strokeWidth={strokeWidth}>
      <Path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <Path d="M3 8v8l9 5 9-5V8" />
      <Path d="M12 13v8" />
    </Svg>
  );
}

export function UserIcon({ size = 20, color = '#000', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke={color} strokeWidth={strokeWidth}>
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

export function MinusIcon({ size = 20, color = '#000', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke={color} strokeWidth={strokeWidth}>
      <Line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  );
}

export function PlusIcon({ size = 20, color = '#000', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke={color} strokeWidth={strokeWidth}>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  );
}

export function ArrowRightIcon({ size = 20, color = '#000', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke={color} strokeWidth={strokeWidth}>
      <Line x1="5" y1="12" x2="19" y2="12" />
      <Path d="M12 5l7 7-7 7" />
    </Svg>
  );
}

export function ShoppingBagIcon({ size = 20, color = '#000', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke={color} strokeWidth={strokeWidth}>
      <Path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <Line x1="3" y1="6" x2="21" y2="6" />
      <Path d="M16 10a4 4 0 0 1-8 0" />
    </Svg>
  );
}

export function DashboardIcon({ size = 20, color = '#000', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke={color} strokeWidth={strokeWidth}>
      <Rect x="3" y="3" width="8" height="8" rx="1.5" />
      <Rect x="13" y="3" width="8" height="8" rx="1.5" />
      <Rect x="3" y="13" width="8" height="8" rx="1.5" />
      <Rect x="13" y="13" width="8" height="8" rx="1.5" />
    </Svg>
  );
}

export function BookOpenIcon({ size = 20, color = '#000', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke={color} strokeWidth={strokeWidth}>
      <Path d="M12 7c-2-2-6-2-9-2v13c3 0 7 0 9 2 2-2 6-2 9-2V5c-3 0-7 0-9 2Z" />
      <Line x1="12" y1="7" x2="12" y2="20" />
    </Svg>
  );
}

export function BarChartIcon({ size = 20, color = '#000', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke={color} strokeWidth={strokeWidth}>
      <Line x1="5" y1="20" x2="5" y2="12" />
      <Line x1="12" y1="20" x2="12" y2="4" />
      <Line x1="19" y1="20" x2="19" y2="16" />
    </Svg>
  );
}

export function SettingsIcon({ size = 20, color = '#000', strokeWidth = 2 }) {
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI) / 4;
    const x1 = 12 + Math.cos(angle) * 7;
    const y1 = 12 + Math.sin(angle) * 7;
    const x2 = 12 + Math.cos(angle) * 9.5;
    const y2 = 12 + Math.sin(angle) * 9.5;
    return { x1, y1, x2, y2 };
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...base} stroke={color} strokeWidth={strokeWidth}>
      <Circle cx="12" cy="12" r="3.5" />
      {spokes.map((s, i) => (
        <Line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
      ))}
    </Svg>
  );
}
