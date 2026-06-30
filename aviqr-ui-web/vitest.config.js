import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only print failures — passing tests are shown as dots
    reporter: 'verbose',
    // Suppress console.log/warn in passing tests; they appear on failure automatically
    onConsoleLog: (log, type) => {
      if (type === 'stderr') return false; // suppress stderr unless test fails
      return false;
    },
    include: ['src/__tests__/**/*.test.js'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/sentry.js', 'src/**/__tests__/**'],
      thresholds: { lines: 30, functions: 30, branches: 25, statements: 30 },
      reporter: ['text', 'json-summary'],
    },
  },
});
