/**
 * guestServiceApi.test.js — QR guest-services endpoints (public hub, requests,
 * bookings, folio) + hotelOpsApi staff endpoints (bookings, room bill/settle).
 */
jest.mock('axios', () => {
  const mock = {
    post: jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
    get:  jest.fn(() => Promise.resolve({ data: { success: true, data: [] } })),
    put:  jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  return { __esModule: true, default: { create: () => mock }, _mock: mock };
});

import { guestServiceApi, hotelOpsApi } from '../../src/api/index.js';
import axios from 'axios';
const m = axios.create();

describe('guestServiceApi (public, no auth)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('hub fetches the service hub for a hotel with room + area params', async () => {
    await guestServiceApi.hub('hotel-1', '204', 'POOL');
    const [url, opts] = m.get.mock.calls[0];
    expect(url).toContain('/public/hotel/hotel-1/services');
    expect(opts.params).toEqual({ room: '204', area: 'POOL' });
  });

  it('request posts a service request to the public endpoint', async () => {
    await guestServiceApi.request('hotel-1', { roomNumber: '204', type: 'HOUSEKEEPING' });
    const [url, body] = m.post.mock.calls[0];
    expect(url).toContain('/public/hotel/hotel-1/service-request');
    expect(body).toEqual({ roomNumber: '204', type: 'HOUSEKEEPING' });
  });

  it('book posts a booking to the public endpoint', async () => {
    await guestServiceApi.book('hotel-1', { outletId: 'o1', bookingTime: '15:00' });
    const url = m.post.mock.calls[0][0];
    expect(url).toContain('/public/hotel/hotel-1/book');
  });

  it('folio fetches the room folio', async () => {
    await guestServiceApi.folio('hotel-1', '204');
    const [url, opts] = m.get.mock.calls[0];
    expect(url).toContain('/public/hotel/hotel-1/folio');
    expect(opts.params).toEqual({ room: '204' });
  });

  it('payDirect posts a direct-payment record', async () => {
    await guestServiceApi.payDirect('hotel-1', { amount: 500 });
    const url = m.post.mock.calls[0][0];
    expect(url).toContain('/public/hotel/hotel-1/pay-direct');
  });
});

describe('hotelOpsApi (staff-side bookings + room bill)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listBookings fetches outlet bookings for a hotel', async () => {
    await hotelOpsApi.listBookings('hotel-1');
    const url = m.get.mock.calls[0][0];
    expect(url).toContain('/hotel/hotel-1/bookings');
  });

  it('updateBooking advances a booking status', async () => {
    await hotelOpsApi.updateBooking('bk-1', 'CONFIRMED');
    const url = m.put.mock.calls[0][0];
    expect(url).toContain('bk-1');
    expect(url).toContain('CONFIRMED');
  });

  it('roomCharges fetches the pending bill for a room', async () => {
    await hotelOpsApi.roomCharges('room-1');
    const url = m.get.mock.calls[0][0];
    expect(url).toContain('/rooms/room-1/charges');
  });

  it('settleCharges posts to settle a room at checkout', async () => {
    await hotelOpsApi.settleCharges('room-1');
    const url = m.post.mock.calls[0][0];
    expect(url).toContain('/rooms/room-1/settle-charges');
  });
});