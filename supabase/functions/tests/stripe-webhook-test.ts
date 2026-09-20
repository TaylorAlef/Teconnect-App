import {
  isValidStripeSignature,
  stripeSignature,
} from '../_shared/stripe-signature.ts';

const secret = 'whsec_e2e_test_secret';
const payload = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed' });

Deno.test('accepts a correctly signed Stripe webhook', async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await stripeSignature(payload, secret, timestamp);
  const header = `t=${timestamp}, v1=${signature}`;
  if (!(await isValidStripeSignature(payload, header, secret))) {
    throw new Error('Expected valid Stripe signature to be accepted');
  }
});

Deno.test('accepts one valid signature among multiple v1 values', async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const valid = await stripeSignature(payload, secret, timestamp);
  const header = `t=${timestamp}, v1=invalid, v1=${valid}`;
  if (!(await isValidStripeSignature(payload, header, secret))) {
    throw new Error('Expected one valid v1 signature to be sufficient');
  }
});

Deno.test('rejects a tampered payload', async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await stripeSignature(payload, secret, timestamp);
  const header = `t=${timestamp}, v1=${signature}`;
  if (await isValidStripeSignature(payload + 'x', header, secret)) {
    throw new Error('Tampered payload was accepted');
  }
});

Deno.test('rejects an expired signature', async () => {
  const timestamp = Math.floor(Date.now() / 1000) - 301;
  const signature = await stripeSignature(payload, secret, timestamp);
  const header = `t=${timestamp}, v1=${signature}`;
  if (await isValidStripeSignature(payload, header, secret)) {
    throw new Error('Expired Stripe signature was accepted');
  }
});
