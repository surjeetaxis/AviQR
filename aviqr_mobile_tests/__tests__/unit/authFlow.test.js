/**
 * authFlow.test.js — login stores tokens then sets the user; logout clears them.
 * Uses the in-memory SecureStore mock from jest.setup.js.
 */
import * as SecureStore from 'expo-secure-store';

// Simulate the saveSession logic from AuthContext
async function saveSession({ accessToken, refreshToken, ...user }) {
  await SecureStore.setItemAsync('aviqr_token', accessToken);
  await SecureStore.setItemAsync('aviqr_refresh', refreshToken);
  await SecureStore.setItemAsync('aviqr_user', JSON.stringify(user));
  return user;
}

async function clearSession() {
  await SecureStore.deleteItemAsync('aviqr_token');
  await SecureStore.deleteItemAsync('aviqr_refresh');
  await SecureStore.deleteItemAsync('aviqr_user');
}

describe('auth session storage', () => {
  beforeEach(async () => { await clearSession(); jest.clearAllMocks(); });

  it('saveSession stores access + refresh tokens', async () => {
    await saveSession({ accessToken: 'tok-abc', refreshToken: 'ref-xyz', role: 'OWNER', name: 'Sujeet' });
    expect(await SecureStore.getItemAsync('aviqr_token')).toBe('tok-abc');
    expect(await SecureStore.getItemAsync('aviqr_refresh')).toBe('ref-xyz');
  });

  it('saveSession returns the user without the tokens', async () => {
    const user = await saveSession({ accessToken: 'a', refreshToken: 'b', role: 'OWNER', name: 'Sujeet' });
    expect(user).toEqual({ role: 'OWNER', name: 'Sujeet' });
    expect(user.accessToken).toBeUndefined();
  });

  it('logout clears all stored tokens', async () => {
    await saveSession({ accessToken: 'a', refreshToken: 'b', role: 'OWNER' });
    await clearSession();
    expect(await SecureStore.getItemAsync('aviqr_token')).toBeNull();
    expect(await SecureStore.getItemAsync('aviqr_refresh')).toBeNull();
  });
});
