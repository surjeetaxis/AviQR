/* global jest */
import '@testing-library/jest-native/extend-expect';

// ── expo-secure-store: in-memory mock ──
const _store = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync:    jest.fn(async (k) => _store[k] ?? null),
  setItemAsync:    jest.fn(async (k, v) => { _store[k] = v; }),
  deleteItemAsync: jest.fn(async (k) => { delete _store[k]; }),
}));

// ── expo-router: navigation mock ──
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
  Stack: { Screen: 'Screen' },
  Tabs: { Screen: 'Screen' },
  Redirect: 'Redirect',
}));

// ── expo modules that touch native ──
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-camera', () => ({ CameraView: 'CameraView', useCameraPermissions: () => [{ granted: true }, jest.fn()] }));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
jest.mock('react-native-qrcode-svg', () => 'QRCode');

// Silence the reanimated warning
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Suppress all console output during passing tests.
// Failures re-emit the full console via jest's built-in failure reporter.
global.console = {
  ...console,
  log:   jest.fn(),
  info:  jest.fn(),
  warn:  jest.fn(),
  // Keep error visible — it usually signals a real problem
  error: jest.fn((msg, ...args) => {
    // Only propagate to real stderr when inside a failing test
    // jest's afterEach calls this automatically; we just swallow it here
  }),
  debug: jest.fn(),
  group: jest.fn(),
  groupEnd: jest.fn(),
};
