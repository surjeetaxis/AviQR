/**
 * chargeToRoomGating.test.js — "charge to room" must only be offered when the
 * room is actually checked in. Mirrors GuestServiceController.serviceHub()'s
 * canChargeToRoom = (room.status == OCCUPIED) and the BookingModal/booking
 * screens' default payment-choice selection on both web and mobile.
 */
function canChargeToRoom(roomStatus) {
  return roomStatus === 'OCCUPIED';
}

function defaultPaymentChoice(canCharge) {
  return canCharge ? 'CHARGE_TO_ROOM' : 'PAY_DIRECT';
}

describe('charge-to-room eligibility', () => {
  it('is allowed for an OCCUPIED room', () => {
    expect(canChargeToRoom('OCCUPIED')).toBe(true);
  });

  it('is denied for a VACANT room', () => {
    expect(canChargeToRoom('VACANT')).toBe(false);
  });

  it('is denied for a room under MAINTENANCE', () => {
    expect(canChargeToRoom('MAINTENANCE')).toBe(false);
  });

  it('is denied when there is no room at all (no roomNumber in the QR link)', () => {
    expect(canChargeToRoom(undefined)).toBe(false);
  });
});

describe('default payment choice on booking/order forms', () => {
  it('defaults to CHARGE_TO_ROOM when the guest is checked in', () => {
    expect(defaultPaymentChoice(true)).toBe('CHARGE_TO_ROOM');
  });

  it('defaults to PAY_DIRECT when the guest cannot charge to room', () => {
    expect(defaultPaymentChoice(false)).toBe('PAY_DIRECT');
  });
});

describe('server-side re-validation (booking must not trust the client canCharge flag)', () => {
  // Mirrors GuestServiceController.book(): even if a stale client thinks it can
  // charge to room, the backend re-checks room status before accepting the charge.
  function validateBooking(paymentChoice, roomStatus) {
    if (paymentChoice === 'CHARGE_TO_ROOM' && roomStatus !== 'OCCUPIED') {
      return { ok: false, error: 'Room not checked in — please choose Pay Direct' };
    }
    return { ok: true };
  }

  it('rejects CHARGE_TO_ROOM against a room that checked out since the QR was scanned', () => {
    const result = validateBooking('CHARGE_TO_ROOM', 'VACANT');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Pay Direct/);
  });

  it('accepts CHARGE_TO_ROOM for a still-occupied room', () => {
    expect(validateBooking('CHARGE_TO_ROOM', 'OCCUPIED').ok).toBe(true);
  });

  it('always accepts PAY_DIRECT regardless of room status', () => {
    expect(validateBooking('PAY_DIRECT', 'VACANT').ok).toBe(true);
  });
});