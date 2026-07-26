import { tokenStorage } from '../api/tokenStorage.js';

// Reuses tokenStorage's cross-platform get/set/del (SecureStore on native,
// localStorage on web) — it's a plain key/value string store under the hood,
// not actually token-specific.
const KEY = 'aviqr_recent_searches';
const MAX = 8;

export async function getRecentSearches() {
  try {
    const raw = await tokenStorage.get(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function addRecentSearch(term) {
  const q = (term || '').trim();
  if (!q) return;
  const list = await getRecentSearches();
  const next = [q, ...list.filter(t => t.toLowerCase() !== q.toLowerCase())].slice(0, MAX);
  await tokenStorage.set(KEY, JSON.stringify(next));
  return next;
}

export async function removeRecentSearch(term) {
  const list = await getRecentSearches();
  const next = list.filter(t => t !== term);
  await tokenStorage.set(KEY, JSON.stringify(next));
  return next;
}

export async function clearRecentSearches() {
  await tokenStorage.del(KEY);
}
