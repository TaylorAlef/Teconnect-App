import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Users,
  Activity,
  AlarmClock,
  ListChecks,
  Clock3,
  ShieldAlert,
  FileWarning,
  CalendarClock,
  PlugZap,
  Star,
  CreditCard,
  RefreshCw,
  Search,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { useRealtimeCompany } from './hooks/useRealtimeCompany.js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
);

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const COMPANY_TZ = 'Europe/Lisbon';

// Data/hora sempre calculadas no fuso da empresa, não no fuso do dispositivo:
// perto da meia-noite ou com o relógio do browser mal configurado, uma data
// "de hoje" ingénua (new Date().toISOString().slice(0,10)) já mostrou o dia
// errado no dashboard principal.
function lisbonToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: COMPANY_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function lisbonDaysOffset(days) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: COMPANY_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() - days * 86400000));
}
function lisbonHour() {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: COMPANY_TZ, hour: '2-digit', hour12: false }).format(new Date()));
}
function lisbonTime(value) {
  return value ? new Intl.DateTimeFormat('pt-PT', { timeZone: COMPANY_TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
}

function greeting() {
  const hour = lisbonHour();
  if (hour < 12) return 'Bom dia';
  if (hour < 19) return 'Boa tarde';
  return 'Boa noite';
}

function syncLabel(seconds) {
  if (seconds === null) return 'a sincronizar…';
  if (seconds < 5) return 'agora mesmo';
  if (seconds < 60) return `há ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  return `há ${Math.floor(minutes / 60)}h`;
}

export default function ProductionWorkspace({ profile, billing, onOpenAttendance, onOpenPanel, onOpenBilling, canOpen = () => true }) {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ active: 0, working: 0, late: 0, pending: 0, overtimeMinutes: 0, absentToday: 0 });
  const [actions, setActions] = useState([]);
  const [week, setWeek] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [onDuty, setOnDuty] = useState([]);
  const [absentToday, setAbsentToday] = useState([]);
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const companyId = profile?.company_id;
  const roleLabel = useMemo(() => ({
    SUPER_ADMIN: 'Super Admin',
    COMPANY_ADMIN: 'Admin da empresa',
    RH: 'RH',
    GESTOR: 'Gestor',
    SUPERVISOR: 'Supervisor',
  }[profile?.role] || profile?.role), [profile?.role]);

  const load = async (silent = false) => {
    if (!companyId) return;
    if (!silent) setLoading(true);

    const today = lisbonToday();
    const horizon30 = lisbonDaysOffset(-30);

    const [
      employeesResult,
      todayAttendanceResult,
      weekAttendanceResult,
      vacationsResult,
      overtimeResult,
      absencesResult,
      documentsResult,
      invitationsResult,
      integrationsResult,
    ] = await Promise.all([
      supabase.from('employees').select('id,full_name,employee_code,status').eq('company_id', companyId),
      supabase.from('attendance_days').select('employee_id,late_minutes,worked_minutes,status,first_clock_in,last_clock_out').eq('company_id', companyId).eq('work_date', today),
      supabase.from('attendance_days').select('work_date,late_minutes,worked_minutes,status').eq('company_id', companyId).gte('work_date', lisbonDaysOffset(6)).lte('work_date', today),
      supabase.from('vacation_requests').select('id,employee_id,status,start_date,end_date').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
      supabase.from('overtime_records').select('id,employee_id,status,minutes').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
      supabase.from('absences').select('id,employee_id,status,start_date,end_date').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
      supabase.from('employee_documents').select('id,employee_id,title,expires_at').eq('company_id', companyId).not('expires_at', 'is', null).lte('expires_at', horizon30).order('expires_at', { ascending: true }).limit(20),
      supabase.from('employee_invitations').select('id,employee_id,email,status,invited_at').eq('company_id', companyId).eq('status', 'SENT').order('invited_at', { ascending: true }).limit(10),
      supabase.from('integration_jobs').select('id,provider,status,last_error,created_at').eq('company_id', companyId).in('status', ['FAILED', 'ERROR']).order('created_at', { ascending: false }).limit(10),
    ]);

    const employees = employeesResult.data || [];
    const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
    const employeeById = new Map(employees.map((e) => [e.id, e]));

    const todayRows = todayAttendanceResult.data || [];
    const lateToday = todayRows.filter((r) => (r.late_minutes || 0) > 0).length;
    const onDutyRows = todayRows.filter((r) => r.first_clock_in && !r.last_clock_out);
    const workingNow = onDutyRows.length || todayRows.filter((r) => (r.worked_minutes || 0) > 0 && r.status !== 'CLOSED').length;

    setOnDuty(
      onDutyRows
        .map((r) => ({ id: r.employee_id, name: employeeById.get(r.employee_id)?.full_name || 'Colaborador', since: r.first_clock_in }))
        .sort((a, b) => new Date(b.since) - new Date(a.since))
        .slice(0, 6),
    );

    const vacationRows = vacationsResult.data || [];
    const absenceRows = absencesResult.data || [];
    const approvedVacationsToday = vacationRows.filter((v) => (v.status || '').toUpperCase() === 'APPROVED' && v.start_date <= today && v.end_date >= today);
    const approvedAbsencesToday = absenceRows.filter((a) => (a.status || '').toUpperCase() === 'APPROVED' && a.start_date <= today && a.end_date >= today);
    const absentList = [
      ...approvedVacationsToday.map((v) => ({ id: v.employee_id, reason: 'Férias' })),
      ...approvedAbsencesToday.map((a) => ({ id: a.employee_id, reason: 'Ausência' })),
    ].map((item) => ({ ...item, name: employeeById.get(item.id)?.full_name || 'Colaborador' })).slice(0, 8);
    setAbsentToday(absentList);

    const pendingVacations = vacationRows.filter((v) => (v.status || '').toUpperCase().includes('PEND'));
    const pendingOvertime = (overtimeResult.data || []).filter((o) => (o.status || '').toUpperCase().includes('PEND'));
    const pendingAbsences = absenceRows.filter((a) => (a.status || '').toUpperCase().includes('PEND'));
    const overtimeMinutesThisMonth = (overtimeResult.data || []).reduce((sum, o) => sum + (o.minutes || 0), 0);

    const documents = documentsResult.data || [];
    const invitations = invitationsResult.data || [];
    const failedIntegrations = integrationsResult.data || [];

    setKpis({
      active: activeEmployees.length,
      working: workingNow,
      late: lateToday,
      pending: pendingVacations.length + pendingOvertime.length + pendingAbsences.length,
      overtimeMinutes: overtimeMinutesThisMonth,
      absentToday: absentList.length,
    });

    // Centro de ação: cada item é uma decisão real, ordenada por urgência
    // (danger > warning > info), nunca um card decorativo.
    const nextActions = [];
    todayRows.filter((r) => (r.late_minutes || 0) >= 15).slice(0, 3).forEach((r) => {
      const emp = employeeById.get(r.employee_id);
      nextActions.push({
        tone: 'danger', icon: AlarmClock, category: 'Assiduidade',
        title: `${emp?.full_name || 'Colaborador'} — entrada ${r.late_minutes} min atrasada`,
        sub: 'Sem justificação registada até ao momento',
        action: 'Investigar', onClick: onOpenAttendance,
      });
    });
    const canReviewPeople = canOpen('people360');
    const canApprove = canOpen('approvals');
    const expiredDocs = canReviewPeople ? documents.filter((d) => d.expires_at < today) : [];
    const expiringDocs = canReviewPeople ? documents.filter((d) => d.expires_at >= today) : [];
    if (expiredDocs.length) {
      nextActions.push({
        tone: 'danger', icon: FileWarning, category: 'Documento',
        title: `${expiredDocs.length} documento(s) já expirado(s)`,
        sub: expiredDocs[0]?.title ? `Inclui "${expiredDocs[0].title}"` : 'Rever validade documental',
        action: 'Rever documentos', onClick: () => onOpenPanel?.('people360'),
      });
    }
    if (expiringDocs.length) {
      nextActions.push({
        tone: 'warning', icon: FileWarning, category: 'Documento',
        title: `${expiringDocs.length} documento(s) vencem nos próximos 30 dias`,
        sub: expiringDocs[0]?.title ? `Próximo: "${expiringDocs[0].title}"` : 'Rever validade documental',
        action: 'Rever documentos', onClick: () => onOpenPanel?.('people360'),
      });
    }
    if (canApprove && pendingOvertime.length) {
      nextActions.push({
        tone: 'warning', icon: Clock3, category: 'Horas extra',
        title: `${pendingOvertime.length} registo(s) de horas extra por aprovar`,
        sub: 'Aguardam decisão do RH ou gestor responsável',
        action: 'Validar', onClick: () => onOpenPanel?.('approvals'),
      });
    }
    if (canApprove && pendingVacations.length) {
      nextActions.push({
        tone: 'warning', icon: CalendarClock, category: 'Aprovação',
        title: `${pendingVacations.length} pedido(s) de férias pendentes`,
        sub: 'Colaboradores à espera de resposta',
        action: 'Aprovar', onClick: () => onOpenPanel?.('approvals'),
      });
    }
    if (canOpen('integrations') && failedIntegrations.length) {
      nextActions.push({
        tone: 'danger', icon: PlugZap, category: 'Integração',
        title: `${failedIntegrations.length} sincronização(ões) falharam`,
        sub: failedIntegrations[0]?.provider ? `Última falha: ${failedIntegrations[0].provider}` : 'Rever fila de integrações',
        action: 'Corrigir', onClick: () => onOpenPanel?.('integrations'),
      });
    }
    if (canApprove && pendingAbsences.length) {
      nextActions.push({
        tone: 'info', icon: CheckCircle2, category: 'Aprovação',
        title: `${pendingAbsences.length} ausência(s) por validar`,
        sub: 'Justificações submetidas pelos colaboradores',
        action: 'Rever', onClick: () => onOpenPanel?.('approvals'),
      });
    }
    if (canOpen('employee-access') && invitations.length) {
      nextActions.push({
        tone: 'info', icon: UserPlus, category: 'Acesso',
        title: `${invitations.length} colaborador(es) ainda não ativaram a conta`,
        sub: invitations[0]?.email ? `Convite pendente: ${invitations[0].email}` : 'Convites por aceitar',
        action: 'Gerir acessos', onClick: () => onOpenPanel?.('employee-access'),
      });
    }
    const toneRank = { danger: 0, warning: 1, info: 2 };
    nextActions.sort((a, b) => toneRank[a.tone] - toneRank[b.tone]);
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
      const date = lisbonDaysOffset(i);
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
    const timer = window.setInterval(() => load(true), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const { status: realtimeStatus } = useRealtimeCompany(supabase, companyId, () => load(true));

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!profile) return null;

  const planCode = billing?.plan_code || billing?.plan?.code || 'Sem plano ativo';
  const maxEmployees = billing?.max_employees;
  const nextRenewal = billing?.current_period_end
    ? new Date(billing.current_period_end).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
    : '—';
  const isLive = realtimeStatus === 'SUBSCRIBED';
  const syncSeconds = refreshedAt ? Math.max(0, Math.round((nowTick - refreshedAt.getTime()) / 1000)) : null;

  return <div className="suite-app" style={{ gridTemplateColumns: '1fr', minHeight: 'auto' }}>
    <div className="tc-cc-page">

      <div className="suite-hero-card" style={{ borderRadius: 24 }}>
        <div className="suite-page-intro" style={{ marginBottom: 0 }}>
          <div>
            <div className="suite-eyebrow">
              {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', timeZone: COMPANY_TZ })}
            </div>
            <h1 style={{ color: '#fff', fontSize: 26 }}>{greeting()}, {profile.full_name?.split(' ')[0] || roleLabel}.</h1>
            <p style={{ color: 'rgba(255,255,255,.65)', margin: '6px 0 0', maxWidth: '56ch', lineHeight: 1.55 }}>
              {loading
                ? 'A carregar o estado da empresa…'
                : kpis.active > 0
                  ? `${kpis.working} dos ${kpis.active} colaboradores já registaram entrada hoje. ${actions.length ? `Há ${actions.length} item(ns) que precisam da sua atenção.` : 'Sem pendências urgentes neste momento.'}`
                  : canOpen('employee-import')
                    ? 'Ainda não há colaboradores ativos. Adicione a equipa para começar a acompanhar presença, atrasos e aprovações.'
                    : 'Ainda não há colaboradores atribuídos à sua equipa.'}
            </p>
            {!loading && kpis.active === 0 && canOpen('employee-import') && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button type="button" className="suite-btn primary" onClick={() => onOpenPanel?.('employee-import')}><UserPlus size={13} /> Importar colaboradores</button>
                {canOpen('setup') && <button type="button" className="suite-btn" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.2)', background: 'rgba(255,255,255,.08)' }} onClick={() => onOpenPanel?.('setup')}><CalendarClock size={13} /> Configurar locais e turnos</button>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <div className="suite-live" style={!isLive ? { background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.18)', color: 'rgba(255,255,255,.68)' } : undefined}>
              <span style={!isLive ? { background: 'rgba(255,255,255,.4)', animation: 'none' } : undefined} />
              {isLive ? 'Sistema operacional' : 'A ligar…'}
            </div>
            <button type="button" className="suite-btn" onClick={() => load()} title="Atualizar" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.2)', background: 'rgba(255,255,255,.08)' }}>
              <RefreshCw size={13} />
              Atualizado {syncLabel(syncSeconds)}
            </button>
          </div>
        </div>

        <button type="button" className="tc-cc-search" onClick={() => window.dispatchEvent(new CustomEvent('teconnect:open-command-palette'))}>
          <Search size={13} />
          <span>Pesquisar pessoas, pedidos, documentos, tarefas…</span>
          <kbd>Ctrl K</kbd>
        </button>

        <div className="suite-kpis">
          <div className="suite-kpi"><div className="suite-kpi-top"><span>Colaboradores ativos</span><Users size={14} /></div><strong>{kpis.active}</strong></div>
          <div className="suite-kpi"><div className="suite-kpi-top"><span>A trabalhar agora</span><Activity size={14} /></div><strong>{kpis.working}</strong></div>
          <div className="suite-kpi"><div className="suite-kpi-top"><span>Atrasos hoje</span><AlarmClock size={14} /></div><strong>{kpis.late}</strong></div>
          <div className="suite-kpi"><div className="suite-kpi-top"><span>Ausências hoje</span><CalendarClock size={14} /></div><strong>{kpis.absentToday}</strong></div>
          <div className="suite-kpi"><div className="suite-kpi-top"><span>Pendências</span><ListChecks size={14} /></div><strong>{kpis.pending}</strong></div>
          <div className="suite-kpi"><div className="suite-kpi-top"><span>Horas extra</span><Clock3 size={14} /></div><strong>{Math.round(kpis.overtimeMinutes / 60)}h</strong></div>
        </div>
      </div>

      <div className="suite-card" style={{ marginTop: 16 }}>
        <div className="suite-panel-head" style={{ padding: '16px 18px 0' }}>
          <div>
            <h2 style={{ fontSize: 14 }}>O que merece atenção agora</h2>
            <span>Ordenado por urgência e impacto</span>
          </div>
          <span className="suite-badge">{actions.length} itens</span>
        </div>
        <div className="suite-alert-stack" style={{ padding: '12px 18px 18px' }}>
          {loading && <div style={{ color: 'var(--s-muted)', padding: '18px 0' }}>A carregar…</div>}
          {!loading && actions.length === 0 && (
            <div className="suite-empty" style={{ minHeight: 130 }}>
              <CheckCircle2 size={22} style={{ color: 'var(--s-green)' }} />
              <strong>Sem pendências neste momento</strong>
              <span>A operação está em dia. Bom trabalho.</span>
            </div>
          )}
          {!loading && actions.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="suite-alert-row">
                <div className={`suite-alert-icon ${item.tone}`}><Icon size={16} /></div>
                <div className="suite-row-main">
                  <span className={`suite-badge ${item.tone}`} style={{ marginBottom: 4 }}>{item.category}</span>
                  <strong style={{ display: 'block', fontSize: 11.5, fontWeight: 700 }}>{item.title}</strong>
                  <span>{item.sub}</span>
                </div>
                <button type="button" className="suite-btn" onClick={item.onClick}>{item.action}</button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="tc-cc-grid">
        <div style={{ display: 'grid', gap: 16 }}>

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

          <div className="suite-card">
            <div className="suite-panel-head" style={{ padding: '16px 18px 0' }}><h2 style={{ fontSize: 14 }}>Atalhos</h2></div>
            <div className="suite-actions" style={{ padding: '10px 18px 18px' }}>
              <button type="button" className="suite-btn" onClick={onOpenAttendance}><Clock3 size={13} /> Ponto</button>
              {canOpen('approvals') && <button type="button" className="suite-btn" onClick={() => onOpenPanel?.('approvals')}><CheckCircle2 size={13} /> Aprovações</button>}
              {canOpen('audit') && <button type="button" className="suite-btn" onClick={() => onOpenPanel?.('audit')}><ShieldAlert size={13} /> Auditoria</button>}
              {canOpen('rules') && <button type="button" className="suite-btn" onClick={() => onOpenPanel?.('rules')}><FileWarning size={13} /> Regras</button>}
              {canOpen('setup') && <button type="button" className="suite-btn" onClick={() => onOpenPanel?.('setup')}><CalendarClock size={13} /> Setup</button>}
              {canOpen('integrations') && <button type="button" className="suite-btn" onClick={() => onOpenPanel?.('integrations')}><PlugZap size={13} /> Integrações</button>}
            </div>
          </div>

        </div>

        <div style={{ display: 'grid', gap: 16 }}>

          <div className="suite-card">
            <div className="suite-panel-head" style={{ padding: '16px 18px 0' }}>
              <h2 style={{ fontSize: 14 }}>Quem está a trabalhar agora</h2>
              <span className="suite-badge positive">{kpis.working}</span>
            </div>
            <div style={{ padding: '4px 18px 14px' }}>
              {onDuty.length === 0 && <div style={{ color: 'var(--s-muted)', fontSize: 10.5, padding: '10px 0' }}>Ninguém com entrada ativa neste momento.</div>}
              {onDuty.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  disabled={!canOpen('people360')}
                  onClick={() => onOpenPanel?.('people360', person.id)}
                  style={{ all: 'unset', boxSizing: 'border-box', cursor: canOpen('people360') ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--s-line)', width: '100%' }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--s-green)', flex: '0 0 auto' }} />
                  <div className="suite-avatar small">{initials(person.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--s-muted)' }}>Entrada {lisbonTime(person.since)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="suite-card">
            <div className="suite-panel-head" style={{ padding: '16px 18px 0' }}><h2 style={{ fontSize: 14 }}>Ausentes hoje</h2></div>
            <div style={{ padding: '4px 18px 14px' }}>
              {absentToday.length === 0 && <div style={{ color: 'var(--s-muted)', fontSize: 10.5, padding: '10px 0' }}>Ninguém em férias ou ausência hoje.</div>}
              {absentToday.map((person, index) => (
                <div key={`${person.id}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--s-line)' }}>
                  <div className="suite-avatar small">{initials(person.name)}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.name}</div>
                  <span className="suite-badge">{person.reason}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="suite-card">
            <div className="suite-panel-head" style={{ padding: '16px 18px 0' }}><h2 style={{ fontSize: 14 }}>Colaboradores em destaque</h2></div>
            <div style={{ padding: '4px 18px 14px' }}>
              {highlights.length === 0 && <div style={{ color: 'var(--s-muted)', fontSize: 10.5, padding: '10px 0' }}>Ainda sem dados suficientes esta semana.</div>}
              {highlights.map((h) => (
                <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--s-line)' }}>
                  <div className="suite-avatar small">{initials(h.name)}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, flex: 1, minWidth: 0 }}>{h.name}</div>
                  <span className="suite-badge positive"><Star size={10} style={{ marginRight: 4 }} />{h.days}d</span>
                </div>
              ))}
            </div>
          </div>

          {canOpen('billing') && <div className="suite-card">
            <div className="suite-panel-head" style={{ padding: '16px 18px 0' }}><h2 style={{ fontSize: 14 }}>Faturação</h2></div>
            <div style={{ padding: '4px 18px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--s-line)', fontSize: 11 }}><span style={{ color: 'var(--s-muted)' }}>Plano</span><strong>{planCode}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--s-line)', fontSize: 11 }}><span style={{ color: 'var(--s-muted)' }}>Colaboradores</span><strong>{kpis.active}{maxEmployees ? ` / ${maxEmployees}` : ''}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontSize: 11 }}><span style={{ color: 'var(--s-muted)' }}>Próxima renovação</span><strong>{nextRenewal}</strong></div>
              <button type="button" className="suite-btn" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} onClick={onOpenBilling}><CreditCard size={13} /> Gerir subscrição</button>
            </div>
          </div>}

        </div>
      </div>
    </div>
  </div>;
}
