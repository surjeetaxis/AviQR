/**
 * orderApi.test.js — order lifecycle endpoints used by the owner mobile app.
 * Axios is mocked; no backend required.
 * Logs only on failure — jest verbose:false in jest.config.js.
 */
jest.mock('axios', () => {
  const mock = {
    post:   jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
    get:    jest.fn(() => Promise.resolve({ data: { success: true, data: [] } })),
    put:    jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  return { __esModule: true, default: { create: () => mock }, _mock: mock };
});

import { orderApi } from '../../src/api/index.js';
import axios from 'axios';
const m = axios.create();

describe('orderApi — URL correctness', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getLive: fetches live orders for a specific shop', async () => {
    await orderApi.getLive('shop-101');
    const url = m.get.mock.calls[0][0];
    expect(url).toContain('shop-101');
    expect(url).toContain('/live');
  });

  it('getLive: URL contains the shop ID — not hardcoded', async () => {
    await orderApi.getLive('shop-XYZ');
    const url = m.get.mock.calls[0][0];
    expect(url).toContain('shop-XYZ');
  });

  it('placeOrder: POSTs to the correct shop endpoint with body', async () => {
    const body = { customerName: 'Anjali', items: [], paymentMethod: 'CASH' };
    await orderApi.placeOrder('shop-101', body);
    expect(m.post).toHaveBeenCalledWith(expect.stringContaining('shop-101'), body);
  });

  it('getAll: GET with pagination params', async () => {
    await orderApi.getAll('shop-101', { page: 0, size: 20 });
    const [url, config] = m.get.mock.calls[0];
    expect(url).toContain('shop-101');
    expect(config.params).toEqual({ page: 0, size: 20 });
  });

  it('updateStatus: PUT contains order id and status in URL', async () => {
    await orderApi.updateStatus('order-uuid-123', 'PREPARING');
    const url = m.put.mock.calls[0][0];
    expect(url).toContain('order-uuid-123');
    expect(url).toContain('PREPARING');
  });

  it('updateStatus: CANCELLED status is URL-encoded correctly', async () => {
    await orderApi.updateStatus('order-abc', 'CANCELLED');
    const url = m.put.mock.calls[0][0];
    expect(url).toContain('CANCELLED');
  });

  it('getHistory: calls customer history endpoint', async () => {
    await orderApi.getHistory();
    expect(m.get).toHaveBeenCalledWith('/api/v1/orders/customer/history');
  });
});

describe('orderApi — error surface (mocked rejections)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getLive: rejects on network error', async () => {
    m.get.mockRejectedValueOnce(new Error('Network Error'));
    await expect(orderApi.getLive('shop-101')).rejects.toThrow('Network Error');
  });

  it('updateStatus: rejects on 404 from server', async () => {
    m.put.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(orderApi.updateStatus('bad-id', 'ACCEPTED')).rejects.toMatchObject(
      { response: { status: 404 } }
    );
  });
});
