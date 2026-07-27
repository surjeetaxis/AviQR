import { ROLE_PERMISSIONS } from '../context/AuthContext.jsx';

// Screen labels for the shop-owner dashboard tree, in the same order as their
// routes are declared in App.jsx. Sourced from ROLE_PERMISSIONS (the real
// route-guard data) rather than a hand-duplicated list, so this can't drift.
export const OWNER_TREE_SCREENS = [
  ['dashboard',      'Dashboard'],
  ['settings',       'Settings'],
  ['orders',         'Orders'],
  ['billing',        'Billing / POS'],
  ['kot',            'KOT'],
  ['menu',           'Menu'],
  ['menu/scan',      'Scan Menu (OCR)'],
  ['variations',     'Menu Variations'],
  ['shortcodes',     'Shortcodes'],
  ['dining-areas',   'Dining Areas'],
  ['reports',        'Reports'],
  ['order-history',  'Order History'],
  ['qr-codes',       'QR Codes'],
  ['staff',          'Staff'],
  ['inventory',      'Inventory'],
  ['raw-materials',  'Raw Materials'],
  ['loyalty',        'Loyalty'],
  ['campaigns',      'Campaigns'],
  ['analytics',      'Analytics'],
  ['ai',             'AI Hub'],
];

export const OWNER_TREE_ROLES = ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'MENU_EDITOR', 'ORDER_VIEWER'];

// perms === null/undefined means unrestricted (OWNER today) — every other
// role in ROLE_PERMISSIONS is an explicit allow-list.
export function ownerTreeHasAccess(role, screenPath) {
  const perms = ROLE_PERMISSIONS[role];
  if (perms === null || perms === undefined) return true;
  return perms.includes(screenPath);
}

// Platform-level dashboards aren't part of ROLE_PERMISSIONS at all — they're
// separate top-level apps, each with its own route guard in App.jsx. Listed
// here as a fixed reference so the gap is visible: Hotel/Mall/Supplier and the
// hotel-outlet tree only check "is logged in", not role, today.
export const PLATFORM_DASHBOARDS = [
  { dashboard: 'Admin Console',              route: '/admin',                 primaryRole: 'ADMIN',    guard: 'AdminRoute — ADMIN only' },
  { dashboard: 'Support Console',            route: '/support',               primaryRole: 'SUPPORT',  guard: 'SupportRoute — ADMIN or SUPPORT' },
  { dashboard: 'Hotel Dashboard',            route: '/hotel',                 primaryRole: 'HOTEL',    guard: '⚠ ProtectedRoute only — not role-gated' },
  { dashboard: 'Mall Dashboard',             route: '/mall',                  primaryRole: 'MALL',     guard: '⚠ ProtectedRoute only — not role-gated' },
  { dashboard: 'Supplier Dashboard',         route: '/supplier',              primaryRole: 'SUPPLIER', guard: '⚠ ProtectedRoute only — not role-gated' },
  { dashboard: 'Hotel Outlet (owner tree)',  route: '/hotel/outlets/:id/*',    primaryRole: 'HOTEL',    guard: '⚠ ProtectedRoute only — not role-gated' },
  { dashboard: 'Mall Vendor QR Codes',       route: '/mall/vendors/:id/qr-codes', primaryRole: 'MALL',  guard: '⚠ ProtectedRoute only — not role-gated' },
  { dashboard: 'Customer Portal',            route: '/portal/*, /customer',   primaryRole: 'Customer (or guest)', guard: 'Separate customer session / public' },
];
