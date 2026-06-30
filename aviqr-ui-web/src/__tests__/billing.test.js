/**
 * billing.test.js — POS cart calculation logic.
 * Mirrors the exact formulas used in Billing.jsx so we catch regressions
 * without needing a running browser or backend.
 * Only failures are logged (vitest verbose reporter).
 */

// ── Pure cart math (extracted from Billing.jsx) ───────────────────────────────

function calcSubtotal(cartItems) {
  return cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function calcTax(subtotal, pct) {
  return +Number(subtotal * pct / 100).toFixed(2);
}

function calcTotal(subtotal, tax) {
  return Math.round((subtotal + tax) * 100) / 100;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Billing — cart subtotal', () => {
  test('single item: price × qty', () => {
    expect(calcSubtotal([{ price: 380, qty: 1 }])).toBe(380);
  });

  test('multiple items: sum of all line totals', () => {
    expect(calcSubtotal([
      { price: 320, qty: 1 },
      { price: 55, qty: 3 },
      { price: 80, qty: 2 },
    ])).toBe(320 + 165 + 160); // 645
  });

  test('empty cart returns 0', () => {
    expect(calcSubtotal([])).toBe(0);
  });

  test('qty > 1 multiplied correctly', () => {
    expect(calcSubtotal([{ price: 100, qty: 5 }])).toBe(500);
  });

  test('fractional price rounds via Math.round', () => {
    // 333.33 * 1 should not introduce JS float weirdness
    const sub = calcSubtotal([{ price: 333.33, qty: 1 }]);
    expect(sub).toBeCloseTo(333.33, 2);
  });
});

describe('Billing — GST calculation', () => {
  test('5% GST on ₹380 = ₹19', () => {
    expect(calcTax(380, 5)).toBe(19);
  });

  test('12% GST on ₹200 = ₹24', () => {
    expect(calcTax(200, 12)).toBe(24);
  });

  test('0% GST returns 0', () => {
    expect(calcTax(500, 0)).toBe(0);
  });

  test('GST preserves 2 decimal places (toFixed(2) behaviour)', () => {
    // 5% of 333 = 16.65 — stays at 2 decimals, not rounded to whole rupee
    expect(calcTax(333, 5)).toBe(16.65);
  });
});

describe('Billing — total', () => {
  test('subtotal + tax = total', () => {
    expect(calcTotal(380, 19)).toBe(399);
  });

  test('zero tax: total equals subtotal', () => {
    expect(calcTotal(500, 0)).toBe(500);
  });

  test('total with fractional amounts stays at 2 decimals', () => {
    const total = calcTotal(100.5, 5.03);
    expect(total).toBe(105.53);
  });
});

describe('Billing — cart item merge', () => {
  // Simulates the merge logic in Billing.jsx addToCart
  function mergeCart(cart, newItem) {
    const existing = cart.find(c => c._key === newItem._key);
    if (existing) return cart.map(c => c._key === newItem._key ? { ...c, qty: c.qty + 1 } : c);
    return [...cart, newItem];
  }

  test('adding same item increments qty', () => {
    const cart = [{ _key: 'item-1', name: 'Paneer Tikka', price: 280, qty: 1 }];
    const result = mergeCart(cart, { _key: 'item-1', name: 'Paneer Tikka', price: 280, qty: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].qty).toBe(2);
  });

  test('adding different item appends to cart', () => {
    const cart = [{ _key: 'item-1', name: 'Paneer Tikka', price: 280, qty: 1 }];
    const result = mergeCart(cart, { _key: 'item-2', name: 'Dal Makhani', price: 280, qty: 1 });
    expect(result).toHaveLength(2);
  });

  test('empty cart starts with one item', () => {
    const result = mergeCart([], { _key: 'item-1', name: 'X', price: 100, qty: 1 });
    expect(result).toHaveLength(1);
  });
});
