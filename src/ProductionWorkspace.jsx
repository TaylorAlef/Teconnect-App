import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Users,
  Activity,
  AlarmClock,
  ListChecks,
  Clock3,
  TrendingUp,
  ShieldAlert,
  FileWarning,
  CalendarClock,
  PlugZap,
  Star,
  CreditCard,
  RefreshCw,
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
);

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 19) return 'Boa tarde';
  return 'Boa noite';
}

// Conta linhas com segurança: se a coluna/valor de status ainda não bater
// exatamente com o enum real da tabela, cai para 0 em vez de rebentar o ecrã.
async function safeCount(query) {
  try {
    const { count, error } = await query;
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

export default function ProductionWorkspace({ profile, billing, onOpenAttendance, onOpenPanel, onOpenBilling }) {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ active: 0, working: 0, late: 0, pending: 0, overtimeMinutes: 0 });
  const [actions, setActions] = useState([]);
  const [week, setWeek] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [refreshedAt, setRefreshedAt] = useState(null);

  const companyId = profile?.company_id;
  const roleLabel = useMemo(() => ({
    SUPER_ADMIN: 'Super Admin',
    COMPANY_ADMIN: 'Admin da empresa',
    RH: 'RH',
    GESTOR: 'Gestor',
    SUPERVISOR: 'Supervisor',
  }[profile?.role] || profile?.role), [profile?.role]);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);

    const [
      employeesResult,
      todayAttendanceResult,
      weekAttendanceResult,
      vacationsResult,
      overtimeResult,
      absencesResult,
    ] = await Promise.all([
      supabase.from('employees').select('id,full_name,employee_code,status').eq('company_id', companyId),
      supabase.from('attendance_days').select('employee_id,late_minutes,worked_minutes,status').eq('company_id', companyId).eq('work_date', todayISO()),
      supabase.from('attendance_days').select('work_date,late_minutes,worked_minutes,status').eq('company_id', companyId).gte('work_date', isoDaysAgo(6)).lte('work_date', todayISO()),
      supabase.from('vacation_requests').select('id,employee_id,status,start_date,end_date').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20),
      supabase.from('overtime_records').select('id,employee_id,status,minutes').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
      supabase.from('absences').select('id,employee_id,status').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20),
    ]);

    const employees = employeesResult.data || [];
    const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
    const employeeById = new Map(employees.map((e) => [e.id, e]));

    const todayRows = todayAttendanceResult.data || [];
    const lateToday = todayRows.filter((r) => (r.late_minutes || 0) > 0).length;
    const workingNow = todayRows.filter((r) => (r.worked_minutes || 0) > 0 && r.status !== 'CLOSED').length;

    const pendingVacations = (vacationsResult.data || []).filter((v) => (v.status || '').toUpperCase().includes('PEND'));
    const pendingOvertime = (overtimeResult.data || []).filter((o) => (o.status || '').toUpperCase().includes('PEND'));
    const pendingAbsences = (absencesResult.data || []).filter((a) => (a.status || '').toUpperCase().includes('PEND'));
    const overtimeMinutesThisMonth = (overtimeResult.data || []).reduce((sum, o) => sum + (o.minutes || 0), 0);

    setKpis({
      active: activeEmployees.length,
      working: workingNow,
      late: lateToday,
      pending: pendingVacations.length + pendingOvertime.length + pendingAbsences.length,
      overtimeMinutes: overtimeMinutesThisMonth,
    });

    // Centro de ação: prioriza atrasos de hoje, depois férias/horas extra pendentes há mais tempo.
    const nextActions = [];
    todayRows.filter((r) => (r.late_minutes || 0) >= 15).slice(0, 2).forEach((r) => {
      const emp = employeeById.get(r.employee_id);
      nextActions.push({
        tone: 'urgent',
        title: `${emp?.full_name || 'Colaborador'} — entrada ${r.late_minutes} min atrasada`,
        sub: 'Sem justificação registada até ao momento',
        action: 'Ver marcação',
        onClick: onOpenAttendance,
      });
    });
    if (pendingOvertime.length) {
      nextActions.push({
        tone: 'warn',
        title: `${pendingOvertime.length} registo(s) de horas extra por aprovar`,
        sub: 'Aguardam decisão do RH ou gestor responsável',
        action: 'Validar horas extra',
        onClick: () => onOpenPanel?.('approvals'),
      });
    }
    if (pendingVacations.length) {
      nextActions.push({
        tone: 'warn',
        title: `${pendingVacations.length} pedido(s) de férias pendentes`,
        sub: 'Colaboradores à espera de resposta',
        action: 'Aprovar férias',
        onClick: () => onOpenPanel?.('approvals'),
      });
    }
    if (pendingAbsences.length) {
      nextActions.push({
        tone: 'info',
        title: `${pendingAbsences.length} ausência(s) por validar`,
        sub: 'Justificações submetidas pelos colaboradores',
        action: 'Rever ausências',
        onClick: () => onOpenPanel?.('approvals'),
      });
    }
    setActions(nextActions);

    // Presença dos últimos 7 dias: % de dias sem atraso e com horas registadas.
    const weekRows = weekAttendanceResult.data || [];
    const byDay = new Map();
    weekRows.forEach((r) => {
      const bucket = byDay.get(r.work_date) || { total: 0, onTime: 0 };
      bucket.total += 1;
      if ((r.late_minutes || 0) === 0 && (r.worked_minutes || 0) > 0) bucket.onTime += 1;
      byDay.set(r.work_date, bucket);
    });
    const weekSeries = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = isoDaysAgo(i);
      const bucket = byDay.get(date);
      const pct = bucket && bucket.total ? Math.round((bucket.onTime / bucket.total) * 100) : null;
      weekSeries.push({ date, label: WEEKDAY_LABELS[new Date(`${date}T12:00:00`).getDay()], pct });
    }
    setWeek(weekSeries);

    // Colaboradores em destaque: sem atrasos nos últimos 7 dias, com pelo menos 1 dia trabalhado.
    const lateByEmployee = new Set(weekRows.filter((r) => (r.late_minutes || 0) > 0).map((r) => r.employee_id));
    const daysWorkedByEmployee = new Map();
    weekRows.forEach((r) => {
      if ((r.worked_minutes || 0) > 0) daysWorkedByEmployee.set(r.employee_id, (daysWorkedByEmployee.get(r.employee_id) || 0) + 1);
    });
    const featured = activeEmployees
      .filter((e) => daysWorkedByEmployee.has(e.id) && !lateByEmployee.has(e.id))
      .slice(0, 3)
      .map((e) => ({ name: e.full_name, days: daysWorkedByEmployee.get(e.id) }));
    setHighlights(featured);

    setRefreshedAt(new Date());
    setLoading(false);
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  if (!profile) return null;

  const planCode = billing?.plan_code || billing?.plan?.code || 'Sem plano ativo';
  const maxEmployees = billing?.max_employees;
  const nextRenewal = billing?.current_period_end
    ? new Date(billing.current_period_end).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
    : '—';

  return (
    <div className="suite-app" style={{ gridTemplateColumns: '1fr', minHeight: 'auto' }}>
      <div style={{ padding: '26px 28px 60px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>

        <div className="suite-hero-card" style={{ borderRadius: 24 }}>
          <div className="suite-page-intro" style={{ marginBottom: 0 }}>
            <div>
              <div className="suite-eyebrow">
                {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' })}
              </div>
              <h1 style={{ color: '#fff', fontSize: 26 }}>{greeting()}, {profile.full_name?.split(' ')[0] || roleLabel}.</h1>
              <p style={{ color: 'rgba(255,255,255,.65)', margin: '6px 0 0', maxWidth: '56ch', lineHeight: 1.55 }}>
                {kpis.active > 0
                  ? `${kpis.working} dos ${kpis.active} colaboradores já registaram entrada hoje. ${actions.length ? `Há ${actions.length} item(ns) que precisam da sua atenção.` : 'Sem pendências urgentes neste momento.'}`
                  : 'A carregar o estado da empresa…'}
              </p>
            </div>
            <button type="button" className="suite-btn" onClick={load} title="Atualizar" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.2)', background: 'rgba(255,255,255,.08)' }}>
              <RefreshCw size={13} />
              {refreshedAt ? `Atualizado ${refreshedAt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : 'A atualizar…'}
            </button>
          </div>

          <div className="suite-kpis">
            <div className="suite-kpi"><div className="suite-kpi-top"><span>Colaboradores ativos</span><Users size={14} /></div><strong>{kpis.active}</strong></div>
            <div className="suite-kpi"><div className="suite-kpi-top"><span>A trabalhar agora</span><Activity size={14} /></div><strong>{kpis.working}</strong></div>
            <div className="suite-kpi"><div className="suite-kpi-top"><span>Atrasos hoje</span><AlarmClock size={14} /></div><strong>{kpis.late}</strong></div>
            <div className="suite-kpi"><div className="suite-kpi-top"><span>Pendências</span><ListChecks size={14} /></div><strong>{kpis.pending}</strong></div>
            <div className="suite-kpi"><div className="suite-kpi-top"><span>Horas extra (registadas)</span><Clock3 size={14} /></div><strong>{Math.round(kpis.overtimeMinutes / 60)}h</strong></div>
            <div className="suite-kpi"><div className="suite-kpi-top"><span>Plano</span><TrendingUp size={14} /></div><strong style={{ fontSize: 16 }}>{planCode}</strong></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16, marginTop: 18, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 16 }}>

            <div className="suite-card">
              <div className="suite-panel-head" style={{ padding: '16px 18px 0' }}>
                <h2 style={{ fontSize: 14 }}>Centro de ação</h2>
                <span className="suite-badge">{actions.length} itens</span>
              </div>
              <div style={{ padding: '12px 18px 18px', display: 'grid', gap: 10 }}>
                {loading && <div style={{ color: 'var(--s-muted)', padding: '18px 0' }}>A carregar…</div>}
                {!loading && actions.length === 0 && (
                  <div style={{ color: 'var(--s-muted)', padding: '18px 0' }}>Sem pendências neste momento. Bom trabalho.</div>
                )}
                {!loading && actions.map((item, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: 12, borderRadius: 13, border: '1px solid var(--s-line)', background: 'var(--s-surface2)' }}>
                    <div>
                      <span className="suite-badge" style={{
                        marginBottom: 5,
                        color: item.tone === 'urgent' ? '#c93b52' : item.tone === 'warn' ? '#966412' : '#0d7c98',
                        background: item.tone === 'urgent' ? 'rgba(230,93,112,.12)' : item.tone === 'warn' ? 'rgba(243,172,53,.14)' : 'rgba(16,188,233,.12)',
                      }}>{item.tone === 'urgent' ? 'Urgente' : item.tone === 'warn' ? 'Atenção' : 'Informação'}</span>
                      <div style={{ fontSize: 11.5, fontWeight: 700 }}>{item.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--s-muted)', marginTop: 2 }}>{item.sub}</div>
                    </div>
                    <button type="button" className="suite-btn" onClick={item.onClick}>{item.action}</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="suite-card">
              <div className="suite-panel-head" style={{ padding: '16px 18px 0' }}>
                <h2 style={{ fontSize: 14 }}>Presença &amp; assiduidade</h2>
                <span style={{ color: 'var(--s-muted)', fontSize: 9.5 }}>Últimos 7 dias</span>
              </div>
              <div style={{ padding: '14px 18px 18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10, alignItems: 'end', height: 110 }}>
                  {week.map((day) => (
                    <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 8.5, color: 'var(--s-muted)', fontWeight: 700 }}>{day.pct === null ? '—' : `${day.pct}%`}</span>
                      <div style={{
                        width: '100%', maxWidth: 28, borderRadius: '7px 7px 3px 3px',
                        height: `${Math.max(day.pct || 4, 4)}%`,
                        background: day.pct === null ? 'rgba(108,120,144,.18)' : day.pct < 85 ? 'linear-gradient(180deg,#ffcd7a,#f3ac35)' : 'linear-gradient(180deg,#2f6bff,#246bff)',
                      }} />
                      <span style={{ fontSize: 9, color: 'var(--s-muted)' }}>{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          <div style={{ display: 'grid', gap: 16 }}>

            <div className="suite-card">
              <div className="suite-panel-head" style={{ padding: '16px 18px 0' }}><h2 style={{ fontSize: 14 }}>Colaboradores em destaque</h2></div>
              <div style={{ padding: '10px 18px 16px' }}>
                {highlights.length === 0 && <div style={{ color: 'var(--s-muted)', fontSize: 10.5, padding: '10px 0' }}>Ainda sem dados suficientes esta semana.</div>}
                {highlights.map((h) => (
                  <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--s-line)' }}>
                    <div className="suite-avatar">{initials(h.name)}</div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{h.name}</div>
                    <span className="suite-badge" style={{ marginLeft: 'auto', color: '#0d9c5c', background: 'rgba(32,189,122,.12)' }}>
                      <Star size={10} style={{ marginRight: 4 }} />{h.days} dia(s) sem atraso
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="suite-card">
              <div className="suite-panel-head" style={{ padding: '16px 18px 0' }}><h2 style={{ fontSize: 14 }}>Atalhos</h2></div>
              <div className="suite-actions" style={{ padding: '10px 18px 18px' }}>
                <button type="button" className="suite-btn" onClick={onOpenAttendance}><Clock3 size={13} /> Ponto</button>
                <button type="button" className="suite-btn" onClick={() => onOpenPanel?.('audit')}><ShieldAlert size={13} /> Auditoria</button>
                <button type="button" className="suite-btn" onClick={() => onOpenPanel?.('rules')}><FileWarning size={13} /> Regras</button>
                <button type="button" className="suite-btn" onClick={() => onOpenPanel?.('setup')}><CalendarClock size={13} /> Setup</button>
                <button type="button" className="suite-btn" onClick={() => onOpenPanel?.('integrations')}><PlugZap size={13} /> Integrações</button>
              </div>
            </div>

            <div className="suite-card">
              <div className="suite-panel-head" style={{ padding: '16px 18px 0' }}><h2 style={{ fontSize: 14 }}>Faturação</h2></div>
              <div style={{ padding: '4px 18px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--s-line)', fontSize: 11 }}><span style={{ color: 'var(--s-muted)' }}>Plano</span><strong>{planCode}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--s-line)', fontSize: 11 }}><span style={{ color: 'var(--s-muted)' }}>Colaboradores</span><strong>{kpis.active}{maxEmployees ? ` / ${maxEmployees}` : ''}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontSize: 11 }}><span style={{ color: 'var(--s-muted)' }}>Próxima renovação</span><strong>{nextRenewal}</strong></div>
                <button type="button" className="suite-btn" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} onClick={onOpenBilling}><CreditCard size={13} /> Gerir subscrição</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
