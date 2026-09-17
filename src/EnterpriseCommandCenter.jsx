import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowRight, Bell, Building2, CheckCircle2, Clock3, FileText, RefreshCw, Users, X, Zap } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
);

function jumpTo(label) {
  const button = Array.from(document.querySelectorAll('.tc-side .tc-nav button')).find((el) => (el.textContent || '').includes(label));
  if (button) button.click();
}

const monthLabel = (value) => value ? `${String(value.period_month).padStart(2, '0')}/${value.period_year}` : 'Sem ciclo';

function Metric({ icon: Icon, label, value, detail, tone = 'neutral' }) {
  const tones = {
    neutral: ['rgba(59,130,246,.08)', 'rgba(59,130,246,.18)', '#93c5fd'],
    good: ['rgba(34,197,94,.08)', 'rgba(34,197,94,.18)', '#86efac'],
    warn: ['rgba(245,158,11,.08)', 'rgba(245,158,11,.18)', '#fcd34d'],
  };
  const [background, border, color] = tones[tone] || tones.neutral;
  return (
    <div style={{ padding: 16, borderRadius: 15, border: `1px solid ${border}`, background }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,.58)', fontSize: 11 }}>
        <Icon size={15} style={{ color }} />
        <span>{label}</span>
      </div>
      <strong style={{ display: 'block', marginTop: 8, fontSize: 26, letterSpacing: '-.04em' }}>{value}</strong>
      {detail && <span style={{ display: 'block', marginTop: 3, color: 'rgba(255,255,255,.48)', fontSize: 10 }}>{detail}</span>}
    </div>
  );
}

export default function EnterpriseCommandCenter({ profile, billing }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ employees: 0, alerts: 0, tasks: 0, payroll: null, locations: 0 });
  const [lastSync, setLastSync] = useState(null);

  const load = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const companyId = profile.company_id;
      const results = await Promise.allSettled([
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'ACTIVE'),
        supabase.from('hr_alerts').select('id', { count: 'exact', head: true }).eq('company_id', companyId).in('status', ['OPEN', 'ACKNOWLEDGED']),
        supabase.from('hr_tasks').select('id', { count: 'exact', head: true }).eq('company_id', companyId).neq('status', 'DONE'),
        supabase.from('payroll_runs').select('status,period_year,period_month,updated_at').eq('company_id', companyId).order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(1),
        supabase.from('work_locations').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('active', true),
      ]);
      const value = (i) => results[i]?.status === 'fulfilled' ? results[i].value : null;
      setData({
        employees: value(0)?.count || 0,
        alerts: value(1)?.count || 0,
        tasks: value(2)?.count || 0,
        payroll: value(3)?.data?.[0] || null,
        locations: value(4)?.count || 0,
      });
      setLastSync(new Date());
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => { load(); }, [load]);

  const attention = data.alerts > 0 || data.tasks > 0;
  const plan = billing?.plan_code || 'Plano';
  const role = profile?.role || 'Utilizador';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Abrir centro de operações"
        style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 13, border: '1px solid rgba(255,255,255,.13)', background: 'rgba(13,18,31,.92)', color: '#fff', boxShadow: '0 16px 44px rgba(0,0,0,.28)', backdropFilter: 'blur(16px)', cursor: 'pointer' }}
      >
        <Activity size={16} />
        <span style={{ fontWeight: 700, fontSize: 12 }}>Centro de operações</span>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: attention ? '#fbbf24' : '#4ade80' }} />
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Centro de operações" style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(2,6,23,.70)', backdropFilter: 'blur(10px)', overflow: 'auto', padding: '44px 20px' }}>
          <div className="tc-enterprise-panel" style={{ width: 'min(920px, 100%)', margin: '0 auto', border: '1px solid rgba(255,255,255,.11)', borderRadius: 22, background: 'linear-gradient(180deg,#111a2a,#0b111d)', boxShadow: '0 30px 90px rgba(0,0,0,.42)', overflow: 'hidden' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: '22px 24px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#93c5fd', fontSize: 10, fontWeight: 800, letterSpacing: '.10em', textTransform: 'uppercase' }}><Activity size={13} /> Operação</div>
                <h2 style={{ margin: '7px 0 3px', fontSize: 24, letterSpacing: '-.035em' }}>Centro de operações</h2>
                <p style={{ margin: 0, color: 'rgba(255,255,255,.52)', fontSize: 12 }}>{profile?.company_name || 'Empresa'} · {role}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '6px 9px', borderRadius: 999, background: 'rgba(59,130,246,.09)', border: '1px solid rgba(59,130,246,.16)', color: '#a9c9ff', fontSize: 9, fontWeight: 800 }}>{plan}</span>
                <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" style={{ border: 0, background: 'rgba(255,255,255,.07)', color: '#fff', width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><X size={17} /></button>
              </div>
            </header>

            <main style={{ padding: 22 }}>
              <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 16, borderRadius: 15, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', marginBottom: 14 }}>
                <div>
                  <span style={{ display: 'block', color: 'rgba(255,255,255,.48)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>Estado atual</span>
                  <strong style={{ display: 'block', marginTop: 4, fontSize: 21 }}>{attention ? 'Atenção necessária' : 'Operação estável'}</strong>
                  <span style={{ display: 'block', marginTop: 4, color: 'rgba(255,255,255,.45)', fontSize: 10 }}>{lastSync ? `Atualizado às ${lastSync.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : 'A sincronizar dados reais'}</span>
                </div>
                <button type="button" onClick={load} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid rgba(255,255,255,.09)', borderRadius: 10, padding: '9px 11px', background: 'rgba(255,255,255,.05)', color: '#fff', cursor: 'pointer', fontSize: 10 }}>
                  <RefreshCw size={13} style={{ animation: loading ? 'tcSpin 1s linear infinite' : 'none' }} /> Atualizar
                </button>
              </section>

              <section className="tc-enterprise-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 }}>
                <Metric icon={Users} label="Colaboradores" value={data.employees} detail="ativos" tone="neutral" />
                <Metric icon={Bell} label="Alertas" value={data.alerts} detail={data.alerts ? 'a verificar' : 'nenhum aberto'} tone={data.alerts ? 'warn' : 'good'} />
                <Metric icon={CheckCircle2} label="Tarefas" value={data.tasks} detail="pendentes" tone={data.tasks ? 'warn' : 'good'} />
                <Metric icon={Building2} label="Locais" value={data.locations} detail="ativos" tone={data.locations ? 'good' : 'warn'} />
              </section>

              <section style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: 16, borderRadius: 15, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Clock3 size={15} style={{ color: '#93c5fd' }} /><strong style={{ fontSize: 12 }}>Ponto</strong></div>
                  <strong style={{ fontSize: 17 }}>{data.locations ? 'Configurado' : 'Configuração pendente'}</strong>
                  <span style={{ display: 'block', marginTop: 4, color: 'rgba(255,255,255,.45)', fontSize: 10 }}>{data.locations ? 'Há local ativo para assiduidade.' : 'Adicione um local de trabalho.'}</span>
                </div>
                <div style={{ padding: 16, borderRadius: 15, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><FileText size={15} style={{ color: '#93c5fd' }} /><strong style={{ fontSize: 12 }}>Folha</strong></div>
                  <strong style={{ fontSize: 17 }}>{data.payroll?.status || 'Sem ciclo'}</strong>
                  <span style={{ display: 'block', marginTop: 4, color: 'rgba(255,255,255,.45)', fontSize: 10 }}>{monthLabel(data.payroll)}</span>
                </div>
              </section>

              <section style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Zap size={15} /><strong style={{ fontSize: 12 }}>Acesso rápido</strong></div>
                <div className="tc-enterprise-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
                  {[['Colaboradores', Users], ['Ponto', Clock3], ['Tarefas RH', CheckCircle2], ['Alertas', Bell]].map(([label, Icon]) => (
                    <button key={label} type="button" onClick={() => { setOpen(false); jumpTo(label); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '11px 12px', borderRadius: 11, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.035)', color: '#fff', cursor: 'pointer', fontSize: 10 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon size={14} />{label}</span><ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              </section>
            </main>
          </div>
        </div>
      )}
      <style>{`@keyframes tcSpin{to{transform:rotate(360deg)}} @media(max-width:850px){.tc-enterprise-metrics{grid-template-columns:1fr 1fr!important}} @media(max-width:650px){.tc-enterprise-panel{width:calc(100vw - 24px)!important}.tc-enterprise-panel main{padding:16px!important}.tc-enterprise-actions{grid-template-columns:1fr 1fr!important}}`}</style>
    </>
  );
}
