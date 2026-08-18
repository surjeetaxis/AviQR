// Captures a `?ref=CODE` query param wherever a visitor first lands (Landing
// page, or a direct /register?ref=CODE link) and holds onto it in
// localStorage — not sessionStorage — since signup can happen in a later
// browser session (e.g. link opened on a phone, account created on desktop).
// Onboarding.jsx reads it back at shop-creation time and clears it once used.
const KEY = 'aviqr_referral_code';

export function captureReferralCode() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ref.trim()) localStorage.setItem(KEY, ref.trim().toUpperCase());
  } catch { /* no-op — referral capture is best-effort */ }
}

export function getReferralCode() {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}

export function clearReferralCode() {
  try { localStorage.removeItem(KEY); } catch { /* no-op */ }
}
