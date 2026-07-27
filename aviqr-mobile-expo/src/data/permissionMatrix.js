// Mirrors web's src/context/AuthContext.jsx ROLE_PERMISSIONS + App.jsx route
// guards — mobile has no route-level role guards of its own (see ROLE_HOME in
// ../context/AuthContext.js), so this is a reference copy of the real backend
// enforcement / web gating, not an independent source of truth. Keep in sync
// with the web ROLE_PERMISSIONS if that ever changes.
export const ROLE_PERMISSIONS = {
  OWNER:        null, // full access including settings
  ADMIN:        null,
  SUPPORT:      null,
  MANAGER:      ['dashboard','orders','billing','kot','menu','menu/scan','variations','shortcodes','dining-areas','qr-codes',
                 'inventory','raw-materials','loyalty','campaigns','reports','analytics','order-history','ai'],
  CASHIER:      ['dashboard','orders','billing','reports','order-history'],
  KITCHEN:      ['dashboard','orders','kot'],
  MENU_EDITOR:  ['dashboard','menu','menu/scan','variations','shortcodes','dining-areas'],
  ORDER_VIEWER: ['dashboard','orders','order-history'],
};

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

export function ownerTreeHasAccess(role, screenPath) {
  const perms = ROLE_PERMISSIONS[role];
  if (perms === null || perms === undefined) return true;
  return perms.includes(screenPath);
}

// Human-readable preview used on the "add/edit staff" screen — grouped labels
// matching OWNER_TREE_SCREENS, derived from the same ROLE_PERMISSIONS above so
// it can't silently drift out of sync the way the old hand-written copy did.
export function rolePermissionPreview(role) {
  const perms = ROLE_PERMISSIONS[role];
  if (perms === null || perms === undefined) return 'Full access to every screen';
  const labelByPath = Object.fromEntries(OWNER_TREE_SCREENS);
  return perms.map(p => labelByPath[p] || p);
}

export const PLATFORM_DASHBOARDS = [
  { dashboard: 'Admin Console',              route: '/(admin)/admin-home',      primaryRole: 'ADMIN',    guard: 'ROLE_HOME redirect + backend 403s' },
  { dashboard: 'Support Console',            route: '/(support)/support-home',  primaryRole: 'SUPPORT',  guard: 'ROLE_HOME redirect + backend 403s' },
  { dashboard: 'Hotel Dashboard',            route: '/(hotel)/hotel-home',      primaryRole: 'HOTEL',    guard: 'ROLE_HOME redirect + backend 403s' },
  { dashboard: 'Mall Dashboard',             route: '/(mall)/mall-home',        primaryRole: 'MALL',     guard: 'ROLE_HOME redirect + backend 403s' },
  { dashboard: 'Supplier Dashboard',         route: '/(supplier)/supplier-home',primaryRole: 'SUPPLIER', guard: 'ROLE_HOME redirect + backend 403s' },
  { dashboard: 'Customer Portal',            route: '/(customer)/portal-home',  primaryRole: 'Customer (or guest)', guard: 'Separate customer session / public' },
];
