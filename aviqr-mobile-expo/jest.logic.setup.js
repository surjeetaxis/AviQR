/* global jest */
const _store = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync:    jest.fn(async (k) => _store[k] ?? null),
  setItemAsync:    jest.fn(async (k, v) => { _store[k] = v; }),
  deleteItemAsync: jest.fn(async (k) => { delete _store[k]; }),
}), { virtual: true });
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }), { virtual: true });
jest.mock('expo-constants', () => ({ expoConfig: { hostUri: undefined, extra: {} } }), { virtual: true });

// React Native global flag, undefined in plain node
global.__DEV__ = true;
