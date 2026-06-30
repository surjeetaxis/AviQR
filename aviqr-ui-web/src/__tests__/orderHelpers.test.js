/**
 * orderHelpers.test.js — pure helper functions used by Orders.jsx and KOT.jsx.
 * Tests: timeSince, waitMinutes, status progression, order filtering.
 * No DOM or React needed — runs in Node via vitest.
 */

// ── Helpers copied from Orders.jsx / KOT.jsx ──────────────────────────────────

const STATUS_NEXT  = { NEW:'ACCEPTED', ACCEPTED:'PREPARING', PREPARING:'READY', READY:'COMPLETED' };
const STATUS_LABEL = { NEW:'New', ACCEPTED:'Accepted', PREPARING:'Preparing', READY:'Ready!', COMPLETED:'Done', CANCELLED:'Cancelled', REJECTED:'Rejected' };

function timeSince(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ago`;
}

function waitMinutes(ts) {
  return ts ? Math.floor((Date.now() - new Date(ts)) / 60000) : 0;
}

function nextStatus(current) {
  return STATUS_NEXT[current] || null;
}

function filterOrders(orders, typeFilter, statusFilter, search) {
  return orders.filter(o => {
    if (typeFilter !== 'ALL' && o.type !== typeFilter) return false;
    if (statusFilter === 'ACTIVE' && ['COMPLETED','CANCELLED','REJECTED'].includes(o.status)) return false;
    if (statusFilter !== 'ACTIVE' && statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!o.orderNumber?.toLowerCase().includes(q) &&
          !o.customerName?.toLowerCase().includes(q) &&
          !o.tableNumber?.toString().includes(q)) return false;
    }
    return true;
  });
}

// ── timeSince ────────────────────────────────────────────────────────────────

describe('timeSince()', () => {
  test('returns empty string for null timestamp', () => {
    expect(timeSince(null)).toBe('');
  });

  test('returns seconds ago for very recent timestamps', () => {
    const ts = new Date(Date.now() - 30_000).toISOString(); // 30s ago
    expect(timeSince(ts)).toMatch(/^\d+s ago$/);
  });

  test('returns minutes ago for 5 min old timestamp', () => {
    const ts = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(timeSince(ts)).toMatch(/^5m ago$/);
  });

  test('returns hours+minutes for 90 min old timestamp', () => {
    const ts = new Date(Date.now() - 90 * 60_000).toISOString();
    expect(timeSince(ts)).toMatch(/^1h 30m ago$/);
  });

  test('exactly 1 hour shows 1h 0m ago', () => {
    const ts = new Date(Date.now() - 3600_000).toISOString();
    expect(timeSince(ts)).toMatch(/^1h 0m ago$/);
  });
});

// ── waitMinutes ──────────────────────────────────────────────────────────────

describe('waitMinutes()', () => {
  test('null timestamp returns 0', () => {
    expect(waitMinutes(null)).toBe(0);
  });

  test('30 seconds ago returns 0 minutes', () => {
    const ts = new Date(Date.now() - 30_000).toISOString();
    expect(waitMinutes(ts)).toBe(0);
  });

  test('20 minutes ago returns 20', () => {
    const ts = new Date(Date.now() - 20 * 60_000).toISOString();
    expect(waitMinutes(ts)).toBe(20);
  });

  test('orders older than 15 min are urgent', () => {
    const ts = new Date(Date.now() - 16 * 60_000).toISOString();
    expect(waitMinutes(ts)).toBeGreaterThan(15);
  });

  test('orders older than 25 min are critical', () => {
    const ts = new Date(Date.now() - 26 * 60_000).toISOString();
    expect(waitMinutes(ts)).toBeGreaterThan(25);
  });
});

// ── Status progression ────────────────────────────────────────────────────────

describe('status progression (nextStatus)', () => {
  test('full progression: NEW → ACCEPTED → PREPARING → READY → COMPLETED → null', () => {
    const seq = [];
    let s = 'NEW';
    while (s) { seq.push(s); s = nextStatus(s); }
    expect(seq).toEqual(['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED']);
  });

  test('COMPLETED has no next status', () => {
    expect(nextStatus('COMPLETED')).toBeNull();
  });

  test('CANCELLED has no forward transition', () => {
    expect(nextStatus('CANCELLED')).toBeNull();
  });

  test('REJECTED has no forward transition', () => {
    expect(nextStatus('REJECTED')).toBeNull();
  });

  test('unknown status returns null (no crash)', () => {
    expect(nextStatus('FLYING')).toBeNull();
  });
});

// ── Status labels ─────────────────────────────────────────────────────────────

describe('STATUS_LABEL map', () => {
  const expected = ['NEW','ACCEPTED','PREPARING','READY','COMPLETED','CANCELLED','REJECTED'];

  test.each(expected)('%s has a human-readable label', (status) => {
    expect(STATUS_LABEL[status]).toBeTruthy();
    expect(STATUS_LABEL[status].length).toBeGreaterThan(0);
  });

  test('COMPLETED maps to "Done" (not "Completed")', () => {
    expect(STATUS_LABEL.COMPLETED).toBe('Done');
  });

  test('NEW maps to "New"', () => {
    expect(STATUS_LABEL.NEW).toBe('New');
  });
});

// ── filterOrders ─────────────────────────────────────────────────────────────

describe('filterOrders()', () => {
  const orders = [
    { id:'1', orderNumber:'ORD-001', customerName:'Anjali', tableNumber:'4', type:'DINE_IN',  status:'NEW'       },
    { id:'2', orderNumber:'ORD-002', customerName:'Ravi',   tableNumber:null, type:'TAKEAWAY', status:'PREPARING' },
    { id:'3', orderNumber:'ORD-003', customerName:'Meera',  tableNumber:'7', type:'DINE_IN',  status:'COMPLETED' },
    { id:'4', orderNumber:'ORD-004', customerName:'Arjun',  tableNumber:'2', type:'DELIVERY', status:'CANCELLED' },
  ];

  test('ALL type filter returns all orders', () => {
    expect(filterOrders(orders, 'ALL', 'ALL', '')).toHaveLength(4);
  });

  test('DINE_IN filter returns only dine-in orders', () => {
    const result = filterOrders(orders, 'DINE_IN', 'ALL', '');
    expect(result).toHaveLength(2);
    expect(result.every(o => o.type === 'DINE_IN')).toBe(true);
  });

  test('ACTIVE status filter excludes COMPLETED and CANCELLED', () => {
    const result = filterOrders(orders, 'ALL', 'ACTIVE', '');
    expect(result).toHaveLength(2); // NEW + PREPARING
    expect(result.map(o => o.status)).not.toContain('COMPLETED');
    expect(result.map(o => o.status)).not.toContain('CANCELLED');
  });

  test('specific status filter (NEW) returns only NEW', () => {
    const result = filterOrders(orders, 'ALL', 'NEW', '');
    expect(result).toHaveLength(1);
    expect(result[0].customerName).toBe('Anjali');
  });

  test('search by order number is case-insensitive', () => {
    const result = filterOrders(orders, 'ALL', 'ALL', 'ord-002');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  test('search by customer name matches', () => {
    const result = filterOrders(orders, 'ALL', 'ALL', 'ravi');
    expect(result).toHaveLength(1);
    expect(result[0].orderNumber).toBe('ORD-002');
  });

  test('search by table number matches', () => {
    const result = filterOrders(orders, 'ALL', 'ALL', '7');
    expect(result).toHaveLength(1);
    expect(result[0].customerName).toBe('Meera');
  });

  test('search with no match returns empty array', () => {
    expect(filterOrders(orders, 'ALL', 'ALL', 'xyz-not-found')).toHaveLength(0);
  });

  test('type + status filters combine correctly', () => {
    const result = filterOrders(orders, 'DINE_IN', 'NEW', '');
    expect(result).toHaveLength(1);
    expect(result[0].customerName).toBe('Anjali');
  });
});
