// 1280x720 YouTube thumbnails: brand gradient + big headline + a real screenshot of the page shown.
// Usage: node youtube/thumbnails.mjs
import { chromium } from '../node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out', 'thumbs');
fs.mkdirSync(OUT, { recursive: true });

const THUMBS = [
  { id: '01', kicker: 'AviQR in 2 minutes', head: 'One QR code.<br><em>Your whole restaurant.</em>', url: '/', shot: async p => { await p.mouse.move(1400, 520); } },
  { id: '02', kicker: 'What’s new in AviQR', head: 'Order codes, live tracking <em>&amp; billing</em>', url: '/features', shot: async p => { await p.evaluate(() => window.scrollTo(0, 360)); } },
  { id: '03', kicker: 'AviQR pricing &amp; FAQ', head: 'Start <em>free.</em><br>Scale as you grow.', url: '/', shot: async p => { await p.evaluate(() => document.querySelector('#pricing').scrollIntoView()); await p.evaluate(() => window.scrollBy(0, -30)); } },
  { id: '04', kicker: 'Free tool · No signup', head: 'Free <em>QR menu</em><br>generator', url: '/free-qr-menu-generator', shot: async p => { await p.fill('#qr-link', 'https://aviqr.com'); await p.waitForTimeout(600); } },
  { id: '05', kicker: 'Free written guides', head: 'QR ordering guides <em>for restaurants</em>', url: '/guides', shot: async p => { await p.evaluate(() => window.scrollTo(0, 60)); } },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const shotPage = await browser.newPage({ viewport: { width: 1440, height: 810 } });

for (const t of THUMBS) {
  await shotPage.goto('https://aviqr.com' + t.url, { waitUntil: 'networkidle' }).catch(() => {});
  await shotPage.waitForTimeout(800);
  await t.shot(shotPage);
  await shotPage.waitForTimeout(500);
  const png = await shotPage.screenshot();
  const dataUrl = 'data:image/png;base64,' + png.toString('base64');

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    *{margin:0;box-sizing:border-box}
    body{width:1280px;height:720px;overflow:hidden;position:relative;color:#fff;
      font-family:-apple-system,'Inter','Segoe UI',Helvetica,Arial,sans-serif;
      background:radial-gradient(900px 600px at 15% 0%,#14956f 0,#0F6E56 45%,#08372d 100%)}
    .logo{position:absolute;left:56px;top:48px;background:#fff;color:#0F6E56;font-weight:800;font-size:38px;
      padding:6px 22px;border-radius:14px;letter-spacing:-1px}
    .kicker{position:absolute;left:58px;top:150px;font-size:30px;font-weight:700;letter-spacing:2px;
      text-transform:uppercase;color:#9FF0CF}
    h1{position:absolute;left:56px;top:205px;width:610px;font-size:82px;line-height:1.02;font-weight:900;letter-spacing:-3px;
      text-shadow:0 4px 24px rgba(0,0,0,.25)}
    h1 em{font-style:normal;color:#FFD84D}
    .url{position:absolute;left:58px;bottom:48px;font-size:32px;font-weight:700;color:#fff;opacity:.9;letter-spacing:.5px}
    .shot{position:absolute;right:-70px;top:120px;width:760px;height:428px;border-radius:18px;overflow:hidden;
      transform:perspective(1600px) rotateY(-9deg) rotateZ(1.2deg);
      box-shadow:0 30px 70px rgba(0,0,0,.5),0 0 0 6px rgba(255,255,255,.9)}
    .shot img{width:100%;height:100%;display:block;object-fit:cover;object-position:top left}
  </style>
  <div class="logo">AviQR</div>
  <div class="kicker">${t.kicker}</div>
  <h1>${t.head}</h1>
  <div class="url">aviqr.com</div>
  <div class="shot"><img src="${dataUrl}"></div>`);
  await page.waitForTimeout(300);
  const png1280 = path.join(OUT, `${t.id}.png`);
  await page.screenshot({ path: png1280 });
  await page.close();
  console.log('✓', png1280, (fs.statSync(png1280).size / 1024).toFixed(0) + ' KB');
}
await browser.close();
