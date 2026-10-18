// The big Shorts set: every role's screens on a local AviQR (seed data), the public customer menu and the
// booking engine (bm.aviqr.com, leela.aviqr.com). Each flow becomes one Short per language (see app.mjs).
//
// A flow: { id, screens: [screen, screen], en: [hook, caption1, caption2, title], tags }
// A screen: { role?, url? | path?, tab?, scroll?, click?, locate? }
//   role   — signs in locally as that seed role (localhost dashboard); omit for public pages
//   path   — dashboard path on the local web app; url — a full public URL
//   tab    — button text to click first (portal tabs); scroll — pixels to scroll after loading
//   click  — button text to click (e.g. a filter); locate — text to scroll into view

export const MENU = 'https://aviqr.com/menu/ecdbc557-91fa-44ee-992f-03683ad8bbde?table=1';
export const BM = 'https://bm.aviqr.com/';
export const LEELA = 'https://leela.aviqr.com/#/';

// Portal sidebars in their English order (labels are translated in other languages, so tabs are clicked by position).
const NAV = {
  '/hotel': ['Overview', 'Reservations', 'Booking Calendar', 'Front Desk', 'Group Bookings', 'Folio', 'Waitlist', 'Guests', 'Reviews',
    'Guest Requests', 'Outlets', 'Housekeeping', 'Laundry', 'Spa', 'Maintenance', 'Guest Inbox', 'Rooms', 'Room Types & Rates',
    'Inventory & Rates Calendar', 'Rate & Inventory Log', 'Surcharges, Discounts & Add-ons', 'Import Reservations', 'Channel Manager',
    'Channel Mappings', 'OTA Mappings', 'Channel Calendar', 'Channel Sync Logs', 'Channel Bookings', 'Agents & Commission',
    'Chain Rate Templates', 'Outlet Bookings', 'QR Management', 'Hotel Staff', 'Night Audit & Reports', 'Reports', 'Subscription', 'Settings'],
  '/mall': ['Overview', 'Vendors', 'All Orders', 'Revenue Share', 'Mall QR', 'Reports', 'Subscription', 'Settings'],
  '/supplier': ['Overview', 'Outlets', 'Menu Sync', 'All Orders', 'QR Codes', 'Reports', 'Subscription', 'Settings'],
};
const own = (path, scroll = 0) => ({ role: 'owner', path, scroll });
const tab = (role, path, name, scroll = 0) => {
  const tabIndex = NAV[path].indexOf(name);
  if (tabIndex < 0) throw new Error(`unknown ${path} tab ${name}`);
  return { role, path, tab: name, tabIndex, scroll };
};
const hotel = (name, scroll = 0) => tab('hotel', '/hotel', name, scroll);
const mall = (name, scroll = 0) => tab('mall', '/mall', name, scroll);
const sup = (name, scroll = 0) => tab('supplier', '/supplier', name, scroll);
const f = (id, screens, en, tags) => ({ id, screens, en, tags });

export const FLOWS = [
  // ── Restaurant owner ────────────────────────────────────────────────────────────────────────────
  f('o-dashboard', [own('/dashboard'), own('/dashboard', 700)],
    ['Your whole restaurant on one screen', 'Revenue, active orders and new customers', 'Live charts that refresh on their own', 'Restaurant owner dashboard at a glance'], ['restaurant dashboard', 'owner app']),
  f('o-orders', [own('/orders'), own('/orders', 650)],
    ['Every order, every channel, one list', 'Dine-in, takeaway and delivery together', 'Filter new, preparing and ready in a tap', 'All restaurant orders in one live list'], ['order management', 'restaurant orders']),
  f('o-billing', [own('/billing'), own('/billing', 600)],
    ['Bill a table in seconds', 'Dine-in, takeaway or delivery bills', 'GST-ready, from the same dashboard', 'Fast POS billing for restaurants'], ['POS', 'restaurant billing']),
  f('o-kot', [own('/kot'), own('/kot', 600)],
    ['The kitchen sees orders instantly', 'New, cooking, finishing and ready', 'Accept and start cooking in one tap', 'Kitchen display (KOT) for restaurants'], ['KOT', 'kitchen display']),
  f('o-menu', [own('/menu'), own('/menu', 700)],
    ['Edit your menu, live everywhere', 'Prices, photos and availability', 'Changes reach every QR code instantly', 'Live menu management for restaurants'], ['menu management', 'digital menu']),
  f('o-ocr', [own('/menu/scan'), own('/menu/scan', 500)],
    ['Snap your printed menu', 'AI reads it for you', 'Your digital menu, ready in minutes', 'Turn a printed menu into a digital one'], ['OCR menu', 'AI menu']),
  f('o-variations', [own('/variations'), own('/variations', 600)],
    ['Sizes, portions and add-ons', 'Each with its own price', 'Set once, used at every table', 'Menu variants and add-ons made easy'], ['menu add-ons', 'variants']),
  f('o-areas', [own('/dining-areas'), own('/dining-areas', 600)],
    ['Rooftop, AC hall, garden', 'Each area with its own menu', 'And its own pricing', 'Separate dine-in areas and menus'], ['dine-in areas', 'restaurant sections']),
  f('o-shortcodes', [own('/shortcodes'), own('/shortcodes', 600)],
    ['Billing at typing speed', 'A short code for every item', 'Faster checkout at the counter', 'Quick-bill shortcodes for cashiers'], ['quick billing', 'POS shortcuts']),
  f('o-qr', [own('/qr-codes'), own('/qr-codes', 600)],
    ['A QR code for every table', 'Print once, never reprint', 'Each scan opens the live menu', 'Table QR codes for your restaurant'], ['table QR', 'QR menu']),
  f('o-inventory', [own('/inventory'), own('/inventory', 600)],
    ['Know your stock levels', 'Low-stock alerts before you run out', 'Right next to your orders', 'Restaurant stock levels and alerts'], ['inventory', 'stock alerts']),
  f('o-raw', [own('/raw-materials'), own('/raw-materials', 600)],
    ['What does each dish really cost?', 'Track every raw material', 'And real cost per recipe', 'Raw materials and recipe costing'], ['recipe costing', 'food cost']),
  f('o-loyalty', [own('/loyalty'), own('/loyalty', 600)],
    ['Turn first visits into regulars', 'Points on every order', 'Bronze to Platinum tiers', 'A built-in restaurant loyalty program'], ['loyalty program', 'restaurant CRM']),
  f('o-campaigns', [own('/campaigns'), own('/campaigns', 600)],
    ['Birthday wishes that send themselves', 'SMS campaigns to customer groups', 'No manual follow-up', 'Automatic SMS campaigns for restaurants'], ['SMS marketing', 'restaurant marketing']),
  f('o-staff', [own('/staff'), own('/staff', 600)],
    ['Manager, cashier, kitchen', 'Each with their own login', 'Each sees only what they need', 'Staff roles and logins'], ['staff management', 'user roles']),
  f('o-reports', [own('/reports'), own('/reports', 700)],
    ['Your sales, explained', 'Revenue, items and customers', 'Ready whenever you are', 'Restaurant sales reports'], ['restaurant reports', 'sales report']),
  f('o-analytics', [own('/analytics'), own('/analytics', 700)],
    ['Know your peak hours', 'Top dishes and customer spend', 'Trends you can act on', 'Advanced analytics for restaurants'], ['restaurant analytics', 'peak hours']),
  f('o-history', [own('/order-history'), own('/order-history', 600)],
    ['Every past order, searchable', 'By date, table or customer', 'Nothing gets lost', 'Searchable restaurant order history'], ['order history', 'restaurant records']),
  f('o-ai', [own('/ai'), own('/ai', 700)],
    ['AI tools for your restaurant', 'Forecasting, pricing and an assistant', 'Built into the dashboard', 'AI features for restaurant owners'], ['restaurant AI', 'AI tools']),
  f('o-settings', [own('/settings'), own('/settings', 700)],
    ['Your restaurant, your way', 'Hours, taxes, receipts and more', 'All in one settings page', 'Restaurant settings in one place'], ['restaurant settings', 'GST settings']),

  // ── Other restaurant roles ──────────────────────────────────────────────────────────────────────
  f('r-cashier', [{ role: 'cashier', path: '/billing' }, { role: 'cashier', path: '/order-history' }],
    ['The cashier’s view', 'Billing front and centre', 'Plus order history, nothing else', 'A cashier login built for the counter'], ['cashier', 'POS']),
  f('r-kitchen', [{ role: 'kitchen', path: '/kot' }, { role: 'kitchen', path: '/kot', scroll: 600 }],
    ['The chef’s view', 'Only the kitchen display', 'New, cooking and ready orders', 'A kitchen login with just the KOT'], ['chef', 'KOT']),
  f('r-manager', [{ role: 'manager', path: '/dashboard' }, { role: 'manager', path: '/reports' }],
    ['The manager’s view', 'Runs the floor day to day', 'Without the owner’s settings', 'A manager login for daily operations'], ['restaurant manager', 'operations']),
  f('r-menu-editor', [{ role: 'menu-editor', path: '/menu' }, { role: 'menu-editor', path: '/menu', scroll: 700 }],
    ['The menu editor’s view', 'Edits the menu', 'And nothing else', 'A menu-editor login for your team'], ['menu editor', 'staff roles']),
  f('r-order-viewer', [{ role: 'order-viewer', path: '/orders' }, { role: 'order-viewer', path: '/orders', scroll: 600 }],
    ['The waiter’s view', 'Sees orders as they come', 'Can’t change billing or menu', 'An order-viewer login for waiters'], ['waiter', 'order tracking']),

  // ── Hotel (front desk + PMS) ────────────────────────────────────────────────────────────────────
  ...[
    ['Overview', 'Your hotel at a glance', 'Arrivals, occupancy and requests', 'All on one screen', 'Hotel dashboard at a glance'],
    ['Reservations', 'Every reservation in one list', 'Search, filter and open any booking', 'Direct and OTA bookings together', 'Hotel reservations in one list'],
    ['Booking Calendar', 'See your whole month', 'Every room, every night', 'Gaps and stays at a glance', 'Hotel booking calendar'],
    ['Front Desk', 'Check-in in seconds', 'Arrivals and departures for today', 'Rooms ready at a glance', 'Hotel front desk made simple'],
    ['Group Bookings', 'Weddings, tours and teams', 'Many rooms, one booking', 'Managed together', 'Group bookings for hotels'],
    ['Folio', 'Every charge on one bill', 'Rooms, food, spa and more', 'Settled at checkout', 'Hotel guest folio and billing'],
    ['Waitlist', 'Fully booked? Keep a waitlist', 'Fill rooms as they free up', 'Never lose a guest', 'Hotel waitlist management'],
    ['Guests', 'Know every guest', 'Stays, preferences and history', 'In one profile', 'Hotel guest profiles'],
    ['Reviews', 'What guests say', 'All reviews in one place', 'Reply and improve', 'Hotel guest reviews'],
    ['Guest Requests', 'Requests straight from the room', 'Room service, laundry, spa', 'No phone calls needed', 'In-room guest requests'],
    ['Outlets', 'Restaurant, bar, pool café', 'Every hotel outlet', 'Charged to the room', 'Hotel outlets and room charges'],
    ['Housekeeping', 'Every room’s status', 'Clean, dirty or inspected', 'Updated live', 'Hotel housekeeping board'],
    ['Laundry', 'Guest laundry, tracked', 'From pickup to delivery', 'Billed to the folio', 'Hotel laundry management'],
    ['Spa', 'Spa bookings made easy', 'Slots, therapists and guests', 'Charged to the room', 'Hotel spa bookings'],
    ['Maintenance', 'Fix it before guests notice', 'Every maintenance ticket', 'Tracked to done', 'Hotel maintenance tickets'],
    ['Guest Inbox', 'Chat with your guests', 'Every message in one inbox', 'Reply fast', 'Hotel guest messaging'],
    ['Rooms', 'Every room, every detail', 'Floor, side and view', 'Managed in one list', 'Hotel room setup'],
    ['Room Types & Rates', 'Room types and rates', 'Set once, sold everywhere', 'Direct and on OTAs', 'Hotel room types and rates'],
    ['Inventory & Rates Calendar', 'Rates by the day', 'Inventory for every night', 'Change in a tap', 'Hotel rates and inventory calendar'],
    ['Rate & Inventory Log', 'Who changed what, when', 'Every rate and inventory change', 'Logged', 'Hotel rate change log'],
    ['Surcharges, Discounts & Add-ons', 'Extras that add up', 'Surcharges, discounts and add-ons', 'Applied automatically', 'Hotel surcharges and add-ons'],
    ['Import Reservations', 'Moving from another system?', 'Import your reservations', 'In minutes', 'Import hotel reservations'],
    ['Channel Manager', 'Sell on every OTA', 'Rates and rooms in sync', 'No double bookings', 'Hotel channel manager'],
    ['Channel Mappings', 'Map rooms to every channel', 'Once', 'And stay in sync', 'Hotel channel mappings'],
    ['OTA Mappings', 'Every OTA, mapped', 'Room types and rate plans', 'Matched to yours', 'Hotel OTA mappings'],
    ['Channel Calendar', 'Availability across channels', 'In one calendar', 'At a glance', 'Hotel channel calendar'],
    ['Channel Sync Logs', 'Every sync, logged', 'See what went to each OTA', 'And when', 'Hotel channel sync logs'],
    ['Channel Bookings', 'Bookings from every OTA', 'Land in one place', 'Automatically', 'OTA bookings in one place'],
    ['Agents & Commission', 'Travel agents, sorted', 'Commission tracked per booking', 'No spreadsheets', 'Hotel agents and commission'],
    ['Chain Rate Templates', 'Running a hotel chain?', 'One rate template', 'For every property', 'Hotel chain rate templates'],
    ['Outlet Bookings', 'Tables at your hotel restaurant', 'Booked by guests', 'Tracked here', 'Hotel outlet bookings'],
    ['QR Management', 'A QR in every room', 'Guests order and request', 'Without calling', 'Hotel room QR codes'],
    ['Hotel Staff', 'Your hotel team', 'Each with their own login', 'And access', 'Hotel staff logins'],
    ['Night Audit & Reports', 'Night audit, done right', 'Close the day', 'With every report ready', 'Hotel night audit and reports'],
    ['Reports', 'Occupancy, revenue, ADR', 'Every hotel report', 'Ready to share', 'Hotel reports'],
    ['Settings', 'Your hotel, your rules', 'Check-in times, taxes and more', 'In one place', 'Hotel settings'],
  ].map(([t, hook, c1, c2, title], i) => f(`h-${String(i + 1).padStart(2, '0')}`, [hotel(t), hotel(t, 650)], [hook, c1, c2, title], ['hotel PMS', 'hotel software'])),

  // ── Mall / food court ───────────────────────────────────────────────────────────────────────────
  ...[
    ['Overview', 'Your food court at a glance', 'Every vendor, every order', 'One dashboard', 'Food court dashboard'],
    ['Vendors', 'Onboard every stall', 'Each vendor managed', 'From one place', 'Food court vendor management'],
    ['All Orders', 'Orders from every stall', 'In one live list', 'For the whole food court', 'All food court orders together'],
    ['Revenue Share', 'Revenue share, calculated', 'Per vendor', 'Automatically', 'Food court revenue share'],
    ['Mall QR', 'One QR, whole food court', 'Customers browse every stall', 'From a single scan', 'One QR for the food court'],
    ['Reports', 'Food court reports', 'Sales by vendor and day', 'Ready to share', 'Food court reports'],
    ['Settings', 'Run the food court your way', 'Commission, hours and more', 'In one place', 'Food court settings'],
  ].map(([t, hook, c1, c2, title], i) => f(`m-${i + 1}`, [mall(t), mall(t, 600)], [hook, c1, c2, title], ['food court', 'mall'])),

  // ── Multi-outlet brand (supplier) ───────────────────────────────────────────────────────────────
  ...[
    ['Overview', 'Every outlet at a glance', 'Sales and orders across the brand', 'One login', 'Multi-outlet brand dashboard'],
    ['Outlets', 'Add and manage outlets', 'Activate or pause any outlet', 'In a tap', 'Manage every outlet'],
    ['Menu Sync', 'One menu, every outlet', 'Change it once', 'Synced everywhere', 'Sync the menu across outlets'],
    ['All Orders', 'Orders from every outlet', 'In one live list', 'For the whole brand', 'All outlet orders together'],
    ['QR Codes', 'QR codes for every outlet', 'Managed centrally', 'Printed once', 'Outlet QR codes'],
    ['Reports', 'Brand-wide reports', 'Compare outlets', 'Side by side', 'Multi-outlet reports'],
    ['Settings', 'Brand settings', 'Applied to every outlet', 'In one place', 'Brand settings'],
  ].map(([t, hook, c1, c2, title], i) => f(`s-${i + 1}`, [sup(t), sup(t, 600)], [hook, c1, c2, title], ['restaurant chain', 'multi outlet'])),

  // ── Customer QR menu (public demo restaurant; language set per Short) ───────────────────────────
  f('c-scan', [{ url: MENU }, { url: MENU, scroll: 700 }],
    ['Scan. The menu opens.', 'No app, no login', 'Straight in the phone browser', 'What customers see after scanning'], ['QR menu', 'customer experience']),
  f('c-language', [{ url: MENU, menuLang: true }, { url: MENU, scroll: 700 }],
    ['The menu speaks your language', '9 Indian languages', 'Customers pick theirs', 'A QR menu in your language'], ['multilingual menu', 'Indian languages']),
  f('c-categories', [{ url: MENU, click: 'Main Course' }, { url: MENU, click: 'Breads' }],
    ['Find the dish in seconds', 'Browse by category', 'Starters, mains, breads…', 'Easy menu categories'], ['QR menu', 'menu categories']),
  f('c-veg', [{ url: MENU, click: 'Veg' }, { url: MENU, click: 'Veg', scroll: 600 }],
    ['Veg only? One tap.', 'Filter the whole menu', 'Instantly', 'A one-tap veg filter'], ['veg menu', 'vegetarian']),
  f('c-media', [{ url: MENU, locate: 'Watch video' }, { url: MENU, locate: 'View in 3D' }],
    ['See the dish before you order', 'A short video', 'Or a 3D model', 'Video and 3D dish previews'], ['3D menu', 'video menu']),
  f('c-search', [{ url: MENU, locate: 'Search dishes' }, { url: MENU, scroll: 1200 }],
    ['Craving something?', 'Search the whole menu', 'Photos and prices for every dish', 'Search a restaurant menu fast'], ['menu search', 'QR menu']),

  // ── Booking engine: AviQR Stays marketplace (bm.aviqr.com) ──────────────────────────────────────
  f('b-hero', [{ url: BM }, { url: BM, scroll: 700 }],
    ['See your room before you arrive', 'Pick the exact room and view', 'Book direct', 'Book a hotel room by view'], ['hotel booking', 'book direct']),
  f('b-destinations', [{ url: BM, locate: 'Popular destinations' }, { url: BM, locate: 'Famous stays' }],
    ['Where to next?', 'Popular destinations', 'And famous stays', 'Find a stay by destination'], ['travel India', 'hotel booking']),
  f('b-recommended', [{ url: BM, locate: 'Recommended stays' }, { url: BM, locate: 'All stays' }],
    ['Stays picked for you', 'Based on what you explore', 'Book in a few taps', 'Recommended hotel stays'], ['hotel booking', 'travel']),
  f('b-view', [{ url: BM, locate: 'Choose the room' }, { url: BM, locate: 'Choose the room', scroll: 500 }],
    ['Choose the room. Choose the view.', 'Pick the side of the building', 'Then walk through it in 3D', 'Pick your exact hotel room'], ['room view', '3D room tour']),
  f('b-trips', [{ url: BM + '#/trips' }, { url: BM + '#/find' }],
    ['Your trips, one tap away', 'Find any booking', 'No login needed', 'Manage your hotel booking'], ['my trips', 'hotel booking']),
  f('b-currency', [{ url: BM, click: 'INR' }, { url: BM, scroll: 400 }],
    ['Prices in your currency', 'Dozens of currencies', 'Book from anywhere', 'Hotel prices in any currency'], ['currency', 'travel']),

  // ── Booking engine: a hotel’s own branded site (leela.aviqr.com) ────────────────────────────────
  f('l-hero', [{ url: LEELA }, { url: LEELA, scroll: 700 }],
    ['Your hotel’s own booking site', 'Your brand, your colours', 'Book direct, no commission', 'A direct booking website for your hotel'], ['hotel website', 'direct booking']),
  f('l-rooms', [{ url: LEELA, locate: 'Rooms' }, { url: LEELA, locate: 'Rooms', scroll: 700 }],
    ['Garden rooms, suites, villas', 'Every room type', 'With live availability', 'Show every room type'], ['hotel rooms', 'resort']),
  f('l-steps', [{ url: LEELA, scroll: 900 }, { url: LEELA, scroll: 1500 }],
    ['Booked in five simple steps', 'Dates, room, extras, details', 'Then confirm', 'A five-step hotel booking flow'], ['booking engine', 'hotel booking']),
  f('l-location', [{ url: LEELA, click: 'LOCATION' }, { url: LEELA, click: 'LOCATION', scroll: 300 }],
    ['Show guests where you are', 'A live map', 'On your own site', 'Hotel location map'], ['hotel location', 'resort']),
  f('l-trips', [{ url: LEELA + 'trips' }, { url: LEELA + 'find' }],
    ['Guests manage their own stay', 'My trips and find booking', 'On your hotel’s site', 'Guest self-service for hotels'], ['guest experience', 'hotel booking']),
];
