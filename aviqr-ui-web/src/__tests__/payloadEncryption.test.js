import { describe, it, expect, vi } from 'vitest';
import { generateKeyPairSync, createHash, privateDecrypt, createDecipheriv, constants } from 'node:crypto';
import axios from 'axios';
import { encryptPayload, encryptRequest } from '../api/payloadEncryption.js';
const pair = generateKeyPairSync('rsa', { modulusLength:2048 });
const publicDer = pair.publicKey.export({type:'spki',format:'der'});
const publicConfig = {alg:'RSA-OAEP-256', enc:'A256GCM', kid:createHash('sha256').update(publicDer).digest('base64url'),publicKey:pair.publicKey.export({type:'spki',format:'pem'})};
function decrypt(envelope) {
  const [header,key,iv,ciphertext,tag] = envelope.jwe.split('.');
  const cek = privateDecrypt({key:pair.privateKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(key,'base64url'));
  const aes = createDecipheriv('aes-256-gcm',cek,Buffer.from(iv,'base64url'));aes.setAAD(Buffer.from(header));aes.setAuthTag(Buffer.from(tag,'base64url'));
  return JSON.parse(Buffer.concat([aes.update(Buffer.from(ciphertext,'base64url')),aes.final()]));
}
describe('payload encryption',()=>{
  it('encrypts Unicode JSON with independent standard crypto interoperability',async()=>{
    vi.spyOn(axios,'get').mockResolvedValue({data:publicConfig});
    const body={email:'test@example.com',password:'test-only-password',note:'₹ café'};
    const encrypted=await encryptPayload(body,'POST','/api/v1/auth/login?audience=staff','https://api.example.test');
    expect(JSON.stringify(encrypted)).not.toContain(body.password);
    expect(decrypt(encrypted)).toMatchObject({body,method:'POST',target:'/api/v1/auth/login?audience=staff'});
    const second=await encryptPayload(body,'POST','/api/v1/auth/login?audience=staff','https://api.example.test');
    expect(second.jwe).not.toBe(encrypted.jwe);expect(decrypt(second).jti).not.toBe(decrypt(encrypted).jti);
  });
  it('re-encrypts the original JSON with a fresh request ID on a challenge retry',async()=>{
    const config={method:'post',data:{password:'test-only'}};
    await encryptRequest(config,'https://api.example.test','https://api.example.test/api/v1/auth/login');
    const first=decrypt(config.data);config.data=JSON.stringify(config.data);
    await encryptRequest(config,'https://api.example.test','https://api.example.test/api/v1/auth/login');
    const second=decrypt(config.data);expect(second.body).toEqual(first.body);expect(second.jti).not.toBe(first.jti);
  });
});
