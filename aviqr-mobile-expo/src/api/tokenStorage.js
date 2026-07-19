import { Platform } from 'react-native';

// expo-secure-store has no backing implementation on web (no Keychain/
// Keystore equivalent in a browser) — calls either throw or silently return
// null there. Shared by api/index.js (attaches the token to every request)
// and AuthContext.js (writes it on login/logout), so both read/write the
// SAME store on every platform instead of silently disagreeing on web.
export const tokenStorage = {
  async get(key) {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },
  async set(key, value) {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
  },
  async del(key) {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.deleteItemAsync(key);
  },
};
