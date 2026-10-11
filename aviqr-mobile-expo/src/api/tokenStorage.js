import { Platform } from 'react-native';

// Native credentials use Keychain/Keystore. Browser values live only in memory;
// login cookies remain HttpOnly and old locally persisted credentials are deleted.
const volatile = {};
const sensitive = key => ['aviqr_token','aviqr_refresh','aviqr_trusted_device'].includes(key);
if (Platform.OS==='web' && typeof localStorage!=='undefined') for (const key of ['aviqr_token','aviqr_refresh','aviqr_trusted_device']) localStorage.removeItem(key);
export const tokenStorage = {
  async get(key) {
    if (Platform.OS === 'web') {
      return volatile[key] || null;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },
  async set(key, value) {
    if (Platform.OS === 'web') {
      volatile[key]=value;
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
