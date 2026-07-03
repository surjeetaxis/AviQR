// Tracks which shop/hotel/mall the customer most recently scanned into, so the
// shell's Home/Search/Cart tabs know where to send them back to. Deliberately
// NOT a browsable cross-platform directory (none exists) — this is purely
// "continue where I left off," matching the confirmed scope decision.
const KEY = 'aviqr_customer_last_context';

export function setCustomerContext(type, id, label) {
  localStorage.setItem(KEY, JSON.stringify({ type, id, label, at: Date.now() }));
}

export function getCustomerContext() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// type -> the base route for that context ('shop' | 'hotel' | 'mall' | 'brand')
export function contextRoute(ctx) {
  if (!ctx) return null;
  if (ctx.type === 'shop')  return `/menu/${ctx.id}`;
  if (ctx.type === 'hotel') return `/hotel-services/${ctx.id}`;
  if (ctx.type === 'mall')  return `/food-court/${ctx.id}`;
  if (ctx.type === 'brand') return `/brand/${ctx.id}`;
  return null;
}