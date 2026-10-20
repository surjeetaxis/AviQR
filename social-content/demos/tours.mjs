// Full-length demo videos (landscape 1080p, chapters) — one per AviQR module, in every language.
//
// Same sources as the Shorts (shorts/flows.mjs): dashboards from a LOCAL AviQR stack signed in with seed
// accounts, plus the public customer menu and booking-engine sites. Each tour walks every tab/section with
// the cursor, captions and a chapter per section (captions and chapter names reuse the translated Shorts
// text in shorts/i18n). Emails, phones, seed names and stale time badges are masked continuously.
//
// Usage (from social-content/):
//   AQ_LOCAL_PASSWORD=… node demos/tours.mjs                   # every tour, every language
//   AQ_LOCAL_PASSWORD=… node demos/tours.mjs --only hotel --lang en hi
// Output: youtube/out/final/demo-<tour>-<lang>.mp4 (+ .upload.json with title/description/tags for the uploader)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { record, finish, OUT } from '../youtube/lib.mjs';
import { FLOWS } from '../shorts/flows.mjs';
import { maskNames, scrub } from '../shorts/scrub.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOCAL = 'http://localhost:5173';
const LANGS = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'bn', 'mr', 'gu'];
const MENU_LANG = { en: 'English', hi: 'हिंदी', ta: 'தமிழ்', te: 'తెలుగు', kn: 'ಕನ್ನಡ', ml: 'മലയാളം', bn: 'বাংলা', mr: 'मराठी', gu: 'ગુજરાતી' };
const ROLE_EMAIL = {
  owner: 'sujeet@spiceroute.in', cashier: 'cashier@spiceroute.in', kitchen: 'kitchen@spiceroute.in', manager: 'vikram@gmail.com',
  'menu-editor': 'menu@cakestudio.in', 'order-viewer': 'anoop@coconut.in', hotel: 'gm@grandpalace.in', mall: 'admin@forum.in', supplier: 'ramesh@teas.in',
};
const byId = Object.fromEntries(FLOWS.map(f => [f.id, f]));
const ids = prefix => FLOWS.filter(f => f.id.startsWith(prefix)).map(f => f.id);

// Tours: which flows, in order. Titles per language live in TITLES below.
const TOURS = {
  owner: ids('o-'),
  hotel: ids('h-'),
  'food-court': ids('m-'),
  brand: ids('s-'),
  staff: ids('r-'),
  menu: ids('c-'),
  stays: ids('b-'),
  'hotel-site': ids('l-'),
};

// [title, subtitle] per tour and language.
const TITLES = JSON.parse(fs.readFileSync(path.join(HERE, 'titles.json')));

function strings(lang) {
  const file = path.join(HERE, '..', 'shorts', 'i18n', `${lang}.json`);
  return lang === 'en' || !fs.existsSync(file) ? {} : JSON.parse(fs.readFileSync(file));
}

async function signIn(page, h, role) {
  if (process.env.DEMO_DEBUG) console.log('  sign in', role);
  await page.context().clearCookies();
  await page.goto(LOCAL + '/login', { waitUntil: 'networkidle' });
  await page.evaluate(() => { const l = localStorage.getItem('aviqr_lang'); localStorage.clear(); if (l) localStorage.setItem('aviqr_lang', l); });
  await page.goto(LOCAL + '/login', { waitUntil: 'networkidle' });
  await page.getByLabel(/email/i).first().fill(ROLE_EMAIL[role]);
  await page.getByLabel(/password/i).first().fill(process.env.AQ_LOCAL_PASSWORD);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL(u => !u.pathname.includes('login'), { timeout: 20000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await h.sleep(800);
}

// Show one flow: open its first screen, caption, then move to its second screen, caption.
async function showFlow(page, h, flow, text, lang, state) {
  const [hook, c1, c2, title] = text;
  if (process.env.DEMO_DEBUG) console.log('  step', flow.id);
  const first = flow.screens[0], second = flow.screens[1];
  if (first.role && state.role !== first.role) { await signIn(page, h, first.role); state.role = first.role; state.path = null; }
  const url = first.url || LOCAL + first.path;
  if (state.url !== url || first.url) {
    await h.goto(url);
    state.url = url;
    if (first.url?.includes('/menu/') && lang !== 'en') { // switch the customer menu to this language
      await h.click(page.getByRole('button', { name: 'English' }));
      await h.sleep(400);
      await h.click(page.getByText(MENU_LANG[lang], { exact: true }));
      await h.sleep(900);
    }
  }
  if (!state.begun) { h.begin(); state.begun = true; }
  h.chapter(title);
  if (first.tab) {
    const btn = page.locator('button.admin-nav-item').nth(first.tabIndex);
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await h.click(btn);
    await page.waitForLoadState('networkidle').catch(() => {});
    await h.sleep(700);
    await h.scrollTo(0, 400);
  }
  if (first.click) { await h.click(page.getByRole('button', { name: first.click, exact: false })).catch(() => {}); await h.sleep(600); }
  if (first.locate) { const el = page.getByText(first.locate, { exact: false }); if (await el.count()) await h.scrollToEl(el, { offset: 160 }); }
  if (first.menuLang) { await h.click(page.getByRole('button', { name: MENU_LANG[lang] })).catch(() => {}); await h.sleep(600); }
  await h.say(hook, 2600);
  await h.say(c1, 3200);
  if (second?.click && second.click !== first.click) { await h.click(page.getByRole('button', { name: second.click, exact: false })).catch(() => {}); await h.sleep(600); }
  if (second?.locate && second.locate !== first.locate) { const el = page.getByText(second.locate, { exact: false }); if (await el.count()) await h.scrollToEl(el, { offset: 160 }); }
  else if (second?.scroll) await page.evaluate(y => window.scrollBy({ top: y, behavior: 'smooth' }), second.scroll * 0.9);
  await h.sleep(900);
  await h.say(c2, 3200);
}

async function tour(name, lang, names) {
  const tr = strings(lang);
  const [title, subtitle] = TITLES[name][lang];
  const slug = `demo-${name}-${lang}`;
  // Re-mask every 250ms (dashboards load data after the page), but never on the login form.
  const maskScript = [([src, names]) => {
    const scrubFn = (0, eval)('(' + src + ')');
    const run = () => { if (/\/(login|register)/.test(location.pathname)) return; try { scrubFn(names); } catch {} };
    setInterval(run, 250);
  }, [scrub.toString(), names]];
  const langScript = [l => { try { localStorage.setItem('aviqr_lang', l); } catch {} }, lang];
  const rec = await record(slug, async (page, h) => {
    const state = { role: null, url: null, begun: false };
    for (const id of TOURS[name]) {
      const flow = byId[id];
      await showFlow(page, h, flow, tr[id] || flow.en, lang, state);
    }
  }, { initScripts: [langScript, maskScript] });
  const end = tr._end ? { title: tr._end[0], sub: tr._end[1], tag: tr._end[2] } : {};
  const tags = [...new Set(TOURS[name].flatMap(id => byId[id].tags).concat(['AviQR', 'demo', 'restaurant software', 'hotel software', 'India']))].slice(0, 15);
  const mp4 = await finish(rec, { title, subtitle, end, description: subtitle, tags });
  const desc = fs.readFileSync(path.join(OUT, 'final', `${slug}.description.txt`), 'utf8');
  fs.writeFileSync(path.join(OUT, 'final', `${slug}.upload.json`), JSON.stringify({
    title: `${title} | AviQR`.slice(0, 100), description: desc, tags, made_for_kids: false, short: false, reel: false, lang,
  }, null, 1));
  return mp4;
}

const args = process.argv.slice(2);
const list = flag => { const i = args.indexOf(flag); if (i < 0) return []; const out = []; for (const a of args.slice(i + 1)) { if (a.startsWith('--')) break; out.push(a); } return out; };
const only = list('--only'), langs = list('--lang').length ? list('--lang') : LANGS;
const skip = args.includes('--skip-existing');
if (!process.env.AQ_LOCAL_PASSWORD) { console.error('set AQ_LOCAL_PASSWORD (the seed password) to sign in locally'); process.exit(1); }
const names = maskNames();
for (const lang of langs) for (const name of Object.keys(TOURS)) {
  if (only.length && !only.includes(name)) continue;
  if (skip && fs.existsSync(path.join(OUT, 'final', `demo-${name}-${lang}.mp4`))) continue;
  try { console.log('recorded', await tour(name, lang, names)); } catch (e) { console.log('FAILED', `demo-${name}-${lang}`, e.message.split('\n')[0]); }
}
