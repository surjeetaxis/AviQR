// Mirrors the web app's sidebar groups exactly (aviqr-ui-web/src/components/Sidebar.jsx
// NAV_GROUPS) — same section labels, same order, now including every group.
export const OWNER_NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', href: '/dashboard', emoji: '🏠' },
      { label: 'Orders',    href: '/orders',    emoji: '📦', badge: 'orders' },
      { label: 'POS / Billing', href: '/billing', emoji: '🧾' },
      { label: 'Kitchen (KOT)', href: '/kot', emoji: '👨‍🍳' },
    ],
  },
  {
    label: 'Menu',
    items: [
      { label: 'Menu Items',      href: '/menu',           emoji: '🍽️' },
      { label: 'Variants & Add-ons', href: '/menu-variants', emoji: '🧩' },
      { label: 'Dine-in Areas',   href: '/dining-areas',   emoji: '🪑' },
      { label: 'Shortcodes',      href: '/shortcodes',     emoji: '⚡' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Stock Levels',   href: '/inventory',     emoji: '📦' },
      { label: 'Raw Materials',  href: '/raw-materials', emoji: '🧂' },
    ],
  },
  {
    label: 'QR Codes',
    items: [
      { label: 'QR Codes', href: '/qrcodes', emoji: '📱' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { label: 'Loyalty',   href: '/loyalty',   emoji: '🏆' },
      { label: 'Campaigns', href: '/campaigns', emoji: '📣' },
      { label: 'Customers', href: '/customers', emoji: '🗂️' },
    ],
  },
  {
    label: 'Staff',
    items: [
      { label: 'Staff', href: '/staff', emoji: '👥' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Reports',      href: '/reports',       emoji: '📊' },
      { label: 'Analytics',    href: '/analytics',     emoji: '📈' },
      { label: 'Order History', href: '/order-history', emoji: '🕒' },
    ],
  },
  {
    label: 'AI',
    items: [
      { label: 'AI Hub', href: '/ai-hub', emoji: '✨' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings', href: '/settings', emoji: '⚙️' },
      { label: 'Profile',  href: '/profile',  emoji: '🙋' },
    ],
  },
];
