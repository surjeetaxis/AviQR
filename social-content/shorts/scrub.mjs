// Masking shared by the Shorts (app.mjs) and the full demos (../demos/tours.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');

// Names to blur: every person name in the local seed data (shorts/out/mask-names.json, built with psql) plus first names.
export function maskNames() {
  const file = path.join(OUT, 'mask-names.json');
  const full = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
  const keep = full.filter(n => !/order$/i.test(n));
  const firsts = keep.map(n => n.split(/\s+/)[0]).filter(n => n.length >= 4 && keep.some(k => k.includes(' ')));
  return [...new Set([...keep, ...firsts])].sort((a, b) => b.length - a.length);
}

// Runs in the page: hide personal data and stale elapsed-time badges.
export function scrub(names) {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const email = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
  const phone = /(\+?91[\s-]?)?\b[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b|\b\d{5}[\s-]\d{5}\b|\b0\d{2,4}[\s-]?\d{6,8}\b/g;
  const name = names.length ? new RegExp(`\\b(${names.map(esc).join('|')})\\b`, 'g') : null;
  const stale = /\b\d{2,}h\s*\d+m\b|\b\d{3,}m\b|\b\d+h\s*\d+m\s*ago\b|\b\d{2,}\s*(hours?|hrs?)\s*ago\b/i;
  const clean = t => { let s = t.replace(email, '•••••').replace(phone, '••••• •••••'); return name ? s.replace(name, '•••••') : s; };
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walk.nextNode()) nodes.push(walk.currentNode);
  for (const n of nodes) {
    if (stale.test(n.nodeValue)) { const el = n.parentElement; if (el) el.style.visibility = 'hidden'; continue; }
    const v = clean(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v;
  }
  for (const el of document.querySelectorAll('input, textarea')) { const v = clean(el.value || ''); if (v !== el.value) el.value = v; }
}
