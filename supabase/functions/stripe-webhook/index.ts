import { createClient } from '@supabase/supabase-js';
import { isValidStripeSignature } from '../_shared/stripe-signature.ts';

const supabaseAdmin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Registra falhas silenciosas de casamento de plano num log estruturado.
// Sem isto, um checkout pago podia nao ativar nenhuma assinatura sem deixar rasto.
async function logBillingMismatch(db: ReturnType<typeof supabaseAdmin>, context: Record<string, unknown>) {
  console.error('STRIPE_WEBHOOK_PLAN_MISMATCH', JSON.stringify(context));
  try {
    await db.from('audit_logs').insert({
      company_id: (context.company_id as string) || null,
      action: 'STRIPE_WEBHOOK_PLAN_MISMATCH',
      entity: 'subscriptions',
      entity_id: (context.stripe_object_id as string) || null,
      new_data: context,
    });
  } catch (logError) {
    console.error('FAILED_TO_RECORD_BILLING_MISMATCH', logError instanceof Error ? logError.message : String(logError));
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature') || '';
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret || !(await isValidStripeSignature(payload, signature, webhookSecret))) return new Response('Invalid signature', { status: 400 });
    const event = JSON.parse(payload);
    const db = supabaseAdmin();
    const obj = event.data?.object || {};
    const companyId = obj.metadata?.company_id || obj.client_reference_id;

    if (event.type === 'checkout.session.completed') {
      const subscriptionId = typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id;
      const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
      if (companyId && subscriptionId) {
        const planCode = String(obj.metadata?.plan_code || 'STARTER').toUpperCase();
        const { data: plan } = await db.from('subscription_plans').select('id,max_employees').eq('code', planCode).single();
        if (plan) {
          await db.from('subscriptions').upsert({ company_id: companyId, plan_id: plan.id, status: 'active', max_employees: plan.max_employees, stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, stripe_checkout_session_id: obj.id, updated_at: new Date().toISOString() }, { onConflict: 'company_id' });
        } else {
          await logBillingMismatch(db, { reason: 'PLAN_CODE_NOT_FOUND', plan_code: planCode, company_id: companyId, stripe_object_id: obj.id, stripe_subscription_id: subscriptionId, event_type: event.type });
        }
      } else {
        await logBillingMismatch(db, { reason: 'MISSING_COMPANY_OR_SUBSCRIPTION', company_id: companyId || null, stripe_subscription_id: subscriptionId || null, stripe_object_id: obj.id, event_type: event.type });
      }
    }

    if (event.type.startsWith('customer.subscription.')) {
      const subId = obj.id;
      const status = obj.status === 'trialing' ? 'trial' : obj.status === 'active' ? 'active' : obj.status === 'past_due' ? 'past_due' : obj.status === 'canceled' ? 'canceled' : obj.status === 'paused' ? 'paused' : 'incomplete';
      const company = obj.metadata?.company_id;
      const priceId = obj.items?.data?.[0]?.price?.id;
      const { data: plan } = priceId ? await db.from('subscription_plans').select('id,max_employees').eq('stripe_price_id', priceId).maybeSingle() : { data: null };
      if (priceId && !plan) {
        await logBillingMismatch(db, { reason: 'STRIPE_PRICE_ID_NOT_MAPPED', stripe_price_id: priceId, company_id: company || null, stripe_subscription_id: subId, event_type: event.type });
      }
      const patch: Record<string, unknown> = { status, current_period_start: obj.current_period_start ? new Date(obj.current_period_start*1000).toISOString() : null, current_period_end: obj.current_period_end ? new Date(obj.current_period_end*1000).toISOString() : null, renewal_at: obj.current_period_end ? new Date(obj.current_period_end*1000).toISOString() : null, cancel_at_period_end: !!obj.cancel_at_period_end, canceled_at: obj.canceled_at ? new Date(obj.canceled_at*1000).toISOString() : null, updated_at: new Date().toISOString() };
      if (plan) { patch.plan_id = plan.id; patch.max_employees = plan.max_employees; }
      const query = company ? db.from('subscriptions').update(patch).eq('company_id', company) : db.from('subscriptions').update(patch).eq('stripe_subscription_id', subId);
      await query;
    }

    if (event.type === 'invoice.payment_failed') {
      const subscriptionId = typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id;
      if (subscriptionId) await db.from('subscriptions').update({ status: 'past_due', updated_at: new Date().toISOString() }).eq('stripe_subscription_id', subscriptionId);
    }
    if (event.type === 'invoice.paid') {
      const subscriptionId = typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id;
      if (subscriptionId) await db.from('subscriptions').update({ status: 'active', updated_at: new Date().toISOString() }).eq('stripe_subscription_id', subscriptionId);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) { console.error(e); return new Response('Webhook error', { status: 500 }); }
});
