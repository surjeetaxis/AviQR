/**
 * cartTotals.test.js — POS/cart subtotal, GST, and total math.
 * Mirrors the billing calculation used in the owner app and web POS.
 */
function calcTotals(items, taxPct = 5) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = +(subtotal * taxPct / 100).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);
  return { subtotal, tax, total };
}

describe('cart totals', () => {
  it('computes subtotal from line items', () => {
    const { subtotal } = calcTotals([{ price: 280, qty: 2 }, { price: 50, qty: 3 }]);
    expect(subtotal).toBe(710);
  });

  it('applies 5% GST correctly', () => {
    const { tax, total } = calcTotals([{ price: 100, qty: 1 }], 5);
    expect(tax).toBe(5);
    expect(total).toBe(105);
  });

  it('handles an empty cart as zero', () => {
    expect(calcTotals([])).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });

  it('rounds tax to 2 decimals', () => {
    const { tax } = calcTotals([{ price: 333, qty: 1 }], 5); // 16.65
    expect(tax).toBe(16.65);
  });

  it('supports custom tax rate (12%)', () => {
    const { total } = calcTotals([{ price: 200, qty: 1 }], 12);
    expect(total).toBe(224);
  });
});
