/**
 * authApi.test.js — verifies the mobile auth API calls the right endpoints
 * with the right shapes. Axios is mocked; no real backend needed.
 */
jest.mock('axios', () => {
  const mock = {
    post: jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
    get:  jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
    put:  jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
    delete: jest.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  return { __esModule: true, default: { create: () => mock, post: mock.post, get: mock.get }, _mock: mock };
});

import { authApi } from '../../src/api/index.js';
import axios from 'axios';
const m = axios.create();

describe('authApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('login posts to /api/v1/auth/login with credentials', async () => {
    await authApi.login({ email: 'a@b.com', password: 'Axis321#' });
    expect(m.post).toHaveBeenCalledWith('/api/v1/auth/login', { email: 'a@b.com', password: 'Axis321#' });
  });

  it('register posts to /api/v1/auth/register', async () => {
    const body = { name: 'X', email: 'x@y.com', phone: '9900112233', password: 'Axis321#', role: 'CUSTOMER' };
    await authApi.register(body);
    expect(m.post).toHaveBeenCalledWith('/api/v1/auth/register', body);
  });

  it('sendOtp posts phone to OTP endpoint', async () => {
    await authApi.sendOtp('9900112233');
    expect(m.post).toHaveBeenCalledWith('/api/v1/auth/otp/send', { phone: '9900112233' });
  });

  it('getProfile hits the profile endpoint', async () => {
    await authApi.getProfile();
    expect(m.get).toHaveBeenCalledWith('/api/v1/auth/profile');
  });

  it('updateStatus encodes user id and status in the URL', async () => {
    await authApi.updateStatus('user-123', 'SUSPENDED');
    expect(m.put).toHaveBeenCalledWith('/api/v1/auth/admin/users/user-123/status?status=SUSPENDED');
  });
});
