import axios from 'axios';
let cachedKey;
let cachedUntil = 0;
let keyRequest;
const bytesToBase64 = bytes => btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
const b64 = bytes => bytesToBase64(bytes).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const randomBytes = size => globalThis.crypto.getRandomValues(new Uint8Array(size));
async function keyFor(base) {
  if (cachedKey && cachedUntil > Date.now()) return cachedKey;
  if (!keyRequest) keyRequest = axios.get(`${base.replace(/\/$/, '')}/api/v1/security/payload-key`, { timeout: 12000 })
    .then(async ({ data }) => {
      if (data.alg !== 'RSA-OAEP-256' || data.enc !== 'A256GCM') throw new Error('Unsupported payload encryption');
      const der = Uint8Array.from(atob(data.publicKey.replace(/-----[^-]+-----|\s/g, '')), c => c.charCodeAt(0));
      const key = await globalThis.crypto.subtle.importKey('spki', der, { name:'RSA-OAEP', hash:'SHA-256' }, false, ['encrypt']);
      if (key.algorithm.modulusLength < 2048) throw new Error('Invalid encryption key');
      cachedKey = { ...data, key }; cachedUntil = Date.now() + 60000; return cachedKey;
    }).finally(() => { keyRequest = null; });
  return keyRequest;
}
export async function encryptPayload(body, method, url, base) {
  const keyInfo = await keyFor(base);
  const text = new TextEncoder();
  const header = b64(text.encode(JSON.stringify({ alg:'RSA-OAEP-256', enc:'A256GCM', kid:keyInfo.kid })));
  const aesBytes = randomBytes(32), iv = randomBytes(12);
  const target = new URL(url, base);
  const content = { method:method.toUpperCase(), target:target.pathname + target.search, iat:Math.floor(Date.now()/1000), jti:b64(randomBytes(16)), body };
  const aesKey = await globalThis.crypto.subtle.importKey('raw',aesBytes,'AES-GCM',false,['encrypt']);
  const encryptedKey = await globalThis.crypto.subtle.encrypt('RSA-OAEP',keyInfo.key,aesBytes);
  const sealed = new Uint8Array(await globalThis.crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:text.encode(header),tagLength:128},aesKey,text.encode(JSON.stringify(content))));
  return { jwe:[header,b64(new Uint8Array(encryptedKey)),b64(iv),b64(sealed.slice(0,-16)),b64(sealed.slice(-16))].join('.') };
}
export async function encryptRequest(config, base, uri) {
  const body = config._payloadBody ?? config.data;
  if (body == null || (typeof FormData !== 'undefined' && body instanceof FormData) || typeof body !== 'object') return config;
  if (!config._payloadBody) Object.defineProperty(config, '_payloadBody', { value:body, writable:true, enumerable:true });
  config.data = await encryptPayload(body,config.method || 'POST',uri,base);
  return config;
}
