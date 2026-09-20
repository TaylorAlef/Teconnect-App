const encoder = new TextEncoder();

function hex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

export async function stripeSignature(payload: string, secret: string, timestamp: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestamp}.${payload}`),
  );
  return hex(new Uint8Array(signature));
}

export function parseStripeSignature(header: string) {
  const parts: Record<string, string[]> = {};
  for (const rawPart of header.split(',')) {
    const [rawKey, ...rawValue] = rawPart.trim().split('=');
    const key = rawKey?.trim();
    const value = rawValue.join('=').trim();
    if (!key || !value) continue;
    (parts[key] ||= []).push(value);
  }
  return {
    timestamp: Number(parts.t?.[0] || 0),
    signatures: parts.v1 || [],
  };
}

export async function isValidStripeSignature(
  payload: string,
  header: string,
  secret: string,
  nowMs = Date.now(),
  toleranceSeconds = 300,
) {
  if (!payload || !header || !secret) return false;

  const parsed = parseStripeSignature(header);
  if (!Number.isFinite(parsed.timestamp) || parsed.timestamp <= 0 || !parsed.signatures.length) return false;

  const age = Math.abs(nowMs / 1000 - parsed.timestamp);
  if (age > toleranceSeconds) return false;

  const expected = await stripeSignature(payload, secret, parsed.timestamp);
  return parsed.signatures.some((candidate) => constantTimeEqual(expected, candidate));
}
