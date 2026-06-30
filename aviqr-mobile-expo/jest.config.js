/** Jest config for AviQR mobile (Expo + React Native) */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-router|axios)/)',
  ],
  testMatch: ['**/__tests__/**/*.test.js'],

  // ── Output: only print failures ──────────────────────────────────────────
  // verbose:false → Jest prints one dot per test; only failures get full output
  verbose: false,
  // Silence passing console output; failures still print their own console
  silent: false,

  collectCoverageFrom: [
    'src/**/*.js',
    'app/**/*.js',
    '!**/node_modules/**',
    '!src/api/mockData.js',
  ],
  coverageThreshold: {
    global: { branches: 40, functions: 45, lines: 50, statements: 50 },
  },
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/__tests__/__mocks__/fileMock.js',
  },
};
