// Vertical (9:16) feature Shorts for YouTube Shorts, Instagram Reels and Facebook Reels.
//
// Every Short is built from public aviqr.com pages only (no login, nothing written to production):
// crisp phone-size screenshots (432x768 CSS px at 2.5x = 1080x1920) with a caption bar, a slow zoom,
// a hook card first and a "Start free" card last. Captions quote the live site, so nothing is claimed
// that aviqr.com does not already say, and no rupee pricing is shown.
//
// Usage (from social-content/):
//   npm install                         # playwright-core; Chrome and ffmpeg must be installed
//   node shorts/render.mjs              # capture + render every Short, then write the posting plan
//   node shorts/render.mjs --plan-only  # rebuild out/by-date/ from already-rendered videos
//   node shorts/render.mjs --only 03 07 # re-render some Shorts
//   options: --start YYYY-MM-DD (first posting day, default tomorrow)  --time HH:MM (IST, default 12:00)
//
// Also cuts CLIPS (real logged-in product footage from youtube/out/final) into vertical Shorts.
// Output: shorts/out/videos/<id>.mp4 and .png (cover), and shorts/out/by-date/<date>/<HHMM>-<id>.{mp4,png,json}
// (hard links) that shorts/youtube-upload.py and shorts/meta-upload.py publish, one Short a day.
import { chromium } from '../node_modules/playwright-core/index.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const SHOTS = path.join(OUT, 'shots');
const VIDEOS = path.join(OUT, 'videos');
const SITE = 'https://aviqr.com';
const MENU = SITE + '/menu/ecdbc557-91fa-44ee-992f-03683ad8bbde?table=1'; // public demo restaurant (Spice Route)
const PHONE = { width: 432, height: 768 };
const SCALE = 2.5; // 432x768 -> 1080x1920
const FPS = 30;
const HOOK_S = 2.6, SHOT_S = 5.2, END_S = 3.2, FADE_S = 0.4;
const GREEN = '#0F6E56';

// Screen recipes. `card` scrolls a home-page feature card into view; the others are named screens.
const home = card => ({ url: SITE + '/', heading: card });
const features = h2 => ({ url: SITE + '/features', heading: h2, level: 2 });
const S = {
  menuTop: { url: MENU },
  menuDish: { url: MENU, locate: 'Mushroom Pepper Fry', offset: 330 },
  menuMains: { url: MENU, click: 'Main Course', offset: 0 },
  menuLang: { url: MENU, click: 'English', wait: 900, scrollTop: true },
  menuMedia: { url: MENU, locate: 'Watch video', offset: 260 },
  menuVeg: { url: MENU, click: 'Veg', wait: 900, scrollTop: true },
  hero: { url: SITE + '/' },
  ownerScreens: { url: SITE + '/', heading: 'What you run the business with', level: 3, offset: 60 },
  customerScreens: { url: SITE + '/', heading: 'What your customers see', level: 3, offset: 60 },
  forEvery: { url: SITE + '/', heading: 'Built for every food business', level: 2, offset: 60 },
  generator: { url: SITE + '/free-qr-menu-generator' },
  trackOrder: { url: SITE + '/track-order' },
  trusted: { url: SITE + '/', heading: 'Built to be trusted with real orders and real payments', level: 2, offset: 60 },
};

// The Shorts, in posting order. hook: big text on the first card. caps: one caption per screen.
const SHORTS = [
  { id: '01-no-app', hook: 'Your menu opens with any phone camera', screens: [home('No App to Install'), S.menuTop],
    caps: ['Scan with any phone camera — no app to download', 'The menu opens straight in the browser'],
    title: 'A QR menu with no app to install', tags: ['QR menu', 'no app menu', 'restaurant tech'] },
  { id: '02-languages', hook: 'One menu, 9 Indian languages', screens: [home('9 Indian Languages'), S.menuLang],
    caps: ['Every menu auto-translates', 'Hindi, Tamil, Telugu, Kannada, Bengali, Marathi and more'],
    title: 'Your restaurant menu in 9 Indian languages', tags: ['multilingual menu', 'Hindi menu', 'Tamil menu'] },
  { id: '03-permanent-qr', hook: 'Print your QR once. Update forever.', screens: [home('Permanent QR Code'), S.menuMains],
    caps: ['One QR. Print once.', 'Prices change? Update the menu — no reprinting'],
    title: 'A permanent QR code for your menu — never reprint', tags: ['permanent QR code', 'QR menu', 'menu printing'] },
  { id: '04-ocr-upload', hook: 'Photo of your menu → digital menu', screens: [home('OCR Menu Upload'), S.menuDish],
    caps: ['Photograph your printed menu', 'AI builds your digital menu in under 5 minutes'],
    title: 'Turn a photo of your printed menu into a digital menu', tags: ['OCR menu', 'AI menu', 'digital menu'] },
  { id: '05-kot', hook: 'No paper tickets. No shouting.', screens: [home('Kitchen Display (KOT)'), S.ownerScreens],
    caps: ['Orders hit the kitchen screen the instant they’re placed', 'Kitchen display, built into the same dashboard'],
    title: 'Kitchen display (KOT): orders reach the kitchen instantly', tags: ['KOT', 'kitchen display system', 'restaurant kitchen'] },
  { id: '06-dish-video-3d', hook: 'Let the dish sell itself', screens: [home('Video & 3D Dish Previews'), S.menuMedia],
    caps: ['A short video or a rotatable 3D model of the dish', 'Customers see what’s coming before they order'],
    title: 'Video and 3D dish previews on your QR menu', tags: ['3D menu', 'video menu', 'food presentation'] },
  { id: '07-live-tracking', hook: 'Where’s my order? Right here.', screens: [home('Live Order Tracking'), S.trackOrder],
    caps: ['Confirmed → Preparing → Ready, in real time', 'With a pickup code — track any order'],
    title: 'Live order tracking for restaurant customers', tags: ['order tracking', 'restaurant orders', 'pickup code'] },
  { id: '08-pos-billing', hook: 'Counter orders to GST bill in one screen', screens: [home('POS & Billing'), features('Discounts and service charges, itemized on the bill')],
    caps: ['Take counter orders and print GST-ready bills', 'Discounts and service charges, itemised on the bill'],
    title: 'Restaurant POS and GST billing in one dashboard', tags: ['restaurant POS', 'GST billing', 'billing software'] },
  { id: '09-dynamic-pricing', hook: 'Happy-hour prices that switch themselves', screens: [home('Dynamic Pricing'), S.menuMains],
    caps: ['Weekend, festival and happy-hour pricing', 'Switches automatically by time and date'],
    title: 'Dynamic pricing: happy hour and festival prices on autopilot', tags: ['dynamic pricing', 'happy hour', 'restaurant pricing'] },
  { id: '10-hotel-requests', hook: 'Room service without a phone call', screens: [home('In-Room Hotel Requests'), home('Hotel Operations')],
    caps: ['Housekeeping, laundry, spa or room service — from the QR in the room', 'A full front-desk dashboard for the hotel'],
    title: 'In-room hotel requests from a QR code', tags: ['hotel QR code', 'room service', 'hotel tech'] },
  { id: '11-food-court', hook: 'One scan. Every stall in the food court.', screens: [home('One QR, Whole Food Court'), home('Mall & Food-Court Mode')],
    caps: ['Browse every vendor from a single scan', 'Onboard vendors and track revenue share per stall'],
    title: 'One QR code for a whole mall food court', tags: ['food court', 'mall QR code', 'multi vendor'] },
  { id: '12-pay-any-way', hook: 'Checkout in under 30 seconds', screens: [home('Pay Any Way'), home('Real Payments')],
    caps: ['UPI, card, cash or wallet', 'Razorpay-powered online payments plus cash'],
    title: 'UPI, card or cash — QR menu checkout in 30 seconds', tags: ['UPI payments', 'restaurant payments', 'Razorpay'] },
  { id: '13-loyalty', hook: 'Turn first visits into regulars', screens: [home('Loyalty Rewards'), home('Loyalty & CRM')],
    caps: ['Customers earn points on every order', 'Bronze → Platinum tiers, redeemed automatically'],
    title: 'Restaurant loyalty points and tiers, built in', tags: ['loyalty program', 'restaurant CRM', 'customer retention'] },
  { id: '14-ai-features', hook: '11 AI features for your restaurant', screens: [home('11 AI Features'), S.ownerScreens],
    caps: ['Admin assistant, demand forecasting, fraud detection', 'Dynamic pricing and more — powered by Claude'],
    title: '11 AI features inside a restaurant dashboard', tags: ['restaurant AI', 'AI for restaurants', 'demand forecasting'] },
  { id: '15-customisation', hook: 'Sizes, portions, extras — your call', screens: [home('Item-wise Customisation'), S.menuDish],
    caps: ['Variations and add-ons for every menu item', 'Each with its own price'],
    title: 'Menu item variations and add-ons with separate pricing', tags: ['menu add ons', 'item variations', 'menu management'] },
  { id: '16-aggregators', hook: 'Out of stock? Switch it off everywhere.', screens: [home('Aggregator Integration'), S.ownerScreens],
    caps: ['Sync your menu to Zomato, Swiggy and other apps', 'Flip any item ON/OFF from the POS'],
    title: 'Sync your menu to Zomato and Swiggy from one POS', tags: ['Zomato', 'Swiggy', 'aggregator integration'] },
  { id: '17-shortcodes', hook: 'Billing at the speed of typing', screens: [home('Quick-Bill Shortcodes'), features('Confirm codes without leaving the billing screen')],
    caps: ['Item-wise shortcodes for lightning-fast billing', 'Faster checkout for staff and customers'],
    title: 'Quick-bill shortcodes for faster restaurant billing', tags: ['quick billing', 'POS shortcuts', 'cashier'] },
  { id: '18-dine-in-areas', hook: 'Rooftop, AC hall, garden — separate menus', screens: [home('Multiple Dine-in Areas'), S.menuTop],
    caps: ['Separate dine-in areas, each with its own menu', 'Full pricing control for every area'],
    title: 'Different menus and prices for each dine-in area', tags: ['dine in', 'restaurant sections', 'menu pricing'] },
  { id: '19-analytics', hook: 'Know your peak hours and top dishes', screens: [home('Analytics & Reports'), S.ownerScreens],
    caps: ['Revenue trends, peak hours and top items', 'Customer spend analysis, in real time'],
    title: 'Restaurant analytics: peak hours, top items, revenue', tags: ['restaurant analytics', 'sales reports', 'peak hours'] },
  { id: '20-sms-campaigns', hook: 'Birthday wishes that send themselves', screens: [home('SMS Campaigns'), home('Loyalty & CRM')],
    caps: ['Birthday and anniversary wishes, segment broadcasts', 'Sent automatically — no manual follow-up'],
    title: 'Automatic birthday SMS campaigns for restaurants', tags: ['SMS marketing', 'restaurant marketing', 'birthday offers'] },
  { id: '21-inventory', hook: 'What does each dish really cost you?', screens: [home('Inventory & Recipes'), S.ownerScreens],
    caps: ['Track raw material stock and real cost per dish', 'Automatic low-stock alerts'],
    title: 'Restaurant inventory and recipe costing with low-stock alerts', tags: ['restaurant inventory', 'recipe costing', 'food cost'] },
  { id: '22-staff-roles', hook: 'Everyone sees only what they need', screens: [home('Staff Roles'), S.ownerScreens],
    caps: ['Owner, manager, kitchen and cashier logins', 'Each role sees only its own screens'],
    title: 'Staff roles for owner, manager, kitchen and cashier', tags: ['staff management', 'restaurant staff', 'user roles'] },
  { id: '23-multi-outlet', hook: 'Run every outlet from one place', screens: [home('Multi-Outlet Brands'), S.forEvery],
    caps: ['Multi-outlet brands on one platform', 'Built for every kind of food business'],
    title: 'One dashboard for multi-outlet restaurant brands', tags: ['multi outlet', 'restaurant chain', 'cloud kitchen'] },
  { id: '24-counter-code', hook: 'Proof of order before it’s paid', screens: [features('A code and QR your customer can show at the counter'), S.menuTop],
    caps: ['A 6-digit code and QR for pay-at-counter orders', 'Shown on the customer’s confirmation screen'],
    title: 'Pay-at-counter order codes your customers can show', tags: ['pay at counter', 'order code', 'counter service'] },
  { id: '25-live-status', hook: 'Order status that follows the customer', screens: [features('Live status, not just at checkout — everywhere'), S.trackOrder],
    caps: ['Confirmed → Preparing → Ready → Served', 'In order history too, refreshing every few seconds'],
    title: 'Live order status in order history, not just checkout', tags: ['order status', 'customer experience', 'restaurant app'] },
  { id: '26-branded-receipts', hook: 'Receipts with your logo, not ours', screens: [features('Receipts that carry your logo, not a generic template'), home('POS & Billing')],
    caps: ['Your logo, address and GSTIN on every receipt', 'With the full discount, service-charge and tax break-up'],
    title: 'Branded restaurant receipts with your logo and GSTIN', tags: ['restaurant receipt', 'GST invoice', 'branding'] },
  { id: '27-veg-filter', hook: 'Veg only? One tap.', screens: [S.menuVeg, S.menuMains],
    caps: ['Customers filter the menu to veg in one tap', 'Then browse by category: starters, mains, breads…'],
    title: 'A QR menu with a one-tap veg filter', tags: ['veg menu', 'vegetarian', 'QR menu'] },
  { id: '28-free-generator', hook: 'Free QR code for your menu — no signup', screens: [S.generator, S.hero],
    caps: ['Turn any menu link into a printable QR code', 'Free, no signup needed'],
    title: 'Free QR code generator for your menu (no signup)', tags: ['free QR code', 'QR generator', 'menu QR code'] },
  { id: '29-customer-side', hook: 'What your customers see when they scan', screens: [S.customerScreens, S.menuDish],
    caps: ['Menu, dish photos, cart and order tracking', 'All in the browser — no login, no app'],
    title: 'What restaurant customers see after scanning an AviQR menu', tags: ['customer experience', 'digital menu', 'QR ordering'] },
  { id: '30-trusted', hook: 'Built for real orders and real payments', screens: [S.trusted, S.hero],
    caps: ['Built to be trusted with real orders and payments', 'One QR code — your whole restaurant & hotel OS'],
    title: 'AviQR: one QR code for your whole restaurant', tags: ['restaurant software', 'restaurant OS', 'India'] },
];

// Shorts cut from the real logged-in product recordings in youtube/out/final (demo shops only; the customer
// flow there is already blurred). Each clip shows the landscape recording full width on a blurred backdrop
// with the hook above it. from/to are seconds in the source video (its chapter marks); crop is [width, x] of the
// 1920x1080 source to keep (default drops the 320px sidebar; the customer flow keeps just the phone).
const DEMOS = path.join(HERE, '..', 'youtube', 'out', 'final');
const CLIPS = [
  { id: '31-owner-new-order', src: '07-owner-order-flow', from: 8.5, to: 21.0, hook: 'A new order lands. One tap to accept.',
    caps: ['A real order arrives on the owner dashboard', 'Accept it and it goes straight to the kitchen'],
    title: 'A new order arrives on the restaurant dashboard', tags: ['restaurant dashboard', 'online orders', 'order management'] },
  { id: '32-owner-kitchen', src: '07-owner-order-flow', from: 21.0, to: 33.5, hook: 'The kitchen sees it instantly',
    caps: ['Accepted orders appear on the kitchen screen', 'Cooks mark them preparing and ready'],
    title: 'From order to kitchen screen in seconds', tags: ['KOT', 'kitchen display', 'restaurant kitchen'] },
  { id: '33-owner-ready-revenue', src: '07-owner-order-flow', from: 33.5, to: 55.6, hook: 'Ready, served — and revenue updates live',
    caps: ['Mark the order ready and delivered', 'The dashboard revenue updates live'],
    title: 'Order ready to revenue, live on the dashboard', tags: ['restaurant revenue', 'live dashboard', 'POS'] },
  { id: '34-owner-menu-inventory', src: '07-owner-order-flow', from: 55.6, to: 66.0, hook: 'Menu and stock in one place',
    caps: ['Edit the menu and track inventory', 'From the same owner dashboard'],
    title: 'Restaurant menu and inventory management in one dashboard', tags: ['menu management', 'inventory', 'restaurant software'] },
  { id: '35-owner-loyalty-reports', src: '07-owner-order-flow', from: 66.0, to: 76.9, hook: 'Who are your regulars?',
    caps: ['Loyalty members and tiers', 'Reports on sales, items and customers'],
    title: 'Loyalty and reports inside the owner dashboard', tags: ['loyalty program', 'restaurant reports', 'CRM'] },
  { id: '36-owner-ai-hub', src: '07-owner-order-flow', from: 76.9, to: 84.0, hook: 'Your restaurant’s AI hub',
    caps: ['AI tools in the owner dashboard', 'Forecasting, pricing and an admin assistant'],
    title: 'The AI hub in a restaurant dashboard', tags: ['restaurant AI', 'AI tools', 'demand forecasting'] },
  { id: '37-customer-scan-to-cart', src: '06-customer-order-flow', crop: [1200, 360], from: 3.0, to: 23.3, hook: 'Scan, browse, add to cart',
    caps: ['A customer scans the table QR', 'Browses the menu and adds to cart — no app'],
    title: 'Ordering from a table QR code, step by step', tags: ['QR ordering', 'table QR', 'customer experience'] },
  { id: '38-customer-order-confirmed', src: '06-customer-order-flow', crop: [1200, 360], from: 63.4, to: 86.0, hook: 'Order placed. Confirmed in seconds.',
    caps: ['The customer places the order', 'And gets an instant confirmation'],
    title: 'Placing a QR order and getting it confirmed', tags: ['QR ordering', 'order confirmation', 'restaurant'] },
  { id: '39-pos-confirm-code', src: '02-whats-new-order-codes-tracking-billing', from: 15.7, to: 31.9, hook: 'Confirm a counter order in one tap',
    caps: ['Scan or type the customer’s code on the POS', 'Confirm payment or pickup, and track it live'],
    title: 'Confirm pay-at-counter orders right from the POS', tags: ['POS', 'counter orders', 'order code'] },
  { id: '40-billing-receipts', src: '02-whats-new-order-codes-tracking-billing', from: 31.9, to: 52.0, hook: 'Itemised bills, branded receipts',
    caps: ['Discounts and service charges, itemised', 'Receipts with your logo and GSTIN'],
    title: 'Itemised GST bills and branded receipts', tags: ['GST billing', 'restaurant receipt', 'POS'] },
  { id: '41-hotel-guest-request', src: '08-hotel-flow', from: 9.0, to: 26.7, hook: 'A guest asks from the room. The desk sees it.',
    caps: ['A real in-room guest request', 'Lands on the hotel front-desk dashboard'],
    title: 'Hotel guest requests from a room QR code', tags: ['hotel software', 'guest requests', 'room service'] },
  { id: '42-hotel-housekeeping', src: '08-hotel-flow', from: 26.7, to: 45.8, hook: 'Housekeeping and reservations, one screen',
    caps: ['Housekeeping tasks for every room', 'And reservations on the same dashboard'],
    title: 'Hotel housekeeping and reservations in one dashboard', tags: ['housekeeping', 'hotel PMS', 'reservations'] },
  { id: '43-mall-vendors', src: '09-mall-flow', from: 9.0, to: 28.0, hook: 'Every food-court vendor, one dashboard',
    caps: ['Manage each vendor', 'And see orders across every stall'],
    title: 'Run a mall food court from one dashboard', tags: ['food court', 'mall', 'multi vendor'] },
  { id: '44-mall-revenue-share', src: '09-mall-flow', from: 28.0, to: 49.0, hook: 'Revenue share per stall, done for you',
    caps: ['Revenue share calculated per vendor', 'With reports for the whole food court'],
    title: 'Food-court revenue share per vendor, automatically', tags: ['revenue share', 'food court', 'mall management'] },
  { id: '45-brand-outlets', src: '10-supplier-flow', from: 9.0, to: 23.1, hook: 'Every outlet. One login.',
    caps: ['See every outlet of your brand', 'And sync the menu across all of them'],
    title: 'Multi-outlet brands: every outlet, one login', tags: ['multi outlet', 'restaurant chain', 'menu sync'] },
  { id: '46-brand-orders-reports', src: '10-supplier-flow', from: 23.1, to: 44.0, hook: 'All outlets’ orders and reports together',
    caps: ['Orders from every outlet', 'Reports across the whole brand'],
    title: 'Orders and reports across all your outlets', tags: ['restaurant chain', 'reports', 'franchise'] },
  { id: '47-staff-role-types', src: '12-staff-roles-flow', from: 9.0, to: 38.5, hook: 'Manager, cashier, kitchen — separate logins',
    caps: ['Five staff role types', 'Each sees only the screens it needs'],
    title: 'Staff roles: manager, cashier, kitchen, menu editor', tags: ['staff roles', 'restaurant staff', 'permissions'] },
];

const BASE_TAGS = ['AviQR', 'QR menu', 'restaurant software', 'India'];
// Posting order: alternate website feature Shorts with real-product clips.
const ALL = [];
for (let i = 0; i < Math.max(SHORTS.length, CLIPS.length); i++) { if (SHORTS[i]) ALL.push(SHORTS[i]); if (CLIPS[i]) ALL.push(CLIPS[i]); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const ff = args => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

const CAPTION_CSS = `#__aq_cap{position:fixed;left:16px;right:16px;bottom:96px;z-index:2147483647;pointer-events:none;
  background:rgba(15,23,42,.92);color:#fff;font:700 21px/1.32 -apple-system,'Inter','Segoe UI',sans-serif;
  padding:14px 18px;border-radius:14px;text-align:center;border-left:6px solid #1D9E75;box-shadow:0 8px 30px rgba(0,0,0,.35)}`;

async function capture(page, screen, caption, png) {
  await page.goto(screen.url, { waitUntil: 'networkidle' }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await sleep(500);
  if (screen.click) { await page.getByRole('button', { name: screen.click, exact: false }).first().click().catch(() => {}); await sleep(screen.wait || 700); }
  let target = null;
  if (screen.heading) target = page.getByRole('heading', { name: screen.heading, level: screen.level || 3, exact: false }).first();
  if (screen.locate) target = page.getByText(screen.locate, { exact: false }).first();
  if (target && !(await target.count())) throw new Error(`not found on ${screen.url}: ${screen.heading || screen.locate}`);
  if (target) {
    if (screen.heading && !screen.level && screen.url === SITE + '/') { // a home-page feature card: ring it so it stands out from its neighbours
      await target.evaluate(el => {
        const c = el.parentElement;
        c.style.boxShadow = '0 0 0 3px #1D9E75, 0 12px 34px rgba(15,110,86,.28)';
        c.style.background = '#fff';
      });
    }
    const y = await target.evaluate((el, off) => el.getBoundingClientRect().top + window.scrollY - off, screen.offset ?? 250);
    await page.evaluate(y => window.scrollTo({ top: Math.max(0, y), behavior: 'instant' }), y);
  } else if (!screen.scrollTop && screen.click) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  }
  await sleep(700);
  await page.evaluate(([css, text]) => {
    document.getElementById('__aq_cap')?.remove();
    const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st);
    const cap = document.createElement('div'); cap.id = '__aq_cap'; cap.textContent = text;
    document.documentElement.appendChild(cap);
  }, [CAPTION_CSS, caption]);
  await page.screenshot({ path: png });
}

async function card(browser, kind, text, png) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const body = kind === 'hook'
    ? `<div class="logo">AviQR</div><h1>${esc(text)}</h1><div class="tag">Restaurant &amp; Hotel OS</div>`
    : `<div class="logo">AviQR</div><h1>Start free at aviqr.com</h1><p>No credit card · Live in under 10 minutes</p><div class="tag">Follow for a new feature every day</div>`;
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    *{margin:0;box-sizing:border-box}
    body{width:1080px;height:1920px;background:radial-gradient(900px 1200px at 20% 10%,#12805f 0,${GREEN} 45%,#0a3d31 100%);
      color:#fff;font-family:-apple-system,'Inter','Segoe UI',sans-serif;display:flex;flex-direction:column;
      justify-content:center;align-items:center;text-align:center;padding:0 90px}
    .logo{font-size:72px;font-weight:800;letter-spacing:-1px;background:#fff;color:${GREEN};padding:10px 40px;border-radius:24px;margin-bottom:90px}
    h1{font-size:104px;line-height:1.08;font-weight:800;letter-spacing:-2px}
    p{font-size:48px;margin-top:48px;opacity:.92;line-height:1.35}
    .tag{position:absolute;bottom:150px;font-size:36px;letter-spacing:3px;opacity:.8;text-transform:uppercase}
  </style>${body}`);
  await page.screenshot({ path: png });
  await page.close();
}

function encode(images, mp4) {
  // images: [{png, seconds}]. Each still gets a slow zoom; neighbours crossfade.
  const inputs = [], filters = [];
  images.forEach(({ png, seconds }, i) => {
    inputs.push('-loop', '1', '-t', String(seconds), '-framerate', String(FPS), '-i', png);
    const frames = Math.round(seconds * FPS);
    filters.push(`[${i}:v]scale=2160:3840:flags=lanczos,zoompan=z='1+0.05*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=${FPS},format=yuv420p,setsar=1[v${i}]`);
  });
  let last = 'v0', offset = images[0].seconds - FADE_S;
  for (let i = 1; i < images.length; i++) {
    filters.push(`[${last}][v${i}]xfade=transition=fade:duration=${FADE_S}:offset=${offset.toFixed(2)}[x${i}]`);
    last = `x${i}`;
    offset += images[i].seconds - FADE_S;
  }
  const total = images.reduce((s, x) => s + x.seconds, 0) - FADE_S * (images.length - 1);
  ff([...inputs, '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-filter_complex', filters.join(';'), '-map', `[${last}]`, '-map', `${images.length}:a`, '-t', total.toFixed(2),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-r', String(FPS), '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', mp4]);
}

function metadata(s) {
  const utm = `utm_source=shorts&utm_medium=social&utm_campaign=aviqr-shorts&utm_content=${s.id}`;
  const description = [
    `${s.caps[0]}. ${s.caps[1]}.`,
    '',
    'AviQR — one permanent QR code for your restaurant, hotel or food court: menu, orders, KOT, billing, payments, loyalty and reports.',
    `Start free (no credit card): https://aviqr.com/?${utm}`,
    '',
    [...new Set([...s.tags, ...BASE_TAGS])].map(t => '#' + t.replace(/[^A-Za-z0-9]/g, '')).join(' '),
  ].join('\n');
  return { title: `${s.title} | AviQR`, description, tags: [...new Set([...s.tags, ...BASE_TAGS])], made_for_kids: false };
}

async function render(only) {
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.mkdirSync(VIDEOS, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: SCALE, isMobile: true, hasTouch: true,
    locale: 'en-IN', timezoneId: 'Asia/Kolkata' });
  const page = await ctx.newPage();
  const failed = [];
  for (const s of ALL) {
    if (only.length && !only.some(o => s.id.startsWith(o))) continue;
    try { await (s.src ? renderClip(browser, s) : renderOne(browser, page, s)); } catch (e) { failed.push(s.id); console.log('FAILED', s.id, e.message.split('\n')[0]); }
  }
  await browser.close();
  if (failed.length) console.log('failed:', failed.join(' '));
}

async function renderClip(browser, c) {
  const src = path.join(DEMOS, c.src + '.mp4');
  if (!fs.existsSync(src)) throw new Error(`missing ${src}`);
  const frame = path.join(SHOTS, `${c.id}-frame.png`), end = path.join(SHOTS, `${c.id}-9end.png`);
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>*{margin:0;box-sizing:border-box}
    body{width:1080px;height:1920px;background:transparent;font-family:-apple-system,'Inter','Segoe UI',sans-serif;color:#fff;text-align:center}
    .top{position:absolute;top:250px;left:70px;right:70px}
    .logo{display:inline-block;font-size:52px;font-weight:800;background:#fff;color:${GREEN};padding:6px 28px;border-radius:18px;margin-bottom:46px}
    h1{font-size:76px;line-height:1.1;font-weight:800;letter-spacing:-1px;text-shadow:0 4px 24px rgba(0,0,0,.5)}
    .bottom{position:absolute;bottom:300px;left:0;right:0;font-size:40px;font-weight:700;opacity:.92;text-shadow:0 3px 16px rgba(0,0,0,.6)}
  </style><div class="top"><div class="logo">AviQR</div><h1>${esc(c.hook)}</h1></div><div class="bottom">Real product · aviqr.com</div>`);
  await page.screenshot({ path: frame, omitBackground: true });
  await page.close();
  await card(browser, 'end', '', end);
  const dur = c.to - c.from, mp4 = path.join(VIDEOS, `${c.id}.mp4`);
  ff(['-ss', String(c.from), '-t', dur.toFixed(2), '-i', src, '-i', frame,
    '-loop', '1', '-t', String(END_S), '-framerate', String(FPS), '-i', end,
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-filter_complex',
    `[0:v]fps=${FPS},split[a][b];` +
    `[a]scale=-2:1920,crop=1080:1920,boxblur=28:2,eq=brightness=-0.32[bg];` +
    `[b]crop=${(c.crop || [1600, 320])[0]}:ih:${(c.crop || [1600, 320])[1]}:0,scale=1080:-2:flags=lanczos[fg];` +
    `[bg][fg]overlay=0:(H-h)/2+40[m];[m][1:v]overlay=0:0,format=yuv420p,setsar=1[c];` +
    `[2:v]scale=1080:1920,fps=${FPS},format=yuv420p,setsar=1[e];` +
    `[c][e]xfade=transition=fade:duration=${FADE_S}:offset=${(dur - FADE_S).toFixed(2)}[v]`,
    '-map', '[v]', '-map', '3:a', '-t', (dur + END_S - FADE_S).toFixed(2),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-r', String(FPS), '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', mp4]);
  ff(['-ss', String(Math.min(3, dur / 2)), '-i', mp4, '-frames:v', '1', path.join(VIDEOS, `${c.id}.png`)]);
  fs.writeFileSync(path.join(VIDEOS, `${c.id}.json`), JSON.stringify(metadata(c), null, 1));
  console.log('rendered', c.id);
}

async function renderOne(browser, page, s) {
  {
    const hook = path.join(SHOTS, `${s.id}-0hook.png`), end = path.join(SHOTS, `${s.id}-9end.png`);
    await card(browser, 'hook', s.hook, hook);
    await card(browser, 'end', '', end);
    const shots = [];
    for (const [i, screen] of s.screens.entries()) {
      const png = path.join(SHOTS, `${s.id}-${i + 1}.png`);
      await capture(page, screen, s.caps[i], png);
      shots.push({ png, seconds: SHOT_S });
    }
    const mp4 = path.join(VIDEOS, `${s.id}.mp4`);
    encode([{ png: hook, seconds: HOOK_S }, ...shots, { png: end, seconds: END_S }], mp4);
    fs.copyFileSync(shots[0].png, path.join(VIDEOS, `${s.id}.png`)); // cover
    fs.writeFileSync(path.join(VIDEOS, `${s.id}.json`), JSON.stringify(metadata(s), null, 1));
    console.log('rendered', s.id);
  }
}

function plan(start, time) {
  // One Short a day from `start`, in SHORTS order, as hard links next to their metadata.
  const dir = path.join(OUT, 'by-date');
  fs.rmSync(dir, { recursive: true, force: true });
  let day = new Date(start + 'T00:00:00Z'), n = 0;
  for (const s of ALL) {
    const mp4 = path.join(VIDEOS, `${s.id}.mp4`);
    if (!fs.existsSync(mp4)) { console.log('skip (not rendered)', s.id); continue; }
    const date = day.toISOString().slice(0, 10);
    const folder = path.join(dir, date);
    fs.mkdirSync(folder, { recursive: true });
    const stem = `${time.replace(':', '')}-${s.id}`;
    fs.linkSync(mp4, path.join(folder, stem + '.mp4'));
    fs.linkSync(path.join(VIDEOS, `${s.id}.png`), path.join(folder, stem + '.png'));
    const meta = JSON.parse(fs.readFileSync(path.join(VIDEOS, `${s.id}.json`)));
    fs.writeFileSync(path.join(folder, stem + '.json'), JSON.stringify({ date, time_ist: time, video: stem + '.mp4',
      cover: stem + '.png', ...meta }, null, 1));
    day = new Date(day.getTime() + 86400000);
    n++;
  }
  console.log(`planned ${n} Shorts from ${start} at ${time} IST -> ${dir}`);
}

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const tomorrow = new Date(Date.now() + 5.5 * 3600e3 + 86400e3).toISOString().slice(0, 10);
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? args.slice(onlyIdx + 1).filter(a => !a.startsWith('--')) : [];
if (!args.includes('--plan-only')) await render(only);
plan(opt('--start', tomorrow), opt('--time', '12:00'));
