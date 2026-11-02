import { promises as dns } from 'dns';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { isIP } from 'net';
import { logger } from '../logger';

const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const imageCache = new Map<string, { buffer: Buffer; contentType: string; expiresAt: number }>();

function isPrivateIPv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIPv6(address: string): boolean {
  const value = address.toLowerCase();
  return (
    value === '::1' ||
    value === '::' ||
    value.startsWith('fc') ||
    value.startsWith('fd') ||
    value.startsWith('fe80') ||
    value.startsWith('ff') ||
    value.startsWith('::ffff:127.') ||
    value.startsWith('::ffff:10.') ||
    value.startsWith('::ffff:192.168.')
  );
}

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIPv4(address);
  if (family === 6) return isPrivateIPv6(address);
  return true;
}

async function validateUrl(raw: string): Promise<{ url: URL; address: string; family: number }> {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http(s) image URLs are allowed');
  if (url.username || url.password) throw new Error('Image URLs may not contain credentials');
  if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) throw new Error('Local image URLs are blocked');

  const literalFamily = isIP(url.hostname);
  if (literalFamily) {
    if (isPrivateAddress(url.hostname)) throw new Error('Private image URLs are blocked');
    return { url, address: url.hostname, family: literalFamily };
  }

  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error('Image host did not resolve');
  if (addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error('Image host resolves to a private address');
  }
  const [first] = addresses;
  return { url, address: first.address, family: first.family };
}

function download(url: URL, address: string, family: number): Promise<{ buffer: Buffer; contentType: string; status: number; location?: string }> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = client(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: {
          'User-Agent': 'CouplesHubBot/1.0 (+https://dashboard-couples-hub.vercel.app)',
          Accept: 'image/png,image/jpeg,image/webp,image/gif',
          'Accept-Encoding': 'identity',
        },
        timeout: TIMEOUT_MS,
        lookup: (_hostname, _options, callback) => {
          callback(null, address, family);
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          response.resume();
          resolve({ buffer: Buffer.alloc(0), contentType: '', status, location: response.headers.location });
          return;
        }
        if (status !== 200) {
          response.resume();
          reject(new Error(`Image download failed with HTTP ${status}`));
          return;
        }
        const contentType = String(response.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
        if (!contentType.startsWith('image/')) {
          response.resume();
          reject(new Error(`Expected an image, received ${contentType || 'unknown content'}`));
          return;
        }
        const declared = Number(response.headers['content-length'] ?? 0);
        if (declared > MAX_BYTES) {
          response.resume();
          reject(new Error('Image is too large'));
          return;
        }
        const chunks: Buffer[] = [];
        let total = 0;
        response.on('data', (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_BYTES) {
            req.destroy(new Error('Image is too large'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType, status }));
        response.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(new Error('Image download timed out')));
    req.on('error', reject);
    req.end();
  });
}

export async function fetchImage(raw: string): Promise<{ buffer: Buffer; contentType: string }> {
  const cached = imageCache.get(raw);
  if (cached && cached.expiresAt > Date.now()) return cached;

  if (raw.startsWith('data:')) {
    const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(raw);
    if (!match) throw new Error('Invalid image data URI');
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > MAX_BYTES) throw new Error('Image is too large');
    const entry = { buffer, contentType: match[1].toLowerCase(), expiresAt: Date.now() + 60 * 60_000 };
    imageCache.set(raw, entry);
    return entry;
  }

  let current = raw;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const validated = await validateUrl(current);
    const result = await download(validated.url, validated.address, validated.family);
    if (result.location) {
      current = new URL(result.location, validated.url).toString();
      continue;
    }
    const entry = { buffer: result.buffer, contentType: result.contentType, expiresAt: Date.now() + 60 * 60_000 };
    imageCache.set(raw, entry);
    if (imageCache.size > 256) {
      const now = Date.now();
      for (const [key, value] of imageCache) if (value.expiresAt < now) imageCache.delete(key);
    }
    return entry;
  }
  logger.warn(`Image fetch exceeded ${MAX_REDIRECTS} redirects: ${raw}`);
  throw new Error('Too many image redirects');
}

export function clearImageCache(): void {
  imageCache.clear();
}
