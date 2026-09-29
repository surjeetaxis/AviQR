// Public-page demo videos for aviqr.com (no login, nothing written to production).
// Usage: node youtube/public-videos.mjs [01 02 ...]
import { record, finish } from './lib.mjs';

const BASE = 'https://aviqr.com';

const VIDEOS = {
  '01': {
    slug: '01-aviqr-overview',
    meta: {
      title: 'AviQR in 2 minutes — one QR code for your restaurant, hotel or mall',
      subtitle: 'Menu, orders, payments, loyalty and reports behind one permanent QR',
      description:
        'A tour of aviqr.com: how one permanent QR code gives customers a no-app menu in 9 Indian languages and gives owners orders, KOT, billing, inventory, loyalty, AI tools and reports.\n' +
        'Everything shown is the live public website.',
      tags: ['AviQR', 'QR menu', 'restaurant software', 'digital menu', 'QR ordering', 'restaurant tech', 'India'],
    },
    async run(page, h) {
      await h.goto(BASE + '/');
      await page.mouse.move(720, 420);
      h.begin();

      h.chapter('The idea: one permanent QR');
      await h.say('AviQR: one permanent QR code that runs your whole restaurant', 4500);
      await h.moveTo(page.locator('.hero').getByText('Live orders').first(), 40);
      await h.say('Menu, orders, payments, loyalty, CRM, campaigns, staff and reports', 4500);
      await page.mouse.move(1400, 520, { steps: 30 }); // park the cursor in the page margin
      await h.scrollToEl(page.locator('.stats-band'), { offset: 250 });
      await h.say('Free Starter plan · 9 Indian languages · live in under 10 minutes', 4500);

      h.chapter('For your customers');
      const feat = page.locator('#features');
      await h.scrollToEl(feat.getByText('For your customers', { exact: true }), { offset: 120 });
      await h.say('For your customers: scan, browse, order. No app, no login', 4200);
      await h.scrollToEl(feat.getByText('9 Indian Languages', { exact: true }), { offset: 330 });
      await h.say('Every menu auto-translates into 9 Indian languages', 4000);
      await h.scrollToEl(feat.getByText('Live Order Tracking', { exact: true }), { offset: 330 });
      await h.say('Live order tracking: Confirmed → Preparing → Ready', 4000);
      await h.scrollToEl(feat.getByText('Pay Any Way', { exact: true }), { offset: 330 });
      await h.say('Pay by UPI, card, cash or wallet', 3500);
      await h.scrollToEl(feat.getByText('Let the dish sell itself'), { offset: 200 });
      await h.say('Add a short video or a rotatable 3D model to any dish', 4500);

      h.chapter('For your business');
      await h.scrollToEl(feat.getByText('For your business', { exact: true }), { offset: 120 });
      await h.say('For your business: one login for every tool', 4000);
      await h.scrollToEl(feat.getByText('11 AI Features', { exact: true }), { offset: 330 });
      await h.say('11 AI features, including an admin assistant powered by Claude', 4500);
      await h.scrollToEl(feat.getByText('Kitchen Display (KOT)', { exact: true }), { offset: 330 });
      await h.say('Kitchen display, POS billing and inventory in the same dashboard', 4500);
      await h.scrollToEl(feat.getByText('Hotel Operations', { exact: true }), { offset: 330 });
      await h.say('Hotels and malls get their own modes: front desk, housekeeping, food courts', 4500);
      await h.scrollToEl(feat.getByText('Admin Assistant', { exact: true }), { offset: 380 });
      await h.say('The 11 AI features, from demand forecasting to voice ordering', 4000);

      h.chapter('Who it is for');
      await h.scrollToEl(page.locator('#verticals'), { offset: 60 });
      await h.say('Restaurants, cafés, food courts, hotels, malls and cloud kitchens', 4500);
      await h.scrollToEl(page.locator('#verticals').getByText('Add your menu', { exact: true }), { offset: 300 });
      await h.say('Four steps: add your menu, get your QR, customers scan and order, you manage', 5000);

      h.chapter('Real screens');
      await h.scrollToEl(page.locator('#showcase'), { offset: 60 });
      await h.say('Real screens captured from the running app', 3500);
      await h.scrollToEl(page.locator('#showcase').getByText('Owner dashboard', { exact: true }), { offset: 380 });
      await h.say('Owner dashboard: live orders, revenue and top items (sample data)', 4500);
      await h.scrollToEl(page.locator('#showcase').getByText('Hotel front desk', { exact: true }), { offset: 380 });
      await h.say('Hotel front desk and mall food-court views (sample data)', 4500);

      h.chapter('Pricing');
      await h.scrollToEl(page.locator('#pricing'), { offset: 60 });
      await h.say('Start free today. Growth and Business plans are launching soon', 5000);
      await h.scrollToEl(page.locator('.cta-banner'), { offset: 130 });
      await h.say('Set up your digital menu in under 10 minutes at aviqr.com', 4500);
    },
  },

  '02': {
    slug: '02-whats-new-order-codes-tracking-billing',
    meta: {
      title: 'AviQR counter workflows: order codes, live tracking, POS billing & receipts',
      subtitle: 'Pay-at-counter confirmation, live status, itemised bills and branded receipts',
      description:
        'The newest AviQR additions, shown with real screenshots from a running shop: 6-digit order confirmation codes with a QR, confirming codes on the POS/Billing screen, live order tracking, itemised discounts and service charges, and receipts with your own logo and GSTIN.',
      tags: ['AviQR', 'restaurant POS', 'QR ordering', 'order tracking', 'restaurant billing', 'GST billing', 'India'],
    },
    async run(page, h) {
      await h.goto(BASE + '/features');
      await page.mouse.move(1400, 520);
      h.begin();
      h.chapter('What is new');
      await h.say('What’s new: built from real counter workflows', 4500);
      const rows = page.locator('.feature-row');
      const caps = [
        ['Order confirmation', 'Pay at the counter: the customer gets a 6-digit code and a QR'],
        ['Confirm codes on POS', 'Staff confirm the code right on the billing screen: scan or type it'],
        ['Live tracking', 'Live status follows the order into the customer’s order history'],
        ['Itemised billing', 'Discounts and service charges appear as separate lines on the bill'],
        ['Branded receipts', 'Receipts carry your own logo, address and GSTIN'],
      ];
      for (let i = 0; i < caps.length; i++) {
        h.chapter(caps[i][0]);
        await h.scrollToEl(rows.nth(i), { offset: 60 });
        await h.say(caps[i][1], 6500);
      }
      await h.scrollToEl(page.locator('footer'), { offset: 500 });
      await h.say('See them all at aviqr.com/features', 4000);
    },
  },

  '03': {
    slug: '03-pricing-faq-and-getting-started',
    meta: {
      title: 'AviQR pricing, FAQ and how to get started (free plan)',
      subtitle: 'What the Starter plan includes, common questions, and signing up',
      description:
        'How AviQR pricing works (a free Starter plan, Growth and Business launching soon), answers to the most common questions about commission, payments, languages and setup time, and where sign-up begins.',
      tags: ['AviQR', 'restaurant software pricing', 'QR menu', 'FAQ', 'free QR menu', 'India'],
    },
    async run(page, h) {
      await h.goto(BASE + '/');
      h.begin();
      h.chapter('Pricing');
      await h.scrollToEl(page.locator('#pricing'), { offset: 40, ms: 200 });
      await h.say('Simple pricing: start free, scale as you grow', 4500);
      await h.moveTo(page.locator('.pricing-card').first().getByText('Free', { exact: true }), 30);
      await h.say('Starter is free: 20 menu items, 50 orders a day and 1 QR code', 5500);
      await h.moveTo(page.locator('.pricing-card').nth(1).getByText('Growth', { exact: true }), 30);
      await h.say('Growth adds unlimited items and orders, dynamic pricing, OCR menu upload and loyalty', 6000);
      await h.moveTo(page.locator('.pricing-card').nth(2).getByText('Business', { exact: true }), 30);
      await h.say('Business is for multi-outlet brands and cloud kitchens. Both paid plans are launching soon', 6000);

      h.chapter('FAQ');
      await h.goto(BASE + '/faq');
      const faq = q => page.locator('.faq-question', { hasText: q });
      for (const [q, cap, hold] of [
        ['Is the Starter plan really free?', 'FAQ: is the Starter plan really free?', 6500],
        ['Do you take a commission on every order?', 'No per-order commission: pricing is a flat monthly subscription', 6500],
        ['How long does it take to go live?', 'Most businesses are live in under 10 minutes', 6500],
        ['Which languages does the customer menu support?', '9 Indian languages, chosen by the customer from the menu', 6000],
        ['Who processes payments?', 'Online payments run through Razorpay', 6000],
      ]) {
        await h.scrollToEl(faq(q), { offset: 250, ms: 900 });
        await h.click(faq(q));
        await h.say(cap, hold);
      }

      h.chapter('Getting started');
      await h.goto(BASE + '/register');
      await page.mouse.move(1400, 300);
      await h.say('Sign-up starts by choosing your business type', 4000);
      for (const t of ['Restaurant / Café', 'Supplier / Brand', 'Hotel / Resort', 'Mall / Food Court']) {
        await h.moveTo(page.getByText(t, { exact: true }), 24);
        await h.sleep(900);
      }
      await h.say('Restaurant, brand, hotel or mall: then your details, and you are done', 5000);
    },
  },

  '04': {
    slug: '04-free-qr-menu-code-generator',
    meta: {
      title: 'Free QR code generator for your menu (no signup) — AviQR',
      subtitle: 'Turn any menu link into a printable QR code in seconds',
      description:
        'Paste a link to your menu (PDF, Google Drive file, Instagram page or website) and get a downloadable QR code instantly. Free, no signup, runs in your browser. Tool: https://aviqr.com/free-qr-menu-generator',
      tags: ['free QR code generator', 'QR menu', 'menu QR code', 'restaurant', 'AviQR', 'India'],
    },
    async run(page, h) {
      await h.goto(BASE + '/free-qr-menu-generator');
      await page.mouse.move(1400, 520);
      h.begin();
      h.chapter('The tool');
      await h.say('Free QR code generator for your menu: no signup', 4500);
      h.chapter('Paste your link');
      await h.type(page.locator('#qr-link'), 'https://aviqr.com', 90);
      await h.say('Paste a link to your menu: a PDF, Drive file, Instagram page or website', 5000);
      await h.type(page.locator('#qr-label'), 'Spice Garden Menu', 70);
      await h.say('Add a label: it becomes the downloaded file name', 4000);
      h.chapter('Pick a colour');
      const sw = page.locator('.qr-color-swatch');
      for (let i = 1; i < 5; i++) { await h.click(sw.nth(i)); await h.sleep(1100); }
      await h.click(sw.nth(0));
      await h.say('Choose a colour that matches your brand', 3500);
      h.chapter('Download');
      const dlBtn = page.getByRole('button', { name: /Download PNG/ });
      await h.scrollToEl(dlBtn, { offset: 330 });
      await h.say('Download the PNG and print it for tables, counter or storefront', 3500);
      await h.caption('');
      await h.sleep(500);
      const dl = page.waitForEvent('download').catch(() => null);
      await h.click(dlBtn);
      await dl;
      await h.sleep(1500);
      h.chapter('Beyond a static QR');
      await h.scrollToEl(page.getByText('Want more than a static link?'), { offset: 200 });
      await h.say('A static QR can’t take orders or show live prices. AviQR’s digital menu does', 6000);
    },
  },

  '05': {
    slug: '05-guides-qr-ordering-for-restaurants',
    meta: {
      title: 'QR ordering guides for Indian restaurants — how to choose the right system',
      subtitle: 'Three practical guides from aviqr.com/guides',
      description:
        'A look at AviQR’s free written guides: how QR code ordering works for restaurants in India, what to check when choosing QR menu software, and a practical guide to QR code menus. Read them at https://aviqr.com/guides',
      tags: ['QR code ordering', 'QR menu guide', 'restaurant software checklist', 'digital menu', 'AviQR', 'India'],
    },
    async run(page, h) {
      await h.goto(BASE + '/guides');
      await page.mouse.move(1400, 520);
      h.begin();
      h.chapter('Guides');
      await h.say('Practical guides on QR ordering, written for restaurant owners in India', 5000);
      const guides = [
        ['/guides/qr-ordering-system-restaurants-india', 'How QR ordering works, what to check before choosing, and setup steps', 'How QR ordering works'],
        ['/guides/qr-menu-software-checklist', 'A buyer’s checklist: commission model, setup time, kitchen integration', 'Buyer’s checklist'],
        ['/guides/qr-code-menu-guide', 'What a QR code menu is, and why small restaurants and cafés are switching', 'QR menus explained'],
      ];
      for (const [href, cap, chapter] of guides) {
        await h.goto(BASE + '/guides');
        h.chapter(chapter);
        await h.scrollToEl(page.locator('h1').first(), { offset: 80, ms: 400 });
        await h.say(cap, 3500);
        await h.goto(BASE + href);
        await page.mouse.move(1400, 520);
        await h.caption('');
        await h.sleep(800);
        const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
        const steps = 3;
        for (let i = 1; i <= steps; i++) {
          await h.scrollTo(Math.round((total * i) / (steps + 1)), 2400);
          await h.sleep(1800);
        }
      }
      await h.goto(BASE + '/guides');
      await h.say('Read all three free at aviqr.com/guides', 4000);
    },
  },
};

const want = process.argv.slice(2);
for (const [id, v] of Object.entries(VIDEOS)) {
  if (want.length && !want.includes(id)) continue;
  console.log(`\n▶ recording ${v.slug}`);
  const rec = await record(v.slug, v.run);
  console.log(`  raw ${rec.durationSec.toFixed(1)}s, trim ${rec.trim.toFixed(1)}s`);
  const mp4 = await finish(rec, v.meta);
  console.log(`  ✓ ${mp4}`);
}
