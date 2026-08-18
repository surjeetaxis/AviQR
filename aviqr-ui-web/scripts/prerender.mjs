// Prerenders the public, unauthenticated marketing routes to real static
// HTML files under dist/, so crawlers that don't execute JavaScript (most
// AI crawlers — GPTBot, ClaudeBot, PerplexityBot — unlike Googlebot, which
// does render JS) see each page's actual title, description, and content
// instead of the one generic index.html shell every route otherwise shares.
//
// Run after `vite build`: boots a local static server over dist/, visits
// each route in a real headless browser (so react-helmet-async's tags and
// the page's real content have actually rendered), and writes the resulting
// HTML to dist/<route>/index.html. nginx's `try_files $uri $uri/
// /app-shell.html` (see DEPLOYMENT*.md) serves that file for that exact
// path automatically. Routes NOT in this list (the authenticated
// dashboard, /menu/:shopId, etc.) fall back to app-shell.html — a neutral,
// pre-prerender copy of the SPA shell, saved below BEFORE the '/' route
// overwrites the real dist/index.html with the homepage's own prerendered
// content. Falling back to index.html itself here would be wrong once
// that's happened: every other route would incorrectly start from a
// snapshot carrying the homepage's title, canonical URL and Organization
// JSON-LD until React re-renders over it client-side.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { copyFile, readFile } from 'node:fs/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PORT = 4173;

// Public, unauthenticated, fully static routes only — every one of these
// renders the same way for every visitor, which is what makes prerendering
// them safe. Dynamic per-shop pages (/menu/:id) are handled separately;
// see aviqr-backend/menu-ocr-service's crawler-facing HTML endpoint.
const ROUTES = [
  '/', '/features', '/about', '/faq', '/contact',
  '/terms', '/privacy', '/refund', '/login', '/register', '/track-order',
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.xml': 'application/xml',
  '.txt': 'text/plain', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function startStaticServer() {
  return new Promise(resolve => {
    const server = createServer(async (req, res) => {
      let path = req.url.split('?')[0];
      let filePath = join(DIST, path);
      try {
        const stat = await readFile(filePath).catch(() => null);
        if (stat === null) throw new Error('not found');
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
        res.end(stat);
      } catch {
        // SPA fallback, mirrors nginx's try_files ... /app-shell.html
        const html = await readFile(join(DIST, 'app-shell.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function main() {
  // Snapshot the pristine, route-agnostic SPA shell before any route
  // rewrites dist/index.html — this is what nginx (and this script's own
  // fallback above) serve for every route this script doesn't prerender.
  await copyFile(join(DIST, 'index.html'), join(DIST, 'app-shell.html'));

  const server = await startStaticServer();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const route of ROUTES) {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle' });
    // Let react-helmet-async's effect (runs after paint) commit the
    // per-route title/meta/JSON-LD tags before we snapshot the document.
    await page.waitForTimeout(300);
    const html = await page.content();

    const outDir = route === '/' ? DIST : join(DIST, route.slice(1));
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, 'index.html'), html);
    console.log(`Prerendered ${route} -> ${outDir}/index.html`);
  }

  await browser.close();
  server.close();
}

main().catch(err => { console.error(err); process.exit(1); });
