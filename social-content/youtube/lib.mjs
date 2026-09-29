// Recording toolkit for the AviQR YouTube demo videos.
//
// Drives real Chrome through playwright-core, records the viewport, overlays a visible
// cursor + caption bar inside the page (so they are in the recording), then wraps the
// clip with a title card and end card and encodes 1080p H.264 with ffmpeg.
import { chromium } from '../node_modules/playwright-core/index.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OUT = path.join(HERE, 'out');
export const VIEWPORT = { width: 1440, height: 810 };
const CARD_SECONDS = 3;
const END_SECONDS = 4;

const OVERLAY = () => {
  if (window.__aqInit) return;
  window.__aqInit = true;
  const css = `
    #__aq_cursor{position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;
      transform:translate(-100px,-100px);transition:transform .04s linear;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}
    #__aq_ripple{position:fixed;z-index:2147483646;pointer-events:none;width:14px;height:14px;border-radius:50%;
      border:3px solid #1D9E75;opacity:0;transform:translate(-50%,-50%)}
    #__aq_ripple.go{animation:__aq_r .5s ease-out}
    @keyframes __aq_r{0%{opacity:.9;width:14px;height:14px}100%{opacity:0;width:64px;height:64px}}
    #__aq_cap{position:fixed;left:50%;bottom:44px;transform:translateX(-50%);max-width:70%;z-index:2147483647;
      pointer-events:none;background:rgba(15,23,42,.9);color:#fff;font:600 25px/1.35 -apple-system,'Inter','Segoe UI',sans-serif;
      padding:14px 28px;border-radius:14px;text-align:center;opacity:0;transition:opacity .35s ease;
      box-shadow:0 8px 30px rgba(0,0,0,.35);border-left:5px solid #1D9E75}`;
  const build = () => {
    if (document.getElementById('__aq_cap')) return;
    const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st);
    const cur = document.createElement('div'); cur.id = '__aq_cursor';
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M3 2l7 19 3-8 8-3z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const rip = document.createElement('div'); rip.id = '__aq_ripple';
    const cap = document.createElement('div'); cap.id = '__aq_cap';
    document.documentElement.append(cur, rip, cap);
    window.addEventListener('mousemove', e => { cur.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2}px)`; }, true);
    window.addEventListener('mousedown', e => {
      rip.style.left = e.clientX + 'px'; rip.style.top = e.clientY + 'px';
      rip.classList.remove('go'); void rip.offsetWidth; rip.classList.add('go');
    }, true);
  };
  window.__aqCaption = t => {
    build();
    const cap = document.getElementById('__aq_cap');
    if (!t) { cap.style.opacity = '0'; return; }
    cap.textContent = t; cap.style.opacity = '1';
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

export function helpers(page, clock) {
  const h = {
    sleep,
    /** Show (or clear, with no text) the caption bar. */
    async caption(text) { await page.evaluate(t => window.__aqCaption && window.__aqCaption(t), text || ''); },
    /** Caption, then hold so the viewer can read it. */
    async say(text, ms = 3500) { await h.caption(text); await sleep(ms); },
    /** Mark the moment real content is on screen — everything before is trimmed. */
    begin() { clock.trim = (Date.now() - clock.t0) / 1000; },
    /** Chapter marker for the YouTube description (seconds into the final video). */
    chapter(title) { clock.chapters.push({ at: (Date.now() - clock.t0) / 1000, title }); },
    async goto(url) {
      await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
      await sleep(600);
    },
    async scrollTo(y, ms = 1600) {
      await h.caption('');
      await page.evaluate(([y, ms]) => new Promise(res => {
        const s = window.scrollY, d = y - s, t0 = performance.now();
        const ease = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
        const step = now => {
          const t = Math.min(1, (now - t0) / ms);
          window.scrollTo({ top: s + d * ease(t), behavior: 'instant' });
          t < 1 ? requestAnimationFrame(step) : res();
        };
        requestAnimationFrame(step);
      }), [y, ms]);
    },
    /** Smooth-scroll so the located element's top sits `offset` px below the viewport top. */
    async scrollToEl(locator, { offset = 90, ms = 1600 } = {}) {
      const y = await locator.first().evaluate((el, off) => el.getBoundingClientRect().top + window.scrollY - off, offset);
      await h.scrollTo(Math.max(0, y), ms);
    },
    async moveTo(locator, steps = 28) {
      const box = await locator.first().boundingBox();
      if (!box) return;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
    },
    async click(locator) {
      await h.moveTo(locator);
      await sleep(250);
      await locator.first().click();
    },
    /** Type like a person (visible keystrokes). */
    async type(locator, text, delay = 55) {
      await h.click(locator);
      await locator.first().pressSequentially(text, { delay });
    },
  };
  return h;
}

/** Record `fn(page, h)` and return the raw clip + timing metadata. */
export async function record(slug, fn) {
  const rawDir = path.join(OUT, 'raw', slug);
  fs.rmSync(rawDir, { recursive: true, force: true });
  fs.mkdirSync(rawDir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    acceptDownloads: true,
    // Must equal the viewport: Playwright letterboxes (does not scale) when they differ.
    // finish() upscales to 1080p.
    recordVideo: { dir: rawDir, size: VIEWPORT },
  });
  await context.addInitScript(OVERLAY);
  const page = await context.newPage();
  const clock = { t0: Date.now(), trim: 0, chapters: [] };
  const h = helpers(page, clock);
  let err;
  try { await fn(page, h); await h.caption(''); await sleep(700); } catch (e) { err = e; }
  const durationSec = (Date.now() - clock.t0) / 1000 - clock.trim;
  await context.close();
  const webm = await page.video().path();
  await browser.close();
  if (err) throw err;
  return { slug, webm, trim: clock.trim, durationSec, chapters: clock.chapters };
}

async function renderCard(kind, { title, subtitle }, outPng) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const body = kind === 'title'
    ? `<div class="logo">AviQR</div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p><div class="tag">Restaurant &amp; Hotel OS · aviqr.com</div>`
    : `<div class="logo">AviQR</div><h1>Try it free at aviqr.com</h1><p>Start free — no credit card · Live in under 10 minutes</p><div class="tag">Subscribe for more AviQR demos</div>`;
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    *{margin:0;box-sizing:border-box}
    body{width:1920px;height:1080px;background:radial-gradient(1200px 700px at 20% 10%,#12805f 0,#0F6E56 40%,#0a3d31 100%);
      color:#fff;font-family:-apple-system,'Inter','Segoe UI',sans-serif;display:flex;flex-direction:column;
      justify-content:center;align-items:center;text-align:center;padding:0 200px}
    .logo{font-size:64px;font-weight:800;letter-spacing:-1px;background:#fff;color:#0F6E56;padding:8px 34px;border-radius:20px;margin-bottom:60px}
    h1{font-size:88px;line-height:1.08;font-weight:800;letter-spacing:-2px;max-width:1500px}
    p{font-size:40px;margin-top:34px;opacity:.9;max-width:1400px;line-height:1.35}
    .tag{position:absolute;bottom:70px;font-size:30px;letter-spacing:2px;opacity:.75;text-transform:uppercase}
  </style>${body}`);
  await page.screenshot({ path: outPng });
  await browser.close();
}

const ff = args => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

/** Wrap a raw clip with title + end cards, encode to 1080p MP4, write YouTube description. */
export async function finish(rec, meta) {
  const dir = path.join(OUT, 'final');
  fs.mkdirSync(dir, { recursive: true });
  const cardsDir = path.join(OUT, 'cards');
  fs.mkdirSync(cardsDir, { recursive: true });
  const titlePng = path.join(cardsDir, `${rec.slug}-title.png`);
  const endPng = path.join(cardsDir, `${rec.slug}-end.png`);
  await renderCard('title', meta, titlePng);
  await renderCard('end', meta, endPng);

  const mp4 = path.join(dir, `${rec.slug}.mp4`);
  const trim = Math.max(0, rec.trim - 0.15);
  const V = 'scale=1920:1080:flags=lanczos,fps=30,format=yuv420p,setsar=1';
  ff([
    '-loop', '1', '-t', String(CARD_SECONDS), '-framerate', '30', '-i', titlePng,
    '-ss', trim.toFixed(2), '-i', rec.webm,
    '-loop', '1', '-t', String(END_SECONDS), '-framerate', '30', '-i', endPng,
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-filter_complex',
    `[0:v]${V},fade=t=in:st=0:d=0.4,fade=t=out:st=${CARD_SECONDS - 0.4}:d=0.4[a];` +
    `[1:v]${V}[b];` +
    `[2:v]${V},fade=t=in:st=0:d=0.4,fade=t=out:st=${END_SECONDS - 0.5}:d=0.5[c];` +
    `[a][b][c]concat=n=3:v=1:a=0[v]`,
    '-map', '[v]', '-map', '3:a', '-shortest',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', mp4,
  ]);
  ff(['-ss', String(CARD_SECONDS + 2), '-i', mp4, '-frames:v', '1', path.join(dir, `${rec.slug}.thumb.png`)]);

  // Chapters: offsets are relative to trimmed clip start, plus the title card.
  const fmt = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const chapters = [{ at: 0, title: 'Intro' }, ...rec.chapters.map(c => ({ at: CARD_SECONDS + (c.at - rec.trim), title: c.title }))];
  const desc = [
    meta.description,
    '',
    ...chapters.map(c => `${fmt(c.at)} ${c.title}`),
    '',
    '🍽️ AviQR — India’s multilingual QR menu & order platform',
    'Start free (no credit card): https://aviqr.com',
    '',
    meta.tags.map(t => '#' + t.replace(/\s+/g, '')).join(' '),
  ].join('\n');
  fs.writeFileSync(path.join(dir, `${rec.slug}.description.txt`), desc);
  fs.writeFileSync(path.join(dir, `${rec.slug}.json`), JSON.stringify({ title: meta.title, tags: meta.tags, chapters }, null, 2));
  return mp4;
}
