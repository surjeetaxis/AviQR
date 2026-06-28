/**
 * orderApi.test.js — order lifecycle endpoints used by the owner app
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

import { orderApi } from '../../src/api/index.js';
import axios from 'axios';
const m = axios.create();

describe('orderApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getLive fetches live orders for a shop', async () => {
    await orderApi.getLive('shop-101');
    const calledUrl = m.get.mock.calls[0][0];
    expect(calledUrl).toContain('shop-101');
    expect(calledUrl).toContain('live');
  });

  it('updateStatus advances an order', async () => {
    await orderApi.updateStatus('order-1', 'PREPARING');
    const url = m.put.mock.calls[0][0];
    expect(url).toContain('order-1');
  });
});
