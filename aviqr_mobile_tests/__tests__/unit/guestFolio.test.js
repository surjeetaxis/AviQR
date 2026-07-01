/**
 * guestFolio.test.js — running-folio math for the guest "My Bill" tab and the
 * staff room-bill/settle-at-checkout modal.
 * Mirrors the pendingTotal/settledTotal reduce in GuestServiceController.folio()
 * and RoomChargeController.getCharges() on the backend.
 */
function folioTotals(charges) {
  const pendingTotal = charges
    .filter(c => c.status === 'PENDING')
    .reduce((sum, c) => sum + c.amount, 0);
  const settledTotal = charges
    .filter(c => c.status === 'SETTLED')
    .reduce((sum, c) => sum + c.amount, 0);
  return { pendingTotal, settledTotal, grandTotal: pendingTotal + settledTotal };
}

describe('guest folio totals', () => {
  it('sums only PENDING charges into pendingTotal', () => {
    const { pendingTotal } = folioTotals([
      { amount: 500, status: 'PENDING' },
      { amount: 300, status: 'SETTLED' },
      { amount: 200, status: 'PENDING' },
    ]);
    expect(pendingTotal).toBe(700);
  });

  it('sums only SETTLED charges into settledTotal', () => {
    const { settledTotal } = folioTotals([
      { amount: 500, status: 'PENDING' },
      { amount: 300, status: 'SETTLED' },
    ]);
    expect(settledTotal).toBe(300);
  });

  it('grandTotal is pending + settled', () => {
    const t = folioTotals([{ amount: 100, status: 'PENDING' }, { amount: 250, status: 'SETTLED' }]);
    expect(t.grandTotal).toBe(350);
  });

  it('an empty folio is all zeros', () => {
    expect(folioTotals([])).toEqual({ pendingTotal: 0, settledTotal: 0, grandTotal: 0 });
  });

  it('a fully-settled room bill has zero pending (nothing left to settle at checkout)', () => {
    const { pendingTotal } = folioTotals([{ amount: 900, status: 'SETTLED' }]);
    expect(pendingTotal).toBe(0);
  });
});

describe('room bill settle-at-checkout gating', () => {
  // Mirrors the RoomBillModal "Settle & Checkout" button disabled condition
  // in both the web (HotelDashboard.jsx) and mobile ((hotel)/home.js) staff views.
  function canSettle(pendingCharges) {
    return pendingCharges.length > 0;
  }

  it('is disabled when there are no pending charges', () => {
    expect(canSettle([])).toBe(false);
  });

  it('is enabled when at least one charge is pending', () => {
    expect(canSettle([{ amount: 100, status: 'PENDING' }])).toBe(true);
  });
});