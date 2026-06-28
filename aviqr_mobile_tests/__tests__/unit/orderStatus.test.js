/**
 * orderStatus.test.js — order status advancement logic.
 * Mirrors the STATUS_NEXT progression the owner dashboard uses.
 */
const STATUS_NEXT = { NEW:'ACCEPTED', ACCEPTED:'PREPARING', PREPARING:'READY', READY:'COMPLETED' };

function nextStatus(current) {
  return STATUS_NEXT[current] || null;
}

describe('order status progression', () => {
  it('advances NEW → ACCEPTED → PREPARING → READY → COMPLETED', () => {
    let s = 'NEW';
    const seq = [];
    while (s) { seq.push(s); s = nextStatus(s); }
    expect(seq).toEqual(['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED']);
  });

  it('COMPLETED is terminal (no next status)', () => {
    expect(nextStatus('COMPLETED')).toBeNull();
  });

  it('CANCELLED has no forward transition', () => {
    expect(nextStatus('CANCELLED')).toBeNull();
  });
});
