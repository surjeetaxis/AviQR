import { clearActiveOutlet } from './outletContext.js';
// Access credentials live only in memory. Refresh credentials are HttpOnly cookies.
const sessions = { staff: null, customer: null };
const listeners = new Set();
export const getSession = (audience = 'staff') => sessions[audience];
export const getAccessToken = (audience = 'staff') => sessions[audience]?.accessToken || null;
export function setSession(data, audience = 'staff') {
  const old = sessions[audience];
  if (audience === 'staff' && (!data || (old && old.userId !== data.userId))) clearActiveOutlet();
  sessions[audience] = data;
  listeners.forEach(listener => listener(audience, data));
}
export const subscribeSessions = listener => { listeners.add(listener); return () => listeners.delete(listener); };
if (typeof localStorage !== 'undefined') {
  for (const key of ['aviqr_token', 'aviqr_refresh', 'aviqr_customer_token']) localStorage.removeItem(key);
}
