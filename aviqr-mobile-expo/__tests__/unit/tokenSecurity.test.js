import { Platform } from 'react-native';
import { tokenStorage } from '../../src/api/tokenStorage.js';
import * as SecureStore from 'expo-secure-store';
describe('credential storage',()=>{
  afterEach(()=>{Platform.OS='android';delete global.localStorage;});
  it('native credentials use the platform secure store',async()=>{
    Platform.OS='android';await tokenStorage.set('aviqr_refresh','native-secret');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('aviqr_refresh','native-secret');
    expect(await tokenStorage.get('aviqr_refresh')).toBe('native-secret');
  });
  it('Expo web never writes access or refresh credentials into localStorage',async()=>{
    Platform.OS='web';global.localStorage={setItem:jest.fn(),getItem:jest.fn(),removeItem:jest.fn()};
    await tokenStorage.set('aviqr_token','access');await tokenStorage.set('aviqr_refresh','refresh');await tokenStorage.set('aviqr_trusted_device','device');
    expect(global.localStorage.setItem).not.toHaveBeenCalled();expect(await tokenStorage.get('aviqr_token')).toBe('access');
    await tokenStorage.del('aviqr_token');expect(await tokenStorage.get('aviqr_token')).toBeNull();
  });
});
