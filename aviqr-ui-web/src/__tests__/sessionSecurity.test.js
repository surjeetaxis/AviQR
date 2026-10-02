import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { api, authApi, refreshSession } from '../api/index.js';
import { getAccessToken, setSession, subscribeSessions } from '../api/sessionStore.js';

beforeEach(() => {vi.restoreAllMocks();setSession(null);setSession(null,'customer');});
describe('session security', () => {
  it('keeps credentials in memory with isolated customer/staff sessions', () => {
    const storage={setItem:vi.fn(),getItem:vi.fn()};vi.stubGlobal('localStorage',storage);
    setSession({accessToken:'staff-secret'});setSession({accessToken:'customer-secret'},'customer');
    expect(getAccessToken()).toBe('staff-secret');expect(getAccessToken('customer')).toBe('customer-secret');
    expect(storage.setItem).not.toHaveBeenCalled();vi.unstubAllGlobals();
  });
  it('deduplicates concurrent refresh requests and uses cookies plus CSRF protection', async () => {
    let resolve;const pending=new Promise(done=>{resolve=done;});const post=vi.spyOn(axios,'post').mockReturnValue(pending);
    const first=refreshSession();const second=refreshSession();expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][1]).toEqual({});expect(post.mock.calls[0][2]).toMatchObject({withCredentials:true,headers:{'X-CSRF-Protection':'1','X-Platform':'WEB'}});
    resolve({data:{data:{accessToken:'fresh'}}});await Promise.all([first,second]);expect(getAccessToken()).toBe('fresh');
  });
  it('a failed password login never triggers a silent session refresh', async () => {
    const post=vi.spyOn(axios,'post');
    const adapter=vi.fn(config=>Promise.reject(new AxiosError('Unauthorized',null,config,null,{status:401,data:{message:'Invalid credentials'},config})));
    const old=api.defaults.adapter;api.defaults.adapter=adapter;
    try {await expect(authApi.login({email:'test@example.com',password:'wrong'})).rejects.toThrow('Unauthorized');expect(post).not.toHaveBeenCalled();}
    finally {api.defaults.adapter=old;}
  });
  it('customer refresh does not replace the staff session', async () => {
    setSession({accessToken:'staff'});vi.spyOn(axios,'post').mockResolvedValue({data:{data:{accessToken:'customer'}}});
    await refreshSession('customer');expect(getAccessToken()).toBe('staff');expect(getAccessToken('customer')).toBe('customer');
  });
  it('refresh notifies context listeners so authorization headers cannot stay stale', () => {
    const listener=vi.fn();const unsubscribe=subscribeSessions(listener);
    setSession({accessToken:'rotated'},'customer');expect(listener).toHaveBeenCalledWith('customer',{accessToken:'rotated'});
    unsubscribe();setSession(null,'customer');expect(listener).toHaveBeenCalledTimes(1);
  });
});
