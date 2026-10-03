import forge from 'node-forge';
import axios from 'axios';
import * as ExpoCrypto from 'expo-crypto';
import { Platform } from 'react-native';
const randomBytes = async size => Platform.OS === 'web' ? globalThis.crypto.getRandomValues(new Uint8Array(size)) : ExpoCrypto.getRandomBytesAsync(size);
let cachedKey;
let cachedUntil = 0;
let keyRequest;
const b64 = bytes => forge.util.encode64(bytes).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const binary = bytes => Array.from(bytes, b => String.fromCharCode(b)).join('');
async function keyFor(base) {
  if (cachedKey && cachedUntil > Date.now()) return cachedKey;
  if (!keyRequest) keyRequest = axios.get(`${base.replace(/\/$/, '')}/api/v1/security/payload-key`, { timeout: 12000 })
    .then(({ data }) => {
      if (data.alg !== 'RSA-OAEP-256' || data.enc !== 'A256GCM') throw new Error('Unsupported payload encryption');
      cachedKey = data; cachedUntil = Date.now() + 60000; return data;
    }).finally(() => { keyRequest = null; });
  return keyRequest;
}
export async function encryptPayload(body, method, url, base) {
  const keyInfo = await keyFor(base);
  const header = b64(forge.util.encodeUtf8(JSON.stringify({ alg: 'RSA-OAEP-256', enc: 'A256GCM', kid: keyInfo.kid })));
  const aesKey = binary(await randomBytes(32));
  const iv = binary(await randomBytes(12));
  const jti = b64(binary(await randomBytes(16)));
  const target = new URL(url, base);
  const content = { method: method.toUpperCase(), target: target.pathname + target.search, iat: Math.floor(Date.now() / 1000), jti, body };
  const rsa = forge.pki.publicKeyFromPem(keyInfo.publicKey);
  if (rsa.n.bitLength() < 2048) throw new Error('Invalid encryption key');
  const encryptedKey = rsa.encrypt(aesKey, 'RSA-OAEP', { md: forge.md.sha256.create(), mgf1: { md: forge.md.sha256.create() }, seed: binary(await randomBytes(32)) });
  const cipher = forge.cipher.createCipher('AES-GCM', aesKey);
  cipher.start({ iv, additionalData: header, tagLength: 128 });
  cipher.update(forge.util.createBuffer(forge.util.encodeUtf8(JSON.stringify(content))));
  if (!cipher.finish()) throw new Error('Payload encryption failed');
  return { jwe: [header, b64(encryptedKey), b64(iv), b64(cipher.output.getBytes()), b64(cipher.mode.tag.getBytes())].join('.') };
}
export async function encryptRequest(config, base, uri) {
  const body = config._payloadBody ?? config.data;
  if (body == null || (typeof FormData !== 'undefined' && body instanceof FormData) || typeof body !== 'object') return config;
  if (!config._payloadBody) Object.defineProperty(config, '_payloadBody', { value: body, writable: true, enumerable: true });
  config.data = await encryptPayload(body, config.method || 'POST', uri, base);
  return config;
}
