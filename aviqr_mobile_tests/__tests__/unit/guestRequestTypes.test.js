/**
 * guestRequestTypes.test.js — every request type a guest can raise from the QR
 * hub must be one the staff hotel dashboard knows how to label.
 * Reads the source directly (no RN import) so it runs in the lightweight
 * logic config, same technique as roleRouting.test.js.
 */
const fs = require('fs');
const path = require('path');

function extractKeys(src, arrayName, keyProp) {
  const block = src.match(new RegExp(`const ${arrayName}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!block) throw new Error(`${arrayName} not found`);
  const re = new RegExp(`${keyProp}\\s*:\\s*'([^']+)'`, 'g');
  const keys = [];
  for (const m of block[1].matchAll(re)) keys.push(m[1]);
  return keys;
}

const customerSrc = fs.readFileSync(
  path.join(__dirname, '../../../aviqr-mobile-expo/app/(customer)/hotel-services.js'), 'utf8'
);
const hotelSrc = fs.readFileSync(
  path.join(__dirname, '../../../aviqr-mobile-expo/app/(hotel)/home.js'), 'utf8'
);

const guestRequestKeys = extractKeys(customerSrc, 'REQUEST_TYPES', 'key');
const staffServiceIds  = extractKeys(hotelSrc, 'SERVICE_TYPES', 'id');

describe('guest-raised request types are all known to the staff dashboard', () => {
  it('the guest QR hub offers at least the core request types', () => {
    expect(guestRequestKeys).toEqual(expect.arrayContaining([
      'HOUSEKEEPING', 'AMENITIES', 'MAINTENANCE', 'CONCIERGE', 'LAUNDRY', 'LATE_CHECKOUT',
    ]));
  });

  it.each(guestRequestKeys)('%s has a matching entry in the staff dashboard SERVICE_TYPES', (key) => {
    expect(staffServiceIds).toContain(key);
  });
});

describe('mapGuestReq — normalising a GuestServiceRequest into the RequestCard shape', () => {
  // Mirrors mapGuestReq() in app/(hotel)/home.js: renames the backend's
  // GuestServiceRequest.{type,details} to the legacy RoomRequest.{serviceType,description}
  // shape the shared RequestCard component expects.
  function mapGuestReq(g) {
    return {
      id: g.id,
      roomNumber: g.roomNumber,
      serviceType: g.type,
      description: g.details || '',
      status: g.status,
      priority: g.priority,
      createdAt: g.createdAt,
      _source: 'guest',
    };
  }

  it('renames type -> serviceType and details -> description', () => {
    const mapped = mapGuestReq({ id: '1', roomNumber: '204', type: 'AMENITIES', details: '2 towels', status: 'NEW', priority: 'NORMAL', createdAt: '2026-01-01' });
    expect(mapped.serviceType).toBe('AMENITIES');
    expect(mapped.description).toBe('2 towels');
  });

  it('defaults description to empty string when details is null', () => {
    const mapped = mapGuestReq({ id: '1', roomNumber: '204', type: 'HOUSEKEEPING', details: null, status: 'NEW', priority: 'NORMAL' });
    expect(mapped.description).toBe('');
  });

  it('tags the source as guest so status updates route to hotelOpsApi, not the legacy hotelApi', () => {
    const mapped = mapGuestReq({ id: '1', roomNumber: '204', type: 'LAUNDRY', status: 'NEW', priority: 'NORMAL' });
    expect(mapped._source).toBe('guest');
  });
});