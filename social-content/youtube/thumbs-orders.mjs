import { chromium } from '../node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'out', 'thumbs');
const THUMBS = [
  { id: '06', kicker: 'Real customer order', head: 'Order placed.<br><em>No app.</em>', img: 'out/screens/06.png' },
  { id: '07', kicker: 'Real owner dashboard', head: 'One order,<br><em>start to finish.</em>', img: 'out/screens/07.png' },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const t of THUMBS) {
  const imgBuf = fs.readFileSync(t.img);
  const dataUrl = 'data:image/png;base64,' + imgBuf.toString('base64');
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
  const outPath = path.join(OUT, `${t.id}.png`);
  await page.screenshot({ path: outPath });
  await page.close();
  console.log('✓', outPath);
}
await browser.close();
