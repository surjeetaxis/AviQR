// Mirrors aviqr-mobile-expo/src/utils/recentSearches.js (and the localStorage
// pattern in context/customerContext.js) — plain localStorage since there's
// no native secure-storage equivalent needed here.
const KEY = 'aviqr_recent_searches';
const MAX = 8;

export function getRecentSearches() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(term) {
  const q = (term || '').trim();
  if (!q) return getRecentSearches();
  const next = [q, ...getRecentSearches().filter(t => t.toLowerCase() !== q.toLowerCase())].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function removeRecentSearch(term) {
  const next = getRecentSearches().filter(t => t !== term);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearRecentSearches() {
  localStorage.removeItem(KEY);
}
