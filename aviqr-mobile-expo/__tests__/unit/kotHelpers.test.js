/**
 * kotHelpers.test.js — pure helper functions used by the KOT / kitchen view.
 * Tests elapsed time formatting and urgency detection logic.
 * No RN imports — runs in pure Node via jest.
 */

// ── Helpers (extracted from kitchen display logic) ────────────────────────────

function elapsedStr(ts) {
  if (!ts) return '0s';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function elapsedMin(ts) {
  if (!ts) return 0;
  return Math.floor((Date.now() - new Date(ts)) / 60000);
}

function isUrgent(ts, status) {
  const NON_URGENT = ['READY', 'COMPLETED', 'CANCELLED', 'REJECTED'];
  if (NON_URGENT.includes(status)) return false;
  return elapsedMin(ts) > 15;
}

function isCritical(ts, status) {
  const NON_CRITICAL = ['READY', 'COMPLETED', 'CANCELLED', 'REJECTED'];
  if (NON_CRITICAL.includes(status)) return false;
  return elapsedMin(ts) > 25;
}

const KOT_COLUMNS = ['NEW', 'ACCEPTED', 'PREPARING', 'READY'];

function groupByStatus(orders) {
  return Object.fromEntries(
    KOT_COLUMNS.map(s => [s, orders.filter(o => o.status === s)])
  );
}

// ── elapsedStr ───────────────────────────────────────────────────────────────

describe('elapsedStr()', () => {
  it('null returns "0s"', () => {
    expect(elapsedStr(null)).toBe('0s');
  });

  it('40 seconds shows "40s"', () => {
    const ts = new Date(Date.now() - 40_000).toISOString();
    expect(elapsedStr(ts)).toMatch(/^\d+s$/);
  });

  it('5 minutes shows "5m"', () => {
    const ts = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(elapsedStr(ts)).toBe('5m');
  });

  it('90 minutes shows "1h 30m"', () => {
    const ts = new Date(Date.now() - 90 * 60_000).toISOString();
    expect(elapsedStr(ts)).toBe('1h 30m');
  });

  it('exactly 1 hour shows "1h 0m"', () => {
    const ts = new Date(Date.now() - 3600_000).toISOString();
    expect(elapsedStr(ts)).toBe('1h 0m');
  });
});

// ── urgency detection ────────────────────────────────────────────────────────

describe('isUrgent() — orders > 15 min waiting', () => {
  const recent = new Date(Date.now() - 5 * 60_000).toISOString();
  const old    = new Date(Date.now() - 16 * 60_000).toISOString();

  it('NEW order 16 min old is urgent', () => {
    expect(isUrgent(old, 'NEW')).toBe(true);
  });

  it('NEW order 5 min old is not urgent', () => {
    expect(isUrgent(recent, 'NEW')).toBe(false);
  });

  it('READY order 20 min old is NOT urgent (already ready)', () => {
    expect(isUrgent(old, 'READY')).toBe(false);
  });

  it('COMPLETED order is never urgent', () => {
    expect(isUrgent(old, 'COMPLETED')).toBe(false);
  });

  it('PREPARING order 16 min old is urgent', () => {
    expect(isUrgent(old, 'PREPARING')).toBe(true);
  });
});

describe('isCritical() — orders > 25 min waiting', () => {
  const old      = new Date(Date.now() - 26 * 60_000).toISOString();
  const slightly = new Date(Date.now() - 20 * 60_000).toISOString();

  it('order 26 min old in ACCEPTED is critical', () => {
    expect(isCritical(old, 'ACCEPTED')).toBe(true);
  });

  it('order 20 min old is not critical (just urgent)', () => {
    expect(isCritical(slightly, 'ACCEPTED')).toBe(false);
  });

  it('READY order is never critical', () => {
    expect(isCritical(old, 'READY')).toBe(false);
  });

  it('null timestamp is not critical', () => {
    expect(isCritical(null, 'NEW')).toBe(false);
  });
});

// ── groupByStatus ────────────────────────────────────────────────────────────

describe('groupByStatus() — KOT column grouping', () => {
  const orders = [
    { id: '1', status: 'NEW' },
    { id: '2', status: 'NEW' },
    { id: '3', status: 'PREPARING' },
    { id: '4', status: 'READY' },
    { id: '5', status: 'COMPLETED' }, // excluded from KOT columns
  ];

  it('groups NEW orders into NEW column', () => {
    const g = groupByStatus(orders);
    expect(g.NEW).toHaveLength(2);
  });

  it('groups PREPARING orders correctly', () => {
    const g = groupByStatus(orders);
    expect(g.PREPARING).toHaveLength(1);
    expect(g.PREPARING[0].id).toBe('3');
  });

  it('ACCEPTED column is empty when no accepted orders', () => {
    const g = groupByStatus(orders);
    expect(g.ACCEPTED).toHaveLength(0);
  });

  it('COMPLETED orders do not appear in any KOT column', () => {
    const g = groupByStatus(orders);
    const all = [...g.NEW, ...g.ACCEPTED, ...g.PREPARING, ...g.READY];
    expect(all.find(o => o.id === '5')).toBeUndefined();
  });

  it('empty orders list produces empty columns', () => {
    const g = groupByStatus([]);
    KOT_COLUMNS.forEach(col => expect(g[col]).toHaveLength(0));
  });
});