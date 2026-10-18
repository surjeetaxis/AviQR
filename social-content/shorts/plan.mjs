// Build the posting plan for every rendered Short in shorts/out/videos: N a day (default 5), mixing
// features and languages so neighbouring posts differ. Writes shorts/out/by-date/<date>/<HHMM>-<id>.{mp4,png,json}
// (hard links), the folders youtube-upload.py and meta-upload.py read.
//
// Usage (from social-content/):
//   node shorts/plan.mjs --start 2026-10-22 [--per-day 5] [--skip-uploaded uploaded.json]
// --skip-uploaded takes the SERVER's ledger (scp it down first) so a replan never re-uploads a Short.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const VIDEOS = path.join(OUT, 'videos');
const LANGS = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'bn', 'mr', 'gu'];
const TIMES = ['09:30', '12:30', '15:30', '18:30', '21:00']; // IST

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const start = opt('--start');
if (!start) { console.error('--start YYYY-MM-DD is required'); process.exit(1); }
const perDay = Number(opt('--per-day', 5));
const ledgerFile = opt('--skip-uploaded');

// Ledger keys look like by-date/<date>/<HHMM>-<id>.json; the id is what matters.
const done = new Set(ledgerFile ? Object.keys(JSON.parse(fs.readFileSync(ledgerFile))).map(k => path.basename(k, '.json').replace(/^\d{4}-/, '')) : []);

// Group videos by feature: "w-01-no-app-hi" and set 1's "01-no-app" are the same feature in two languages.
const groups = new Map();
for (const file of fs.readdirSync(VIDEOS).filter(f => f.endsWith('.mp4')).sort()) {
  const id = file.slice(0, -4);
  if (done.has(id) || !fs.existsSync(path.join(VIDEOS, id + '.json'))) continue;
  const m = id.match(/^(.*)-(en|hi|ta|te|kn|ml|bn|mr|gu)$/);
  const lang = m ? m[2] : 'en';
  const base = (m ? m[1] : id).replace(/^w-/, '');
  if (!groups.has(base)) groups.set(base, new Map());
  groups.get(base).set(lang, id);
}

// Round-robin: each round takes one language of every feature, rotating which language each feature uses.
const order = [], bases = [...groups.keys()];
for (let round = 0; round < LANGS.length; round++) {
  bases.forEach((base, i) => {
    const byLang = groups.get(base);
    const lang = LANGS[(i + round) % LANGS.length];
    if (byLang.has(lang)) order.push(byLang.get(lang));
  });
}
for (const byLang of groups.values()) for (const id of byLang.values()) if (!order.includes(id)) order.push(id);

const dir = path.join(OUT, 'by-date');
fs.rmSync(dir, { recursive: true, force: true });
const times = TIMES.slice(0, perDay);
let day = new Date(start + 'T00:00:00Z');
order.forEach((id, n) => {
  if (n && n % perDay === 0) day = new Date(day.getTime() + 86400e3);
  const date = day.toISOString().slice(0, 10), time = times[n % perDay];
  const folder = path.join(dir, date);
  fs.mkdirSync(folder, { recursive: true });
  const stem = `${time.replace(':', '')}-${id}`;
  fs.linkSync(path.join(VIDEOS, id + '.mp4'), path.join(folder, stem + '.mp4'));
  if (fs.existsSync(path.join(VIDEOS, id + '.png'))) fs.linkSync(path.join(VIDEOS, id + '.png'), path.join(folder, stem + '.png'));
  const meta = JSON.parse(fs.readFileSync(path.join(VIDEOS, id + '.json')));
  fs.writeFileSync(path.join(folder, stem + '.json'), JSON.stringify({ date, time_ist: time, video: stem + '.mp4', cover: stem + '.png', ...meta }, null, 1));
});
// Full-length demos (../youtube/out/final/demo-*.mp4): one a day on YouTube, alternating tours and languages.
const FINAL = path.join(HERE, '..', 'youtube', 'out', 'final');
const demos = fs.existsSync(FINAL) ? fs.readdirSync(FINAL).filter(f => /^demo-.*\.mp4$/.test(f)).map(f => f.slice(0, -4))
  .filter(id => !done.has(id) && fs.existsSync(path.join(FINAL, id + '.upload.json'))) : [];
const demoOrder = [];
for (const lang of LANGS) for (const id of demos) if (id.endsWith('-' + lang)) demoOrder.push(id);
let dday = new Date(start + 'T00:00:00Z');
for (const id of demoOrder) {
  const date = dday.toISOString().slice(0, 10), stem = `1700-${id}`, folder = path.join(dir, date);
  fs.mkdirSync(folder, { recursive: true });
  fs.linkSync(path.join(FINAL, id + '.mp4'), path.join(folder, stem + '.mp4'));
  fs.linkSync(path.join(FINAL, id + '.thumb.png'), path.join(folder, stem + '.png'));
  const meta = JSON.parse(fs.readFileSync(path.join(FINAL, id + '.upload.json')));
  fs.writeFileSync(path.join(folder, stem + '.json'), JSON.stringify({ date, time_ist: '17:00', video: stem + '.mp4', cover: stem + '.png', ...meta }, null, 1));
  dday = new Date(dday.getTime() + 86400e3);
}
console.log(`planned ${demoOrder.length} full demos, 1/day at 17:00 IST`);
console.log(`planned ${order.length} Shorts (${groups.size} features, ${done.size} already uploaded skipped), ${perDay}/day from ${start} to ${day.toISOString().slice(0, 10)}`);
