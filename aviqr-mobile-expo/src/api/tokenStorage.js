import { Platform } from 'react-native';

// expo-secure-store has no backing implementation on web (no Keychain/
// Keystore equivalent in a browser) — calls either throw or silently return
// null there. Shared by api/index.js (attaches the token to every request)
// and AuthContext.js (writes it on login/logout), so both read/write the
// SAME store on every platform instead of silently disagreeing on web.
const volatile = {};
const sensitive = key => ['aviqr_token','aviqr_refresh','aviqr_trusted_device'].includes(key);
if (Platform.OS==='web' && typeof localStorage!=='undefined') for (const key of ['aviqr_token','aviqr_refresh','aviqr_trusted_device']) localStorage.removeItem(key);
export const tokenStorage = {
  async get(key) {
    if (Platform.OS === 'web') {
      if (sensitive(key)) return volatile[key] || null;
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },
  async set(key, value) {
    if (Platform.OS === 'web') {
      if (sensitive(key)) { volatile[key]=value; return; }
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
  },
  async del(key) {
    if (Platform.OS === 'web') {
      if (sensitive(key)) delete volatile[key];
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.deleteItemAsync(key);
  },
};
