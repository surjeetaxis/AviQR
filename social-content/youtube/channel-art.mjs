// YouTube channel banner (2560x1440; text kept inside the ~1546x423 centre safe area) + 800x800 avatar.
import { chromium } from '../node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out', 'channel-art');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
// CSS px are half of output px (deviceScaleFactor 2) => 1280x720 CSS = 2560x1440 output.
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
const blocks = (x, y, s = 1) => `
  <g transform="translate(${x},${y}) scale(${s})" opacity=".95">
    <rect width="120" height="120" rx="26" fill="#1D9E75"/><rect x="34" y="34" width="52" height="52" rx="12" fill="#111"/>
    <rect x="150" width="120" height="120" rx="26" fill="#fff"/><rect x="184" y="34" width="52" height="52" rx="12" fill="#111"/>
    <rect y="150" width="120" height="120" rx="26" fill="#fff"/><rect x="34" y="184" width="52" height="52" rx="12" fill="#111"/>
    <rect x="150" y="150" width="54" height="54" rx="12" fill="#1D9E75"/><rect x="216" y="150" width="54" height="54" rx="12" fill="#1D9E75"/>
    <rect x="150" y="216" width="54" height="54" rx="12" fill="#1D9E75"/><rect x="216" y="216" width="54" height="54" rx="12" fill="#5DCAA5"/>
  </g>`;
await page.setContent(`<!doctype html><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  body{width:1280px;height:720px;overflow:hidden;position:relative;color:#fff;
    font-family:-apple-system,'Inter','Segoe UI',Helvetica,Arial,sans-serif;
    background:linear-gradient(135deg,#111 0%,#0B2F25 100%)}
  svg{position:absolute;inset:0}
  .safe{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:760px;text-align:center}
  .k{font-size:15px;font-weight:700;letter-spacing:2.2px;color:#5DCAA5}
  h1{font-size:54px;line-height:1.05;font-weight:900;letter-spacing:-1.6px;margin:12px 0 10px}
  p{font-size:21px;font-weight:500;color:#C9D3CF}
  .u{margin-top:14px;font-size:24px;font-weight:800;color:#1D9E75;letter-spacing:-.2px}
</style>
<svg width="1280" height="720" viewBox="0 0 1280 720">
  ${blocks(60, 70, 0.9)}${blocks(1000, 380, 0.9)}${blocks(1090, 60, 0.45)}${blocks(90, 470, 0.5)}
</svg>
<div class="safe">
  <div class="k">PRODUCT DEMOS · QR ORDERING · LIVE KOTs · 11 AI FEATURES</div>
  <h1>Your table is the menu.</h1>
  <p>Scan. Browse. Order. No app — in 9 Indian languages.</p>
  <div class="u">aviqr.com</div>
</div>`);
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'banner-2560x1440.png') });
await browser.close();
console.log('✓ banner', fs.statSync(path.join(OUT, 'banner-2560x1440.png')).size >> 10, 'KB');
