import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, Bell, Building2, CheckCircle2, CircleAlert, Clock3, FileText, LockKeyhole, RefreshCw, Settings2, ShieldCheck, Sparkles, Users, X, Zap } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
);

const tone = {
  good: { bg: 'rgba(34,197,94,.10)', border: 'rgba(34,197,94,.22)', color: '#86efac' },
  warn: { bg: 'rgba(245,158,11,.10)', border: 'rgba(245,158,11,.24)', color: '#fcd34d' },
  info: { bg: 'rgba(59,130,246,.10)', border: 'rgba(59,130,246,.24)', color: '#93c5fd' },
};

function jumpTo(label) {
  const button = Array.from(document.querySelectorAll('.tc-side .tc-nav button')).find((el) => (el.textContent || '').includes(label));
  if (button) button.click();
}

function Stat({ icon: Icon, label, value, detail, status = 'info' }) {
  const t = tone[status] || tone.info;
  return (
    <div style={{ padding: 14, borderRadius: 14, border: `1px solid ${t.border}`, background: t.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ color: 'rgba(255,255,255,.62)', fontSize: 12 }}>{label}</span>
        <Icon size={16} style={{ color: t.color }} />
      </div>
      <strong style={{ display: 'block', marginTop: 7, fontSize: 22, letterSpacing: '-.03em' }}>{value}</strong>
      {detail && <span style={{ display: 'block', marginTop: 3, color: 'rgba(255,255,255,.52)', fontSize: 11 }}>{detail}</span>}
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
      const payroll = value(3)?.data?.[0] || null;
      setData({ employees: value(0)?.count || 0, alerts: value(1)?.count || 0, tasks: value(2)?.count || 0, payroll, locations: value(4)?.count || 0 });
      setLastSync(new Date());
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => { load(); }, [load]);

  const readiness = useMemo(() => {
    let score = 100;
    if (!data.employees) score -= 25;
    if (!data.locations) score -= 20;
    if (data.alerts > 0) score -= Math.min(20, data.alerts * 4);
    if (data.tasks > 5) score -= 10;
    if (!data.payroll) score -= 15;
    return Math.max(0, score);
  }, [data]);

  const readinessStatus = readiness >= 85 ? 'good' : readiness >= 65 ? 'warn' : 'info';
  const plan = billing?.plan_code || '—';
  const role = profile?.role || 'Utilizador';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Centro de controlo da empresa"
        style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 13, border: '1px solid rgba(255,255,255,.13)', background: 'rgba(13,18,31,.90)', color: '#fff', boxShadow: '0 16px 44px rgba(0,0,0,.28)', backdropFilter: 'blur(16px)', cursor: 'pointer' }}
      >
        <Activity size={16} />
        <span style={{ fontWeight: 700, fontSize: 12 }}>Centro da empresa</span>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: readinessStatus === 'good' ? '#4ade80' : '#fbbf24' }} />
      </button>

      {open && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(2,6,23,.70)', backdropFilter: 'blur(10px)', overflow: 'auto', padding: '38px 20px' }}>
          <div style={{ width: 'min(1120px, 100%)', margin: '0 auto', border: '1px solid rgba(255,255,255,.11)', borderRadius: 22, background: 'linear-gradient(180deg,#101827,#0b111d)', boxShadow: '0 30px 90px rgba(0,0,0,.42)', overflow: 'hidden' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: '22px 24px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#93c5fd', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}><Sparkles size={14} /> Teconnect Enterprise Control</div>
                <h2 style={{ margin: '7px 0 3px', fontSize: 25, letterSpacing: '-.035em' }}>Centro de controlo da empresa</h2>
                <p style={{ margin: 0, color: 'rgba(255,255,255,.55)', fontSize: 13 }}>{profile?.company_name || 'Organização'} · {role} · Plano {plan}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" style={{ border: 0, background: 'rgba(255,255,255,.07)', color: '#fff', width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><X size={18} /></button>
            </header>

            <main style={{ padding: 24 }}>
              <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(300px,.65fr)', gap: 16, marginBottom: 18 }}>
                <div style={{ borderRadius: 17, padding: 18, border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.025)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 12 }}>Prontidão operacional</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 5 }}><strong style={{ fontSize: 38, letterSpacing: '-.05em' }}>{readiness}%</strong><span style={{ color: tone[readinessStatus].color, fontSize: 12 }}>indicador interno</span></div>
                    </div>
                    <ShieldCheck size={28} style={{ color: tone[readinessStatus].color }} />
                  </div>
                  <div style={{ height: 7, marginTop: 15, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}><div style={{ width: `${readiness}%`, height: '100%', borderRadius: 999, background: tone[readinessStatus].color, transition: 'width .3s ease' }} /></div>
                  <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,.54)', fontSize: 12, lineHeight: 1.55 }}>Indicador calculado a partir dos dados operacionais disponíveis no Teconnect. Use-o como sinal de acompanhamento, não como certificação de conformidade.</p>
                </div>
                <div style={{ borderRadius: 17, padding: 18, border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.025)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700 }}><LockKeyhole size={17} /> Segurança e acesso</div>
                  <div style={{ marginTop: 14, display: 'grid', gap: 9, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(255,255,255,.52)' }}>Sessão</span><strong style={{ color: '#86efac' }}>Ativa</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(255,255,255,.52)' }}>Perfil</span><strong>{role}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(255,255,255,.52)' }}>Plano</span><strong>{plan}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(255,255,255,.52)' }}>Dados em tempo real</span><strong style={{ color: '#93c5fd' }}>Ligado</strong></div>
                  </div>
                </div>
              </section>

              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 }}>
                <Stat icon={Users} label="Colaboradores ativos" value={data.employees} detail="base operacional" status="info" />
                <Stat icon={CircleAlert} label="Alertas em aberto" value={data.alerts} detail={data.alerts ? 'requer atenção' : 'sem alertas ativos'} status={data.alerts ? 'warn' : 'good'} />
                <Stat icon={CheckCircle2} label="Tarefas pendentes" value={data.tasks} detail="worklist RH" status={data.tasks > 5 ? 'warn' : 'good'} />
                <Stat icon={Building2} label="Locais ativos" value={data.locations} detail="geofence configurada" status={data.locations ? 'good' : 'warn'} />
              </section>

              <section style={{ marginTop: 16, padding: 17, borderRadius: 17, border: '1px solid rgba(255,255,255,.09)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 13 }}>
                  <div><strong style={{ fontSize: 14 }}>Operação e folha</strong><div style={{ color: 'rgba(255,255,255,.48)', fontSize: 11, marginTop: 3 }}>Último ciclo registado</div></div>
                  <button type="button" onClick={load} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: 0, borderRadius: 9, padding: '7px 10px', background: 'rgba(255,255,255,.07)', color: '#fff', cursor: 'pointer', fontSize: 11 }}><RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Atualizar</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
                  <div style={{ padding: 13, borderRadius: 12, background: 'rgba(255,255,255,.035)' }}><Clock3 size={15} /><strong style={{ display: 'block', marginTop: 7 }}>{data.locations ? 'Ponto pronto' : 'Configurar ponto'}</strong><span style={{ color: 'rgba(255,255,255,.48)', fontSize: 11 }}>{data.locations ? 'Há pelo menos um local ativo.' : 'Adicione um local de trabalho.'}</span></div>
                  <div style={{ padding: 13, borderRadius: 12, background: 'rgba(255,255,255,.035)' }}><FileText size={15} /><strong style={{ display: 'block', marginTop: 7 }}>{data.payroll?.status || 'Sem ciclo'}</strong><span style={{ color: 'rgba(255,255,255,.48)', fontSize: 11 }}>{data.payroll ? `${String(data.payroll.period_month).padStart(2,'0')}/${data.payroll.period_year}` : 'Nenhuma folha registada.'}</span></div>
                  <div style={{ padding: 13, borderRadius: 12, background: 'rgba(255,255,255,.035)' }}><Activity size={15} /><strong style={{ display: 'block', marginTop: 7 }}>{lastSync ? 'Sincronizado' : 'A sincronizar'}</strong><span style={{ color: 'rgba(255,255,255,.48)', fontSize: 11 }}>{lastSync ? lastSync.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : 'A obter dados.'}</span></div>
                </div>
              </section>

              <section style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Zap size={15} /><strong style={{ fontSize: 14 }}>Ações rápidas</strong></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 9 }}>
                  {[['Pessoas', Users], ['Ponto', Clock3], ['Tarefas', CheckCircle2], ['Alertas', Bell], ['Integrações', Settings2]].map(([label, Icon]) => <button key={label} type="button" onClick={() => { setOpen(false); jumpTo(label); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '11px 12px', borderRadius: 11, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.035)', color: '#fff', cursor: 'pointer', fontSize: 11 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon size={14} />{label}</span><ArrowRight size={13} /></button>)}
                </div>
              </section>
            </main>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @media(max-width:850px){.tc-enterprise-grid{grid-template-columns:1fr!important}}`}</style>
    </>
  );
}
