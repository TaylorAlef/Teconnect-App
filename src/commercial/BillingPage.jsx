import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, CreditCard, Crown, Gauge, Loader2, ShieldAlert, Sparkles, Users } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import './BillingPage.css';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
const euro = (cents = 0) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(cents || 0) / 100);
const withTimeout = (promise, ms = 10000, label = 'operação') => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`Tempo limite excedido: ${label}`)), ms)),
]);

export default function BillingPage() {
  const [billing, setBilling] = useState(null);
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const [billingResult, plansResult] = await Promise.all([
        withTimeout(supabase.rpc('get_my_billing'), 10000, 'faturamento'),
        withTimeout(supabase.rpc('get_billing_plans'), 10000, 'planos'),
      ]);
      if (billingResult.error) throw billingResult.error;
      if (plansResult.error) throw plansResult.error;
      setBilling(Array.isArray(billingResult.data) ? billingResult.data[0] : billingResult.data);
      setPlans(plansResult.data || []);
    } catch (e) {
      setBilling(null);
      setPlans([]);
      setError(e.message || 'Não foi possível carregar o faturamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changePlan = async (planCode) => {
    const targetPlan = plans.find((plan) => plan.code === planCode);
    if (!targetPlan?.stripe_price_id) {
      setError('Pagamento online ainda não está configurado para este plano.');
      return;
    }
    setBusy(planCode);
    setError('');
    try {
      const { data, error: fnError } = await withTimeout(supabase.functions.invoke('billing-change-plan', { body: { plan_code: planCode } }), 15000, 'alteração do plano');
      if (fnError) throw fnError;
      if (data?.url) { window.location.assign(data.url); return; }
      await load();
    } catch (e) {
      setError(e.message || 'Não foi possível alterar o plano.');
    } finally {
      setBusy('');
    }
  };

  const usage = useMemo(() => Math.min(100, Number(billing?.usage_percent || 0)), [billing]);
  const stripeReady = plans.some((plan) => Boolean(plan.stripe_price_id));

  if (loading) return <div className="tc-card tc-loading"><Loader2 className="spin"/> A carregar faturamento…</div>;
  if (!billing) return <div className="tc-card tc-card-pad"><div className="tc-error"><ShieldAlert size={16}/> {error || 'Faturamento indisponível.'}</div><button className="tc-btn primary" style={{ marginTop: 14 }} onClick={load}>Tentar novamente</button></div>;

  return <section className="tc-billing tc-billing-qc"><div className="tc-page-heading"><div><div className="tc-eyebrow"><CreditCard size={14}/> Faturamento</div><h1>Plano e licenças</h1><p>Controle o crescimento da sua equipa sem sair do Teconnect.</p></div></div>{error&&<div className="tc-error"><ShieldAlert size={16}/> {error}</div>}{!stripeReady&&<div className="tc-billing-warning"><ShieldAlert size={18}/><div><strong>Pagamentos online em configuração</strong><span>Os planos e limites já estão disponíveis. O Checkout Stripe será ativado após a configuração das credenciais de pagamento.</span></div></div>}{(billing.status==='past_due'||billing.billing_blocked)&&<div className="tc-billing-warning"><ShieldAlert size={18}/><div><strong>Atenção ao estado da assinatura</strong><span>Atualize o pagamento ou faça upgrade para manter a operação sem bloqueios.</span></div></div>}<div className="tc-billing-grid"><article className="tc-card tc-plan-card"><div className="tc-plan-icon"><Crown size={20}/></div><span className="tc-muted">Plano atual</span><h2>{billing.plan_name}</h2><strong>{euro(billing.monthly_price_cents)}<small>/mês</small></strong><div className="tc-status">{billing.status}</div><div className="tc-plan-meta"><span>Renovação</span><strong>{billing.renewal_at?new Date(billing.renewal_at).toLocaleDateString('pt-PT'):'—'}</strong></div></article><article className="tc-card"><div className="tc-card-head"><div><span className="tc-muted">Licenças</span><h2>{billing.active_employees} / {billing.max_employees}</h2></div><Users size={20}/></div><div className="tc-progress"><span style={{width:`${usage}%`}}/></div><div className="tc-usage"><span>{usage}% utilizado</span><strong>{Math.max(0,billing.max_employees-billing.active_employees)} disponíveis</strong></div></article></div><div className="tc-section-title"><div><h2>Planos</h2><span>Expanda quando a equipa crescer.</span></div><Sparkles size={18}/></div><div className="tc-plans">{plans.map(plan=>{const current=plan.code===billing.plan_code;const available=Boolean(plan.stripe_price_id);return <article key={plan.id} className={`tc-card tc-pricing ${current?'current':''}`}><div className="tc-pricing-top"><h3>{plan.name}</h3>{current&&<span>Atual</span>}</div><div className="tc-price">{euro(plan.monthly_price_cents)}<small>/mês</small></div><div className="tc-license"><Gauge size={15}/> Até {plan.max_employees.toLocaleString('pt-PT')} colaboradores</div><ul>{Object.entries(plan.features||{}).filter(([,enabled])=>enabled).map(([key])=><li key={key}><Check size={14}/> {key==='erp'?'Integrações ERP':key==='advanced_shifts'?'Turnos avançados':key==='predictive_alerts'?'Alertas preditivos':key==='tasks'?'Tarefas RH':key==='sso'?'SSO corporativo':key==='custom_integrations'?'Integrações personalizadas':key}</li>)}</ul>{!current&&<button className="tc-btn primary" disabled={!!busy||!available} onClick={()=>changePlan(plan.code)}>{busy===plan.code?<Loader2 className="spin" size={15}/>:<ArrowUpRight size={15}/>} {available?'Fazer upgrade':'Pagamento indisponível'}</button>}</article>})}</div></section>;
}
