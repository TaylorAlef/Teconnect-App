import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Bell, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, LayoutDashboard, LogOut, MapPin, Menu, Moon, Plus, RefreshCw, ShieldCheck, Sparkles, Sun, Target, Users, X, Zap } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useRealtimeCompany } from './hooks/useRealtimeCompany';
import { explainGeofenceError, getCurrentPosition, isInsideGeofence } from './lib/geofence';
import { validateAttendancePunch } from './lib/validation';
import './teconnect.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

const pages = [
  ['overview', 'Visão geral', LayoutDashboard],
  ['people', 'Pessoas', Users],
  ['attendance', 'Ponto & Geofence', Clock3],
  ['tasks', 'Tarefas RH', CheckCircle2],
  ['alerts', 'Alertas', AlertTriangle],
  ['payroll', 'Folha', CalendarDays],
  ['shifts', 'Turnos', Target],
  ['integrations', 'Integrações', Zap],
];

const money = (cents = 0) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(cents || 0) / 100);
const minutes = (value = 0) => `${Math.floor(Number(value || 0) / 60)}h ${Number(value || 0) % 60}m`;
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || 'TC';

const withTimeout = (promise, ms = 12000, label = 'operação') => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`Tempo limite excedido: ${label}`)), ms)),
]);

async function rpc(name, args = {}, timeout = 12000) {
  const { data, error } = await withTimeout(supabase.rpc(name, args), timeout, name);
  if (error) throw error;
  return data;
}

function useAppData(profile) {
  const [state, setState] = useState({ employees: [], dashboard: null, approvals: [], anomalies: [], alerts: [], tasks: [], payrollRuns: [], locations: [], shifts: [], assignments: [], loading: true, error: null });

  const load = useCallback(async (silent = false) => {
    if (!profile?.company_id) return;
    setState((s) => ({ ...s, loading: silent ? s.loading : true, error: null }));
    try {
      const today = new Date().toISOString().slice(0, 10);
      const queries = [
        ['employees', withTimeout(supabase.from('employees').select('id,employee_code,full_name,email,phone,hire_date,status').eq('company_id', profile.company_id).order('full_name').limit(1000), 12000, 'colaboradores')],
        ['dashboard', rpc('get_dashboard_summary', { p_work_date: today })],
        ['vacations', withTimeout(supabase.from('vacation_requests').select('id,employee_id,start_date,end_date,days,reason,status,created_at').eq('company_id', profile.company_id).eq('status', 'PENDING').order('created_at', { ascending: false }).limit(20), 12000, 'férias')],
        ['overtime', withTimeout(supabase.from('overtime_records').select('id,employee_id,minutes,reason,status,created_at').eq('company_id', profile.company_id).eq('status', 'PENDING').order('created_at', { ascending: false }).limit(20), 12000, 'horas extra')],
        ['adjustments', withTimeout(supabase.from('timesheet_adjustments').select('id,employee_id,work_date,reason,status,created_at').eq('company_id', profile.company_id).eq('status', 'PENDING').order('created_at', { ascending: false }).limit(20), 12000, 'ajustes')],
        ['absences', withTimeout(supabase.from('absences').select('id,employee_id,start_date,end_date,reason,status,created_at').eq('company_id', profile.company_id).eq('status', 'PENDING').order('created_at', { ascending: false }).limit(20), 12000, 'ausências')],
        ['anomalies', withTimeout(supabase.from('attendance_days').select('id,employee_id,work_date,status,late_minutes,early_leave_minutes,overtime_minutes,night_minutes,worked_minutes').eq('company_id', profile.company_id).order('work_date', { ascending: false }).limit(100), 12000, 'assiduidade')],
        ['alerts', withTimeout(supabase.from('hr_alerts').select('id,alert_type,severity,status,title,message,employee_id,score,due_at,created_at').eq('company_id', profile.company_id).in('status', ['OPEN', 'ACKNOWLEDGED']).order('created_at', { ascending: false }).limit(50), 12000, 'alertas')],
        ['tasks', withTimeout(supabase.from('hr_tasks').select('id,title,description,status,priority,category,assignee_id,employee_id,due_at,completed_at,created_at,updated_at').eq('company_id', profile.company_id).order('due_at', { ascending: true, nullsFirst: false }).limit(200), 12000, 'tarefas')],
        ['payrollRuns', withTimeout(supabase.from('payroll_runs').select('id,period_year,period_month,status,employee_count,gross_cents,overtime_cents,night_cents,absence_cents,net_cents,updated_at').eq('company_id', profile.company_id).order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(12), 12000, 'folha')],
        ['locations', withTimeout(supabase.from('work_locations').select('id,name,address,latitude,longitude,gps_radius_m,active').eq('company_id', profile.company_id).eq('active', true).order('name'), 12000, 'locais')],
        ['shifts', withTimeout(supabase.from('shifts').select('id,name,start_time,end_time,break_minutes,tolerance_minutes,night_shift,work_days,rotation_code,active').eq('company_id', profile.company_id).eq('active', true).order('start_time'), 12000, 'turnos')],
        ['assignments', withTimeout(supabase.from('shift_assignments').select('id,employee_id,shift_id,start_date,end_date').eq('company_id', profile.company_id).order('start_date', { ascending: false }).limit(300), 12000, 'atribuições')],
      ];
      const settled = await Promise.allSettled(queries.map(([, promise]) => promise));
      const data = {};
      const failures = [];
      settled.forEach((result, index) => {
        const key = queries[index][0];
        if (result.status === 'fulfilled') {
          const value = result.value;
          if (value?.error) {
            failures.push(`${key}: ${value.error.message || 'erro'}`);
            data[key] = { data: null, error: value.error };
          } else data[key] = value;
        } else {
          failures.push(`${key}: ${result.reason?.message || 'tempo limite'}`);
          data[key] = { data: null, error: result.reason };
        }
      });

      const employees = data.employees || { data: [] };
      const dashboard = data.dashboard?.data ?? null;
      const vacations = data.vacations || { data: [] };
      const overtime = data.overtime || { data: [] };
      const adjustments = data.adjustments || { data: [] };
      const absences = data.absences || { data: [] };
      const anomalies = data.anomalies || { data: [] };
      const alerts = data.alerts || { data: [] };
      const tasks = data.tasks || { data: [] };
      const payrollRuns = data.payrollRuns || { data: [] };
      const locations = data.locations || { data: [] };
      const shifts = data.shifts || { data: [] };
      const assignments = data.assignments || { data: [] };

      const empMap = new Map((employees.data || []).map((e) => [e.id, e]));
      const approvals = [
        ...(vacations.data || []).map((r) => ({ ...r, kind: 'vacation', label: 'Férias', employee: empMap.get(r.employee_id)?.full_name || 'Colaborador', meta: `${r.start_date} → ${r.end_date} · ${r.days} dias` })),
        ...(overtime.data || []).map((r) => ({ ...r, kind: 'overtime', label: 'Horas extra', employee: empMap.get(r.employee_id)?.full_name || 'Colaborador', meta: `${minutes(r.minutes)} · ${r.reason || 'Sem observação'}` })),
        ...(adjustments.data || []).map((r) => ({ ...r, kind: 'adjustment', label: 'Ajuste de ponto', employee: empMap.get(r.employee_id)?.full_name || 'Colaborador', meta: `${r.work_date} · ${r.reason || 'Sem observação'}` })),
        ...(absences.data || []).map((r) => ({ ...r, kind: 'absence', label: 'Ausência', employee: empMap.get(r.employee_id)?.full_name || 'Colaborador', meta: `${r.start_date} → ${r.end_date} · ${r.reason || 'Sem motivo'}` })),
      ];

      setState({ employees: employees.data || [], dashboard: Array.isArray(dashboard) ? dashboard[0] : dashboard, approvals, anomalies: anomalies.data || [], alerts: alerts.data || [], tasks: tasks.data || [], payrollRuns: payrollRuns.data || [], locations: locations.data || [], shifts: shifts.data || [], assignments: assignments.data || [], loading: false, error: failures.length ? `Alguns módulos não responderam a tempo. O painel continua disponível. ${failures[0]}` : null });
    } catch (error) {
      console.error(error);
      setState((s) => ({ ...s, loading: false, error: 'Não foi possível sincronizar os dados da organização. O painel foi liberado para evitar bloqueio.' }));
    }
  }, [profile?.company_id]);

  useEffect(() => { load(); }, [load]);
  return { state, load };
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [page, setPage] = useState('overview');
  const [theme, setTheme] = useState(() => localStorage.getItem('teconnect-theme') || 'dark');
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState(null);
  const [command, setCommand] = useState(false);
  const { state, load } = useAppData(profile);

  const notify = useCallback((message, kind = 'ok') => {
    setToast({ message, kind });
    window.clearTimeout(window.__teconnectToast);
    window.__teconnectToast = window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('teconnect-theme', theme); }, [theme]);
  useEffect(() => {
    let active = true;
    withTimeout(supabase.auth.getSession(), 10000, 'sessão').then(({ data }) => { if (active) setSession(data.session); }).catch((e) => { console.error(e); if (active) setProfileError('Não foi possível validar a sessão. Atualize a página e tente novamente.'); }).finally(() => { if (active) setAuthLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); if (!nextSession) setProfile(null); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!session) { setProfile(null); return; }
    setProfileError(null);
    rpc('get_my_profile', {}, 10000).then((data) => { const nextProfile = Array.isArray(data) ? data[0] : data; if (!nextProfile?.company_id) throw new Error('Perfil autenticado sem empresa associada.'); setProfile(nextProfile); }).catch((e) => { console.error(e); setProfile(null); setProfileError(e.message || 'Não foi possível carregar o perfil da organização.'); });
  }, [session]);

  const realtime = useRealtimeCompany(supabase, profile?.company_id, useCallback(({ table }) => {
    const critical = ['time_entries', 'attendance_days', 'vacation_requests', 'overtime_records', 'timesheet_adjustments', 'absences', 'hr_alerts', 'hr_tasks', 'hr_task_audit', 'payroll_runs', 'payroll_items', 'notifications', 'picagens'];
    if (critical.includes(table)) load(true).catch(console.error);
  }, [load]));

  const activeEmployees = state.dashboard?.active_employees ?? state.employees.filter((e) => e.status === 'ACTIVE').length;
  const attendanceRate = Number(state.dashboard?.attendance_rate ?? 0);
  const operationalRisk = Number(state.dashboard?.risk_operational ?? 0);

  const approve = async (item, accepted) => {
    try {
      if (item.kind === 'vacation') await rpc('approve_vacation_request', { p_request_id: item.id, p_approve: accepted });
      else if (item.kind === 'overtime') await rpc('approve_overtime_record', { p_record_id: item.id, p_approve: accepted });
      else if (item.kind === 'absence') { const { error } = await supabase.from('absences').update({ status: accepted ? 'APPROVED' : 'REJECTED', approved_by: profile.user_id, approved_at: new Date().toISOString() }).eq('id', item.id).eq('company_id', profile.company_id); if (error) throw error; }
      else { const { error } = await supabase.from('timesheet_adjustments').update({ status: accepted ? 'APPROVED' : 'REJECTED', approved_by: profile.user_id }).eq('id', item.id).eq('company_id', profile.company_id); if (error) throw error; }
      notify(accepted ? 'Pedido aprovado.' : 'Pedido rejeitado.'); await load(true);
    } catch (e) { console.error(e); notify('Não foi possível concluir a decisão.', 'error'); }
  };

  const signOut = async () => { await supabase.auth.signOut(); setProfile(null); notify('Sessão terminada.'); };
  if (authLoading) return <Loading label="A validar a sessão…" />;
  if (!session) return <Login onSuccess={setSession} />;
  if (profileError && !profile) return <ProfileError message={profileError} onRetry={() => window.location.reload()} onSignOut={signOut} />;
  if (!profile) return <Loading label="A carregar o perfil da organização…" />;
  if (state.loading) return <Loading label="A sincronizar o Teconnect…" />;

  return <div className="tc-shell">
    <aside className={`tc-side ${mobileNav ? 'open' : ''}`}>
      <div className="tc-brand"><div className="tc-brand-mark">T</div><div><strong>Teconnect</strong><span>People OS</span></div></div>
      <div className="tc-company"><div className="tc-avatar">{initials(profile.full_name)}</div><div className="tc-company-text"><strong>{profile.full_name || 'Utilizador'}</strong><span>{profile.role || 'Utilizador'}</span></div><ChevronRight size={15} className="tc-muted" /></div>
      <nav className="tc-nav">{pages.map(([id, label, Icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => { setPage(id); setMobileNav(false); }}><Icon size={17} /><span>{label}</span>{id === 'alerts' && state.alerts.length > 0 && <span className="tc-muted">{state.alerts.length}</span>}</button>)}</nav>
      <div className="tc-bottom"><button className="tc-nav" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><span>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</span><span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span></button><button className="tc-nav" onClick={signOut}><span><LogOut size={17} /></span><span>Terminar sessão</span></button><div className="tc-pill"><span className="tc-dot" /> Realtime {realtime.status === 'SUBSCRIBED' ? 'ligado' : 'a ligar'}</div></div>
    </aside>
    <main className="tc-main">
      <header className="tc-top"><button className="tc-btn ghost" onClick={() => setMobileNav((v) => !v)}><Menu size={17} /></button><div className="tc-top-left"><span>Teconnect</span><ChevronRight size={14} /><strong>{pages.find(([id]) => id === page)?.[1]}</strong></div><div className="tc-top-right"><button className="tc-btn ghost" onClick={() => setCommand(true)}>Pesquisar <kbd>⌘K</kbd></button><div className="tc-avatar">{initials(profile.full_name)}</div></div></header>
      <div className="tc-content">
        {state.error && <div className="tc-error" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', gap: 10 }}><span>{state.error}</span><button className="tc-btn tc-small" onClick={() => load()}>Tentar novamente</button></div>}
        {page === 'overview' && <Overview dashboard={state.dashboard} activeEmployees={activeEmployees} attendanceRate={attendanceRate} risk={operationalRisk} approvals={state.approvals} alerts={state.alerts} tasks={state.tasks} onApprove={approve} onNavigate={setPage} onRefresh={() => load()} />}
        {page === 'people' && <People employees={state.employees} />}
        {page === 'attendance' && <Attendance locations={state.locations} notify={notify} anomalies={state.anomalies} />}
        {page === 'tasks' && <Tasks tasks={state.tasks} employees={state.employees} companyId={profile.company_id} userId={profile.user_id} notify={notify} onReload={() => load(true)} />}
        {page === 'alerts' && <Alerts alerts={state.alerts} employees={state.employees} />}
        {page === 'payroll' && <Payroll runs={state.payrollRuns} />}
        {page === 'shifts' && <Shifts shifts={state.shifts} assignments={state.assignments} employees={state.employees} />}
        {page === 'integrations' && <Integrations />}
      </div>
    </main>
    {command && <CommandPalette onClose={() => setCommand(false)} onNavigate={(next) => { setPage(next); setCommand(false); }} />}
    {toast && <div className={`tc-pill ${toast.kind === 'error' ? 'tc-no' : 'tc-ok'}`} style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 20, padding: '11px 14px' }}>{toast.kind === 'error' ? <AlertTriangle size={15} /> : <Check size={15} />}{toast.message}</div>}
  </div>;
}

function Login({ onSuccess }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setError(''); try { const { data, error: authError } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 10000, 'login'); if (authError) setError(authError.message || 'Credenciais inválidas.'); else onSuccess(data.session); } catch (e) { setError(e.message || 'Não foi possível concluir o login.'); } finally { setBusy(false); } };
  return <div className="tc-login"><div className="tc-card tc-login-card"><div className="tc-brand"><div className="tc-brand-mark">T</div><div><strong>Teconnect</strong><span>People OS</span></div></div><h1 style={{ fontSize: 25, margin: '22px 0 7px' }}>Acesso corporativo</h1><p className="tc-muted" style={{ lineHeight: 1.6 }}>Entre para gerir pessoas, ponto, turnos, tarefas, alertas e operações de RH.</p>{error && <div className="tc-error" style={{ marginBottom: 12 }}>{error}</div>}<form className="tc-form" onSubmit={submit}><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label><label>Palavra-passe<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label><button className="tc-btn primary" disabled={busy}>{busy ? 'A entrar…' : 'Entrar'}</button></form></div></div>;
}

function Loading({ label = 'A sincronizar o Teconnect…' }) { return <div className="tc-loading"><div><div className="tc-brand-mark" style={{ margin: '0 auto 12px' }}>T</div><strong>{label}</strong></div></div>; }
function ProfileError({ message, onRetry, onSignOut }) { return <div className="tc-loading"><div className="tc-card" style={{ padding: 24, maxWidth: 460 }}><div className="tc-brand-mark" style={{ margin: '0 auto 12px' }}>T</div><strong>Não foi possível carregar a organização</strong><p className="tc-muted" style={{ marginTop: 10, lineHeight: 1.5 }}>{message}</p><div className="tc-actions" style={{ justifyContent: 'center', marginTop: 16 }}><button className="tc-btn primary" onClick={onRetry}>Tentar novamente</button><button className="tc-btn" onClick={onSignOut}>Terminar sessão</button></div></div></div>; }

function Overview({ dashboard, activeEmployees, attendanceRate, risk, approvals, alerts, tasks, onApprove, onNavigate, onRefresh }) {
  const stats = [['Headcount ativo', activeEmployees, Users, 'colaboradores'], ['Assiduidade', `${attendanceRate.toFixed(1)}%`, Clock3, 'hoje'], ['Horas extra', minutes(dashboard?.overtime_minutes_week), Zap, 'últimos 7 dias'], ['Horas noturnas', minutes(dashboard?.night_minutes_week), Moon, 'últimos 7 dias'], ['Férias disponíveis', Number(dashboard?.vacation_days_available || 0).toFixed(1), CalendarDays, 'saldo global'], ['Risco operacional', `${risk.toFixed(0)}/100`, AlertTriangle, risk >= 70 ? 'atenção imediata' : 'controlado']];
  return <><section className="tc-hero"><div><div className="tc-eyebrow"><Sparkles size={13} /> Executive People Command</div><h1>Painel executivo</h1><p>Operação de RH em tempo real, com decisões e sinais críticos no mesmo fluxo.</p></div><div className="tc-actions"><button className="tc-btn" onClick={onRefresh}><RefreshCw size={15} /> Sincronizar</button><button className="tc-btn primary" onClick={() => onNavigate('tasks')}><Plus size={15} /> Nova tarefa</button></div></section><div className="tc-grid-6">{stats.map(([label, value, Icon, foot]) => <div className="tc-card tc-kpi" key={label}><div className="tc-kpi-top"><span>{label}</span><Icon size={15} /></div><div className="tc-kpi-value">{value}</div><div className="tc-kpi-foot">{foot}</div></div>)}</div><div className="tc-two tc-section"><section className="tc-card tc-card-pad"><div className="tc-section-head"><div><h2>Decisões pendentes</h2><span>{approvals.length} itens</span></div><button className="tc-btn tc-small" onClick={() => onNavigate('alerts')}>Alertas <ArrowRight size={13} /></button></div>{approvals.length === 0 ? <div className="tc-empty">A fila está limpa.</div> : <div className="tc-list">{approvals.slice(0, 8).map((item) => <div className="tc-row" key={`${item.kind}-${item.id}`}><div className="tc-row-main"><div className="tc-row-title">{item.employee} · {item.label}</div><div className="tc-row-sub">{item.meta}</div></div><div className="tc-actions"><button className="tc-btn tc-small" onClick={() => onApprove(item, false)}>Rejeitar</button><button className="tc-btn primary tc-small" onClick={() => onApprove(item, true)}><Check size={13} /> Aprovar</button></div></div>)}</div>}</section><section className="tc-card tc-card-pad"><div className="tc-section-head"><div><h2>Alertas preditivos</h2><span>{alerts.length} abertos</span></div><button className="tc-btn tc-small" onClick={() => onNavigate('alerts')}>Ver todos</button></div>{alerts.length === 0 ? <div className="tc-empty">Sem alertas críticos neste momento.</div> : alerts.slice(0, 6).map((a) => <div className="tc-alert" key={a.id}><div><div className="tc-alert-title">{a.title}</div><div className="tc-alert-msg">{a.message}</div></div><span className={`tc-badge ${String(a.severity).toLowerCase()}`}>{a.severity}</span></div>)}</section></div><div className="tc-section"><div className="tc-section-head"><div><h2>Fila de tarefas RH</h2><span>{tasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED').length} abertas</span></div><button className="tc-btn tc-small" onClick={() => onNavigate('tasks')}>Abrir kanban <ArrowRight size={13} /></button></div></div></>;
}
function People({ employees }) { return <><section className="tc-hero"><div><div className="tc-eyebrow"><Users size={13} /> Pessoas</div><h1>Colaboradores</h1><p>Base operacional ligada diretamente ao tenant Supabase.</p></div></section><section className="tc-card tc-card-pad"><table className="tc-table"><thead><tr><th>Colaborador</th><th>Código</th><th>Email</th><th>Admissão</th><th>Estado</th></tr></thead><tbody>{employees.map((e) => <tr key={e.id}><td>{e.full_name}</td><td>{e.employee_code}</td><td>{e.email || '—'}</td><td>{e.hire_date || '—'}</td><td><span className="tc-badge low">{e.status}</span></td></tr>)}</tbody></table>{employees.length === 0 && <div className="tc-empty">Ainda não existem colaboradores neste tenant.</div>}</section></>; }
function Attendance({ locations, anomalies, notify }) {
  const [selected, setSelected] = useState(locations[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);
  const [clockState, setClockState] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [weekAttendance, setWeekAttendance] = useState([]);
  const location = locations.find((l) => l.id === selected);

  const refreshClock = useCallback(async () => {
    try {
      const state = await rpc('get_my_clock_state', {}, 10000);
      const nextState = Array.isArray(state) ? state[0] : state;
      setClockState(nextState || null);
      const today = await rpc('get_my_today_attendance', {}, 10000);
      const nextToday = Array.isArray(today) ? today[0] : today;
      setTodayAttendance(nextToday || null);

      if (nextState?.employee?.id) {
        const from = new Date();
        from.setHours(0, 0, 0, 0);
        from.setDate(from.getDate() - 6);
        const { data, error } = await withTimeout(
          supabase
            .from('attendance_days')
            .select('work_date,worked_minutes,overtime_minutes,late_minutes,early_leave_minutes,status')
            .eq('employee_id', nextState.employee.id)
            .gte('work_date', from.toISOString().slice(0, 10))
            .order('work_date', { ascending: true }),
          10000,
          'assiduidade semanal'
        );
        if (!error) setWeekAttendance(data || []);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (!selected && locations[0]) setSelected(locations[0].id);
  }, [locations, selected]);

  useEffect(() => {
    refreshClock();
  }, [refreshClock]);

  const punch = async (eventType) => {
    if (!location) {
      notify('Cadastre uma instalação com coordenadas GPS antes de marcar o ponto.', 'error');
      return;
    }
    setBusy(true);
    try {
      const position = await getCurrentPosition();
      const validation = isInsideGeofence(position, location);
      if (!validation.ok) {
        notify(`Picagem bloqueada: ${Math.round(validation.distance || 0)} m do local; raio ${validation.radius} m.`, 'error');
        setLast({ ok: false, ...validation });
        return;
      }

      const { latitude, longitude, accuracy } = position.coords;
      const parsed = validateAttendancePunch({
        eventType,
        workLocationId: location.id,
        latitude,
        longitude,
        gpsAccuracy: accuracy,
        device: navigator.userAgent.slice(0, 160),
      });
      if (!parsed.ok) {
        notify(parsed.error, 'error');
        return;
      }

      const result = await rpc('register_time_entry', {
        p_event_type: parsed.data.eventType,
        p_work_location_id: parsed.data.workLocationId,
        p_latitude: parsed.data.latitude,
        p_longitude: parsed.data.longitude,
        p_gps_accuracy: parsed.data.gpsAccuracy,
        p_device: parsed.data.device,
      });
      setLast({ ok: true, distance: validation.distance, result });
      notify({
        CLOCK_IN: 'Entrada registada.',
        BREAK_START: 'Pausa registada.',
        BREAK_END: 'Retorno registado.',
        CLOCK_OUT: 'Saída registada.',
      }[eventType] + ' Validação GPS concluída.');
      await refreshClock();
    } catch (error) {
      console.error(error);
      notify(explainGeofenceError(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const state = clockState?.state || 'OFF';
  const allowed = {
    CLOCK_IN: state === 'OFF',
    BREAK_START: state === 'WORKING',
    BREAK_END: state === 'ON_BREAK',
    CLOCK_OUT: state === 'WORKING' || state === 'ON_BREAK',
  };

  const workedToday = Number(todayAttendance?.worked_minutes ?? clockState?.attendance?.worked_minutes ?? 0);
  const overtimeToday = Number(todayAttendance?.overtime_minutes ?? clockState?.attendance?.overtime_minutes ?? 0);
  const weeklyWorked = weekAttendance.reduce((sum, row) => sum + Number(row.worked_minutes || 0), 0);
  const weeklyOvertime = weekAttendance.reduce((sum, row) => sum + Number(row.overtime_minutes || 0), 0);

  return <>
    <section className="tc-hero">
      <div>
        <div className="tc-eyebrow"><MapPin size={13} /> Ponto & Geofence</div>
        <h1>Assiduidade operacional</h1>
        <p>Entrada, pausa, retorno e saída com validação GPS no dispositivo e no PostgreSQL.</p>
      </div>
    </section>

    <div className="tc-clock">
      <section className="tc-card tc-clock-card">
        <label className="tc-form">Instalação
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name} · {l.gps_radius_m} m</option>)}
          </select>
        </label>
        <div className="tc-clock-value">{new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="tc-clock-state">
          <span className={`tc-badge ${state === 'WORKING' ? 'low' : state === 'ON_BREAK' ? 'medium' : 'high'}`}>
            {state === 'WORKING' ? 'A trabalhar' : state === 'ON_BREAK' ? 'Em pausa' : state === 'OFF' ? 'Fora de serviço' : 'Indisponível'}
          </span>
          {clockState?.employee?.name && <span className="tc-muted">{clockState.employee.name}</span>}
        </div>
        <div className="tc-actions tc-clock-actions">
          <button className="tc-btn primary tc-clock-action" disabled={busy || !allowed.CLOCK_IN} onClick={() => punch('CLOCK_IN')}><CheckCircle2 size={17} /> Entrada</button>
          <button className="tc-btn tc-clock-action" disabled={busy || !allowed.BREAK_START} onClick={() => punch('BREAK_START')}><Moon size={17} /> Pausa</button>
          <button className="tc-btn tc-clock-action" disabled={busy || !allowed.BREAK_END} onClick={() => punch('BREAK_END')}><RefreshCw size={17} /> Retorno</button>
          <button className="tc-btn tc-clock-action" disabled={busy || !allowed.CLOCK_OUT} onClick={() => punch('CLOCK_OUT')}><LogOut size={17} /> Saída</button>
        </div>
        {last && <div className="tc-geofence" style={{ marginTop: 14 }}>
          {last.ok ? <CheckCircle2 className="tc-ok" size={17} /> : <X className="tc-no" size={17} />}
          {last.distance != null ? `${Math.round(last.distance)} m do ponto autorizado.` : 'Validação GPS concluída.'}
        </div>}
      </section>

      <section className="tc-card tc-card-pad">
        <div className="tc-section-head"><div><h2>Resumo de horas</h2><span>hoje e últimos 7 dias</span></div></div>
        <div className="tc-hours-grid">
          <div><span>Hoje</span><strong>{minutes(workedToday)}</strong></div>
          <div><span>Extra hoje</span><strong>{minutes(overtimeToday)}</strong></div>
          <div><span>Semana</span><strong>{minutes(weeklyWorked)}</strong></div>
          <div><span>Extra semana</span><strong>{minutes(weeklyOvertime)}</strong></div>
        </div>
        <div className="tc-section-head" style={{ marginTop: 18 }}><div><h2>Últimos registos</h2><span>{weekAttendance.length} dias</span></div></div>
        {weekAttendance.length === 0 ? <div className="tc-empty">Sem registos semanais disponíveis para este colaborador.</div> : weekAttendance.slice(-7).map((row) => (
          <div className="tc-row" key={row.work_date}>
            <div><div className="tc-row-title">{row.work_date}</div><div className="tc-row-sub">{minutes(row.worked_minutes)} trabalhadas · {minutes(row.overtime_minutes)} extra · {row.late_minutes || 0} min atraso</div></div>
            <span className="tc-badge low">{row.status || 'OK'}</span>
          </div>
        ))}
      </section>
    </div>

    <section className="tc-section">
      <div className="tc-section-head"><div><h2>Sinais recentes</h2><span>atrasos, saídas antecipadas e extras</span></div></div>
      <div className="tc-list">
        {anomalies.slice(0, 10).map((a) => <div className="tc-row" key={a.id}><div><div className="tc-row-title">{a.work_date}</div><div className="tc-row-sub">{minutes(a.overtime_minutes)} extra · {a.late_minutes || 0} min atraso · {a.early_leave_minutes || 0} min saída antecipada · {a.night_minutes || 0} min noite</div></div><span className={`tc-badge ${(a.late_minutes || a.early_leave_minutes) ? 'high' : 'medium'}`}>{a.status}</span></div>)}
      </div>
    </section>
  </>;
}
function Tasks({ tasks, employees, companyId, userId, notify, onReload }) { const [title, setTitle] = useState(''); const [priority, setPriority] = useState('NORMAL'); const [assignee, setAssignee] = useState(''); const create = async (e) => { e.preventDefault(); if (!title.trim()) return; const { error } = await supabase.from('hr_tasks').insert({ company_id: companyId, title: title.trim(), priority, assignee_id: assignee || null, created_by: userId }); if (error) notify(error.message, 'error'); else { setTitle(''); notify('Tarefa criada.'); onReload(); } }; const setStatus = async (task, status) => { const { error } = await supabase.from('hr_tasks').update({ status }).eq('id', task.id).eq('company_id', companyId); if (error) notify(error.message, 'error'); else { notify('Tarefa atualizada.'); onReload(); } }; const columns = [['PENDING', 'Pendentes'], ['IN_PROGRESS', 'Em andamento'], ['DONE', 'Concluídas']]; return <><section className="tc-hero"><div><div className="tc-eyebrow"><CheckCircle2 size={13} /> Central RH</div><h1>Tarefas</h1><p>Kanban operacional com auditoria automática de alterações de estado.</p></div></section><section className="tc-card tc-card-pad"><form className="tc-actions" onSubmit={create}><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: validar documentos de onboarding" style={{ flex: 1, minWidth: 220, background: '#09111d', border: '1px solid rgba(255,255,255,.09)', color: '#fff', borderRadius: 10, padding: 10 }} /><select value={priority} onChange={(e) => setPriority(e.target.value)} className="tc-btn"><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></select><select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="tc-btn"><option value="">Sem responsável</option>{employees.map((e) => <option key={e.id} value={e.user_id || ''}>{e.full_name}</option>)}</select><button className="tc-btn primary"><Plus size={15} /> Criar</button></form></section><div className="tc-kanban tc-section">{columns.map(([status, label]) => <section className="tc-column" key={status}><h3>{label} · {tasks.filter((t) => t.status === status).length}</h3>{tasks.filter((t) => t.status === status).map((task) => <div className="tc-task" key={task.id}><strong>{task.title}</strong><small>{task.priority} · {task.category}</small>{task.due_at && <small>Prazo: {new Date(task.due_at).toLocaleString('pt-PT')}</small>}<div className="tc-task-actions">{status === 'PENDING' && <button className="tc-btn tc-small" onClick={() => setStatus(task, 'IN_PROGRESS')}>Iniciar</button>}{status === 'IN_PROGRESS' && <button className="tc-btn primary tc-small" onClick={() => setStatus(task, 'DONE')}><Check size={13} /> Concluir</button>}{status === 'DONE' && <span className="tc-muted">Auditado</span>}</div></div>)}</section>)}</div></>; }
function Alerts({ alerts, employees }) { const map = useMemo(() => new Map(employees.map((e) => [e.id, e.full_name])), [employees]); return <><section className="tc-hero"><div><div className="tc-eyebrow"><AlertTriangle size={13} /> Inteligência</div><h1>Alertas preditivos</h1><p>O motor cruza jornadas, horas, saldo de férias, documentos e padrões de absentismo.</p></div></section><section className="tc-card tc-card-pad">{alerts.length === 0 ? <div className="tc-empty">Nenhum alerta aberto.</div> : alerts.map((a) => <div className="tc-alert" key={a.id}><div style={{ flex: 1 }}><div className="tc-alert-title">{a.title}</div><div className="tc-alert-msg">{a.message}{map.get(a.employee_id) ? ` · ${map.get(a.employee_id)}` : ''}</div></div><div style={{ textAlign: 'right' }}><span className={`tc-badge ${String(a.severity).toLowerCase()}`}>{a.severity}</span><div className="tc-muted" style={{ marginTop: 6 }}>{a.score ?? 0}/100</div></div></div>)}</section></>; }
function Payroll({ runs }) { return <><section className="tc-hero"><div><div className="tc-eyebrow"><CalendarDays size={13} /> Folha</div><h1>Folha de processamento</h1><p>Estrutura pronta para cálculo, aprovação e exportação sem trazer a complexidade do ERP para a UI.</p></div></section><section className="tc-card tc-card-pad"><table className="tc-table"><thead><tr><th>Período</th><th>Estado</th><th>Colaboradores</th><th>Bruto</th><th>Extra</th><th>Noite</th><th>Líquido</th></tr></thead><tbody>{runs.map((r) => <tr key={r.id}><td>{String(r.period_month).padStart(2, '0')}/{r.period_year}</td><td>{r.status}</td><td>{r.employee_count}</td><td>{money(r.gross_cents)}</td><td>{money(r.overtime_cents)}</td><td>{money(r.night_cents)}</td><td>{money(r.net_cents)}</td></tr>)}</tbody></table>{runs.length === 0 && <div className="tc-empty">Ainda não existem processamentos de folha.</div>}</section></>; }
function Shifts({ shifts, assignments, employees }) { const emp = useMemo(() => new Map(employees.map((e) => [e.id, e.full_name])), [employees]); const shift = useMemo(() => new Map(shifts.map((s) => [s.id, s])), [shifts]); return <><section className="tc-hero"><div><div className="tc-eyebrow"><Target size={13} /> Turnos</div><h1>Escalas e jornadas</h1><p>Turnos diurnos/noturnos, tolerância, pausas e rotações ficam no motor; o RH vê só o que precisa decidir.</p></div></section><section className="tc-card tc-card-pad"><div className="tc-section-head"><div><h2>Turnos ativos</h2><span>{shifts.length} configurações</span></div></div>{shifts.map((s) => <div className="tc-row" key={s.id}><div><div className="tc-row-title">{s.name} {s.night_shift && '· Noturno'}</div><div className="tc-row-sub">{s.start_time} → {s.end_time} · pausa {s.break_minutes} min · tolerância {s.tolerance_minutes} min · dias {(s.work_days || []).join(', ')}</div></div><span className="tc-badge low">{s.rotation_code || 'FIXO'}</span></div>)}{shifts.length === 0 && <div className="tc-empty">Nenhum turno ativo. A estrutura está pronta para receber escalas.</div>}<div className="tc-section-head" style={{ marginTop: 18 }}><div><h2>Atribuições</h2><span>{assignments.length} registos</span></div></div>{assignments.slice(0, 20).map((a) => <div className="tc-row" key={a.id}><div><div className="tc-row-title">{emp.get(a.employee_id) || 'Colaborador'}</div><div className="tc-row-sub">{shift.get(a.shift_id)?.name || 'Turno'} · {a.start_date}{a.end_date ? ` → ${a.end_date}` : ''}</div></div></div>)}</section></>; }
function Integrations() { return <><section className="tc-hero"><div><div className="tc-eyebrow"><Zap size={13} /> Background Integrations</div><h1>Integrações</h1><p>SAP, PHC, Primavera e Oracle não aparecem como telas de ERP. O Teconnect trabalha com filas, eventos e workers em segundo plano.</p></div></section><div className="tc-grid-6" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>{['SAP', 'PHC', 'Primavera', 'Oracle'].map((name) => <div className="tc-card tc-kpi" key={name}><div className="tc-kpi-top"><span>{name}</span><Zap size={15} /></div><div className="tc-kpi-value" style={{ fontSize: 20 }}>Worker</div><div className="tc-kpi-foot">fila + webhook assíncrono</div></div>)}</div><section className="tc-card tc-card-pad tc-section"><div className="tc-geofence"><ShieldCheck size={17} className="tc-ok" /><span>O utilizador trabalha no Teconnect. A integração é desacoplada por <strong>event_bus → integration_jobs → Edge Function</strong>.</span></div></section></>; }
function CommandPalette({ onClose, onNavigate }) { useEffect(() => { const fn = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn); }, [onClose]); return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 30, display: 'grid', placeItems: 'start center', paddingTop: 90 }}><div className="tc-card" onClick={(e) => e.stopPropagation()} style={{ width: 'min(620px, calc(100% - 30px))', padding: 12 }}><div className="tc-muted" style={{ padding: 10 }}>Ir para…</div>{pages.map(([id, label, Icon]) => <button key={id} className="tc-btn ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => onNavigate(id)}><Icon size={16} /> {label}</button>)}</div></div>; }
