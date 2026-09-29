import { chromium } from '../node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const OUT = path.join(process.cwd(), 'out', 'thumbs');
const dataUrl = 'data:image/png;base64,' + fs.readFileSync('out/screens/12.png').toString('base64');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.setContent(`<!doctype html><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  body{width:1280px;height:720px;overflow:hidden;position:relative;color:#fff;
    font-family:-apple-system,'Inter','Segoe UI',Helvetica,Arial,sans-serif;
    background:radial-gradient(900px 600px at 15% 0%,#14956f 0,#0F6E56 45%,#08372d 100%)}
  .logo{position:absolute;left:56px;top:48px;background:#fff;color:#0F6E56;font-weight:800;font-size:38px;
    padding:6px 22px;border-radius:14px;letter-spacing:-1px}
  .kicker{position:absolute;left:58px;top:140px;font-size:28px;font-weight:700;letter-spacing:2px;
    text-transform:uppercase;color:#9FF0CF}
  h1{position:absolute;left:56px;top:195px;width:610px;font-size:72px;line-height:1.05;font-weight:900;letter-spacing:-2.5px;
    text-shadow:0 4px 24px rgba(0,0,0,.25)}
  h1 em{font-style:normal;color:#FFD84D}
  .url{position:absolute;left:58px;bottom:48px;font-size:32px;font-weight:700;color:#fff;opacity:.9;letter-spacing:.5px}
  .shot{position:absolute;right:-70px;top:120px;width:760px;height:428px;border-radius:18px;overflow:hidden;
    transform:perspective(1600px) rotateY(-9deg) rotateZ(1.2deg);
    box-shadow:0 30px 70px rgba(0,0,0,.5),0 0 0 6px rgba(255,255,255,.9)}
  .shot img{width:100%;height:100%;display:block;object-fit:cover;object-position:top left}
</style>
<div class="logo">AviQR</div>
<div class="kicker">One shop, five logins</div>
<h1>5 staff roles.<br><em>One shop.</em></h1>
<div class="url">aviqr.com</div>
<div class="shot"><img src="${dataUrl}"></div>`);
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, '12.png') });
await browser.close();
console.log('done');
