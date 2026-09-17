import { createClient } from '@supabase/supabase-js';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = req.headers.get('Authorization'); if (!auth) return json({ error: 'AUTH_REQUIRED' }, 401);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
    const { data: profile } = await supabase.from('profiles').select('company_id,role,active').eq('id', user.id).single();
    if (!profile?.active || !['COMPANY_ADMIN','SUPER_ADMIN'].includes(profile.role)) return json({ error: 'FORBIDDEN' }, 403);
    const { plan_code } = await req.json(); const code = String(plan_code || '').toUpperCase();
    if (!['STARTER','BUSINESS','ENTERPRISE'].includes(code)) return json({ error: 'INVALID_PLAN' }, 400);
    const priceId = Deno.env.get(`STRIPE_PRICE_${code}`); const secret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!priceId || !secret) return json({ error: 'BILLING_NOT_CONFIGURED' }, 503);
    const origin = req.headers.get('origin') || Deno.env.get('APP_URL') || 'https://app.te-connect.com';
    const form = new URLSearchParams(); form.set('mode','subscription'); form.set('line_items[0][price]',priceId); form.set('line_items[0][quantity]','1'); form.set('success_url',`${origin}/?billing=success`); form.set('cancel_url',`${origin}/?billing=cancelled`); form.set('customer_email',user.email || ''); form.set('client_reference_id',profile.company_id); form.set('metadata[company_id]',profile.company_id); form.set('metadata[plan_code]',code); form.set('subscription_data[metadata][company_id]',profile.company_id); form.set('subscription_data[metadata][plan_code]',code);
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/x-www-form-urlencoded'},body:form}); const data=await response.json();
    if (!response.ok) return json({error:'STRIPE_CHECKOUT_ERROR',details:data?.error?.message || 'Stripe rejected the request'},502); return json({url:data.url,session_id:data.id});
  } catch (e) { console.error(e); return json({ error:'INTERNAL_ERROR' },500); }
});
