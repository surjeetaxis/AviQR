export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api.aviqr.com' : 'http://localhost:8080');

export function assertSecureApiUrl(value, base = API_BASE_URL) {
  const resolved = new URL(value, new URL(base, typeof location !== 'undefined' ? location.origin : 'https://aviqr.com'));
  if (import.meta.env.PROD && resolved.protocol !== 'https:') {
    throw new Error('Secure HTTPS is required for API requests');
  }
  return resolved.href;
}
assertSecureApiUrl(API_BASE_URL);
