import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// vite.config.js is loaded as an ES module (package.json has "type":
// "module"), so __dirname isn't available the way it would be in CommonJS —
// derive it from import.meta.url instead of assuming the invocation cwd.
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Stamps a fresh build ID into dist/sw.js on every production build.
 *
 * public/sw.js is copied to dist/sw.js byte-for-byte by Vite (files under
 * public/ aren't processed) — that's normally exactly what you want for a
 * service worker, but it also means it never changes across deploys on its
 * own, so browsers never see a reason to check for an update. Rewriting
 * the __BUILD_ID__ placeholder here changes the file's bytes on every
 * build, which is what makes the browser's SW update check (a byte-diff
 * against the last installed sw.js) actually fire — see the comment at the
 * top of public/sw.js for how that flows into automatic cache cleanup.
 */
function stampServiceWorkerBuildId() {
  return {
    name: 'aviqr-stamp-sw-build-id',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js');
      const buildId = `${Date.now()}`;
      const contents = readFileSync(swPath, 'utf-8').replaceAll('__BUILD_ID__', buildId);
      writeFileSync(swPath, contents);
    },
  };
}

export default defineConfig({
  plugins: [react(), stampServiceWorkerBuildId()],
  server: {
    port: 5173,
    proxy: {
      // All /api calls → backend (avoids CORS in dev)
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // Health check → proxied too so it's same-origin from browser
      '/actuator': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
