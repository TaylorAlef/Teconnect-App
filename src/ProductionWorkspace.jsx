import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  Layers3,
  MapPin,
  MessageSquareText,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import './teconnect-suite.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
);

const ADMIN_HR = new Set(['SUPER_ADMIN', 'COMPANY_ADMIN', 'RH']);
const MANAGER_ROLES = new Set(['GESTOR', 'SUPERVISOR']);
const today = () => new Date().toISOString().slice(0, 10);
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'TC';
const money = (cents = 0) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(cents || 0) / 100);
const minutes = (value = 0) => `${Math.floor(Number(value || 0) / 60)}h ${Number(value || 0) % 60}m`;
const date = (value) => value ? new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
const toastText = (error) => error?.message || 'Não foi possível concluir a operação.';

async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

function useLiveData(profile) {
  const [state, setState] = useState({
    company: null,
    employees: [],
    attendance: [],
    vacations: [],
    absences: [],
    overtime: [],
    documents: [],
    trainings: [],
    courses: [],
    competencies: [],
    jobs: [],
    candidates: [],
    interviews: [],
    tasks: [],
    alerts: [],
    payroll: [],
    integrations: [],
    notifications: [],
    invitations: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async (silent = false) => {
    if (!profile?.company_id) return;
    setState((current) => ({ ...current, loading: silent ? current.loading : true, error: null }));
    const companyId = profile.company_id;
    const queries = [
      ['company', supabase.from('companies').select('id,name,nif,email,phone,address,active,billing_status,billing_blocked').eq('id', companyId).maybeSingle()],
      ['employees', supabase.from('employees').select('id,user_id,employee_code,full_name,email,phone,nif,department_id,position_id,hire_date,status,manager_id').eq('company_id', companyId).order('full_name').limit(2000)],
      ['attendance', supabase.from('attendance_days').select('id,employee_id,work_date,scheduled_minutes,worked_minutes,normal_minutes,overtime_minutes,late_minutes,early_leave_minutes,status,first_clock_in,last_clock_out,night_minutes').eq('company_id', companyId).order('work_date', { ascending: false }).limit(500)],
      ['vacations', supabase.from('vacation_requests').select('id,employee_id,start_date,end_date,days,reason,status,approved_by,approved_at,created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200)],
      ['absences', supabase.from('absences').select('id,employee_id,absence_type_id,start_date,end_date,reason,status,approved_by,approved_at,created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200)],
      ['overtime', supabase.from('overtime_records').select('id,employee_id,attendance_day_id,minutes,reason,status,approved_by,approved_at,created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200)],
      ['documents', supabase.from('employee_documents').select('id,employee_id,document_type,title,document_url,issued_at,expires_at,status,notes,created_by,created_at,updated_at').eq('company_id', companyId).order('expires_at', { ascending: true, nullsFirst: false }).limit(500)],
      ['trainings', supabase.from('employee_trainings').select('id,employee_id,course_id,status,started_at,completed_at,score,certificate_url,notes,created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(500)],
      ['courses', supabase.from('training_courses').select('id,name,description,duration_hours,active').eq('company_id', companyId).eq('active', true).order('name')],
      ['competencies', supabase.from('employee_competencies').select('id,employee_id,competency,level,assessed_at,notes,created_at').eq('company_id', companyId).order('assessed_at', { ascending: false }).limit(500)],
      ['jobs', supabase.from('recruitment_jobs').select('id,title,department_id,position_id,location,employment_type,status,opened_at,closed_at,description,created_by,created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200)],
      ['candidates', supabase.from('recruitment_candidates').select('id,job_id,full_name,email,phone,stage,source,notes,created_at,updated_at').eq('company_id', companyId).order('updated_at', { ascending: false }).limit(500)],
      ['interviews', supabase.from('recruitment_interviews').select('id,candidate_id,scheduled_at,interviewer_id,status,feedback,created_at').eq('company_id', companyId).order('scheduled_at', { ascending: true }).limit(200)],
      ['tasks', supabase.from('hr_tasks').select('id,title,description,status,priority,category,assignee_id,employee_id,due_at,completed_at,completed_by,source_alert_id,metadata,created_by,created_at,updated_at').eq('company_id', companyId).order('due_at', { ascending: true, nullsFirst: false }).limit(500)],
      ['alerts', supabase.from('hr_alerts').select('id,alert_type,severity,status,title,message,employee_id,entity_type,entity_id,score,due_at,acknowledged_at,acknowledged_by,resolved_at,resolved_by,created_at').eq('company_id', companyId).in('status', ['OPEN', 'ACKNOWLEDGED']).order('created_at', { ascending: false }).limit(200)],
      ['payroll', supabase.from('payroll_runs').select('id,period_year,period_month,status,employee_count,gross_cents,overtime_cents,night_cents,absence_cents,net_cents,created_by,approved_by,approved_at,updated_at').eq('company_id', companyId).order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(24)],
      ['integrations', supabase.from('integration_jobs').select('id,provider,operation,entity_type,entity_id,status,attempts,last_error,created_at,processed_at,next_attempt_at,last_http_status,idempotency_key').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200)],
      ['notifications', supabase.from('notifications').select('id,user_id,type,title,message,read_at,created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200)],
      ['invitations', supabase.from('employee_invitations').select('id,employee_id,email,status,invited_by,invited_at,accepted_at,expires_at,last_error,created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(500)],
    ];

    const results = await Promise.allSettled(queries.map(([, request]) => request));
    const next = {};
    const failures = [];
    results.forEach((result, index) => {
      const [key] = queries[index];
      if (result.status === 'fulfilled' && !result.value.error) next[key] = result.value.data ?? result.value;
      else {
        failures.push(`${key}: ${result.status === 'fulfilled' ? result.value.error.message : result.reason?.message || 'erro'}`);
        next[key] = result.status === 'fulfilled' ? (result.value.data ?? []) : [];
      }
    });

    setState({
      company: next.company || null,
      employees: next.employees || [],
      attendance: next.attendance || [],
      vacations: next.vacations || [],
      absences: next.absences || [],
      overtime: next.overtime || [],
      documents: next.documents || [],
      trainings: next.trainings || [],
      courses: next.courses || [],
      competencies: next.competencies || [],
      jobs: next.jobs || [],
      candidates: next.candidates || [],
      interviews: next.interviews || [],
      tasks: next.tasks || [],
      alerts: next.alerts || [],
      payroll: next.payroll || [],
      integrations: next.integrations || [],
      notifications: next.notifications || [],
      invitations: next.invitations || [],
      loading: false,
      error: failures.length ? `Alguns módulos não responderam: ${failures[0]}` : null,
    });
  }, [profile?.company_id]);

  useEffect(() => { load(); }, [load]);
  return { state, load };
}

function Modal({ title, children, onClose }) {
  return <div className="suite-overlay" role="dialog" aria-modal="true" aria-label={title}>
    <div className="suite-modal">
      <div className="suite-modal-head"><strong>{title}</strong><button className="suite-icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>
      {children}
    </div>
  </div>;
}

function Field({ label, children }) { return <label className="suite-field"><span>{label}</span>{children}</label>; }
function Button({ children, variant = 'secondary', icon: Icon, onClick, type = 'button', disabled = false }) { return <button type={type} className={`suite-btn ${variant}`} onClick={onClick} disabled={disabled}>{Icon && <Icon size={15} />}{children}</button>; }
function Badge({ children, tone = 'neutral' }) { return <span className={`suite-badge ${tone}`}>{children}</span>; }

export default function ProductionWorkspace({ profile, onOpenAttendance, onOpenPanel, onOpenBilling }) {
  const { state, load } = useLiveData(profile);
  const [page, setPage] = useState('overview');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const uploadRef = useRef(null);
  const canManage = ADMIN_HR.has(profile?.role);
  const isManager = MANAGER_ROLES.has(profile?.role);
  const unread = state.notifications.filter((item) => !item.read_at && item.user_id === profile?.user_id).length;

  const notify = useCallback((message, kind = 'ok') => {
    setToast({ message, kind });
    window.clearTimeout(window.__teconnectProductionToast);
    window.__teconnectProductionToast = window.setTimeout(() => setToast(null), 3600);
  }, []);

  const liveEmployees = useMemo(() => state.employees.filter((item) => item.status === 'ACTIVE'), [state.employees]);
  const pendingVacations = state.vacations.filter((item) => item.status === 'PENDING');
  const pendingOvertime = state.overtime.filter((item) => item.status === 'PENDING');
  const openTasks = state.tasks.filter((item) => !['DONE', 'CANCELLED'].includes(item.status));
  const openAlerts = state.alerts.filter((item) => ['OPEN', 'ACKNOWLEDGED'].includes(item.status));
  const todayAttendance = state.attendance.filter((item) => item.work_date === today());
  const presentToday = todayAttendance.filter((item) => !['ABSENT', 'NOT_SCHEDULED'].includes(item.status));
  const lateToday = todayAttendance.filter((item) => Number(item.late_minutes) > 0);
  const expiringDocs = state.documents.filter((item) => item.expires_at && new Date(item.expires_at) <= new Date(Date.now() + 30 * 86400000));
  const failedIntegrations = state.integrations.filter((item) => ['FAILED', 'ERROR'].includes(String(item.status).toUpperCase()));

  const pages = useMemo(() => {
    const items = [
      ['overview', 'Visão geral', Activity],
      ['people', 'Colaboradores', Users],
      ['recruitment', 'Recrutamento', BriefcaseIcon],
      ['onboarding', 'Onboarding', UserCheck],
      ['attendance', 'Ponto & assiduidade', Clock3],
      ['vacations', 'Férias & ausências', CalendarCheck],
      ['documents', 'Documentos', FileText],
      ['development', 'Desenvolvimento', BookOpen],
      ['tasks', 'Tarefas RH', CheckCircle2],
      ['alerts', 'Alertas', AlertTriangle],
      ['payroll', 'Folha', CalendarDays],
      ['integrations', 'Integrações', Zap],
      ['notifications', 'Notificações', Bell],
    ];
    if (canManage) return items;
    if (isManager) return items.filter(([id]) => ['overview', 'people', 'attendance', 'vacations', 'documents', 'development', 'tasks', 'alerts', 'notifications'].includes(id));
    return items.filter(([id]) => ['overview', 'attendance', 'vacations', 'documents', 'development', 'notifications'].includes(id));
  }, [canManage, isManager]);

  useEffect(() => {
    if (!pages.some(([id]) => id === page)) setPage('overview');
  }, [pages, page]);

  const employeeMap = useMemo(() => new Map(state.employees.map((item) => [item.id, item])), [state.employees]);
  const candidateMap = useMemo(() => new Map(state.candidates.map((item) => [item.id, item])), [state.candidates]);
  const courseMap = useMemo(() => new Map(state.courses.map((item) => [item.id, item])), [state.courses]);

  const act = async (label, fn) => {
    setBusy(true); setToast(null);
    try { await fn(); notify(label); await load(true); }
    catch (error) { notify(toastText(error), 'error'); }
    finally { setBusy(false); }
  };

  const approveVacation = (request, approve) => act(approve ? 'Férias aprovadas.' : 'Pedido de férias rejeitado.', () => rpc('approve_vacation_request', { p_request_id: request.id, p_approve: approve }));
  const approveOvertime = (request, approve) => act(approve ? 'Horas extra aprovadas.' : 'Horas extra rejeitadas.', () => rpc('approve_overtime_record', { p_record_id: request.id, p_approve: approve }));

  const createEmployee = (form) => act('Colaborador criado com sucesso.', async () => {
    await rpc('create_employee', {
      p_employee_code: form.employee_code.trim(), p_full_name: form.full_name.trim(), p_email: form.email.trim() || null,
      p_phone: form.phone.trim() || null, p_nif: form.nif.trim() || null, p_department_id: form.department_id || null,
      p_position_id: form.position_id || null, p_hire_date: form.hire_date || today(),
    });
    setModal(null);
  });

  const createTask = (form) => act('Tarefa criada e auditada.', async () => {
    const { error } = await supabase.from('hr_tasks').insert({
      company_id: profile.company_id, title: form.title.trim(), description: form.description.trim() || null,
      status: 'PENDING', priority: form.priority, category: form.category.trim() || 'HR', assignee_id: form.assignee_id || null,
      employee_id: form.employee_id || null, due_at: form.due_at || null, created_by: profile.user_id,
    });
    if (error) throw error;
    setModal(null);
  });

  const createCandidate = (form) => act('Candidato adicionado ao pipeline.', async () => {
    await rpc('create_candidate_app', {
      p_job_id: form.job_id || null, p_full_name: form.full_name.trim(), p_email: form.email.trim() || null,
      p_phone: form.phone.trim() || null, p_source: form.source.trim() || null, p_notes: form.notes.trim() || null,
    });
    setModal(null);
  });

  const createVacation = (form) => act('Pedido de férias submetido.', async () => {
    if (canManage || isManager) {
      await rpc('create_vacation_request_app', {
        p_employee_id: form.employee_id, p_start_date: form.start_date, p_end_date: form.end_date,
        p_days: Number(form.days), p_reason: form.reason.trim() || null,
      });
    } else {
      await rpc('create_my_vacation_request', { p_start_date: form.start_date, p_end_date: form.end_date, p_days: Number(form.days), p_reason: form.reason.trim() || null });
    }
    setModal(null);
  });

  const createJob = (form) => act('Vaga criada.', async () => {
    const { error } = await supabase.from('recruitment_jobs').insert({
      company_id: profile.company_id, title: form.title.trim(), location: form.location.trim() || null,
      employment_type: form.employment_type, status: 'OPEN', opened_at: today(), description: form.description.trim() || null, created_by: profile.user_id,
    });
    if (error) throw error;
    setModal(null);
  });

  const scheduleInterview = (form) => act('Entrevista agendada.', async () => {
    await rpc('create_interview_app', { p_candidate_id: form.candidate_id, p_scheduled_at: new Date(form.scheduled_at).toISOString(), p_interviewer_id: form.interviewer_id || null });
    setModal(null);
  });

  const updateCandidateStage = (candidateId, stage) => act(`Candidato movido para ${stage}.`, async () => {
    const { error } = await supabase.from('recruitment_candidates').update({ stage, updated_at: new Date().toISOString() }).eq('id', candidateId).eq('company_id', profile.company_id);
    if (error) throw error;
  });

  const markRead = (id) => act('Notificação marcada como lida.', async () => {
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', profile.user_id).eq('company_id', profile.company_id);
    if (error) throw error;
  });

  const uploadDocument = async (file) => {
    const meta = modal?.item;
    if (!file || !meta?.employee_id) return;
    await act('Documento carregado e registado.', async () => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
      const path = `${profile.company_id}/${meta.employee_id}/${Date.now()}-${safeName}`;
      const upload = await supabase.storage.from('employee-documents').upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upload.error) throw upload.error;
      const { error } = await supabase.from('employee_documents').insert({
        company_id: profile.company_id, employee_id: meta.employee_id, document_type: meta.document_type,
        title: file.name, document_url: path, issued_at: meta.issued_at || null, expires_at: meta.expires_at || null,
        status: meta.expires_at && new Date(meta.expires_at) < new Date() ? 'EXPIRED' : 'VALID', created_by: profile.user_id,
      });
      if (error) throw error;
      setModal(null); uploadRef.current = null;
    });
  };

  const openDocument = async (doc) => {
    try {
      if (!doc.document_url) return notify('Este registo ainda não tem ficheiro associado.', 'error');
      if (/^https?:\/\//i.test(doc.document_url)) { window.open(doc.document_url, '_blank', 'noopener,noreferrer'); return; }
      const { data, error } = await supabase.storage.from('employee-documents').createSignedUrl(doc.document_url, 300);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) { notify(toastText(error), 'error'); }
  };

  if (state.loading) return <div className="tc-loading"><div><div className="tc-brand-mark" style={{ margin: '0 auto 12px' }}>T</div><strong>A sincronizar a organização…</strong></div></div>;

  const meta = {
    overview: ['Visão geral', 'Comando operacional do RH'], people: ['Colaboradores', 'Base de pessoas, contratos e estrutura'], recruitment: ['Recrutamento', 'Pipeline de vagas, candidatos e entrevistas'], onboarding: ['Onboarding', 'Integração operacional e acesso do colaborador'],
    attendance: ['Ponto & assiduidade', 'Registos, atrasos, horas extra e conformidade'], vacations: ['Férias & ausências', 'Pedidos, saldos e aprovações'], documents: ['Documentos', 'Arquivo seguro e validade documental'], development: ['Desenvolvimento', 'Formação e competências'], tasks: ['Tarefas RH', 'Worklist operacional com auditoria'], alerts: ['Alertas', 'Sinais e exceções que exigem ação'],
    payroll: ['Folha', 'Preparação, aprovação e encerramento de períodos'], integrations: ['Integrações', 'Filas, estado de processamento e falhas'], notifications: ['Notificações', 'Comunicação operacional e pendências'],
  }[page];

  const navigationGroups = [
    { label: 'Principal', items: [
      { page: 'overview', label: 'Dashboard', icon: Activity },
      { page: 'people', label: 'Colaboradores', icon: Users },
    ]},
    { label: 'Tempo & jornada', items: [
      { page: 'attendance', label: 'Registos de Ponto', icon: Clock3 },
      { action: 'attendance', label: 'Picagem Móvel', icon: Clock3 },
      { action: 'panel', panel: 'rules', label: 'Motor de Jornada', icon: Zap },
      { page: 'attendance', label: 'Assiduidade Inteligente', icon: TrendingUp },
      { action: 'panel', panel: 'rules', label: 'Horários & Turnos', icon: CalendarDays },
    ]},
    { label: 'Intelligence & operações', items: [
      { page: 'overview', label: 'Command Center', icon: Activity },
      { action: 'panel', panel: 'analytics', label: 'Intelligence Center', icon: Sparkles },
      { action: 'panel', panel: 'approvals', label: 'Aprovações', icon: CheckCircle2 },
      { page: 'alerts', label: 'Central de Alertas', icon: AlertTriangle },
    ]},
    { label: 'Pessoas & RH', items: [
      { page: 'vacations', label: 'Férias & Ausências', icon: CalendarCheck },
      { page: 'documents', label: 'Documentos', icon: FileText },
      { page: 'development', label: 'Desenvolvimento', icon: BookOpen },
      { page: 'tasks', label: 'Tarefas RH', icon: CheckCircle2 },
      { page: 'integrations', label: 'Integrações', icon: Zap },
      { page: 'notifications', label: 'Notificações', icon: Bell },
    ]},
  ];

  const handleNavigation = (item) => {
    if (item.action === 'attendance') {
      onOpenAttendance?.();
      return;
    }
    if (item.action === 'panel') {
      onOpenPanel?.(item.panel);
      return;
    }
    setPage(item.page);
  };

  return <div className="suite-app">
    <aside className="suite-sidebar">
      <div className="suite-brand-wrap"><div className="tc-brand-mark" aria-label="Te-connect" /></div>
      <div className="suite-org"><div className="suite-org-icon"><Building2 size={17} /></div><div><strong>{state.company?.name || 'Te-connect'}</strong><span>{profile?.role || 'Utilizador'} · Produção</span></div></div>
      <nav className="suite-nav" aria-label="Navegação principal">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <div className="suite-nav-label">{group.label}</div>
            {group.items.map((item, index) => {
              const Icon = item.icon;
              const active = item.page === page && !item.action;
              const badge = item.page === 'alerts' ? openAlerts.length : item.page === 'notifications' ? unread : 0;
              return <button key={group.label + item.label + index} className={active ? 'active' : ''} onClick={() => handleNavigation(item)}><Icon size={17} /><span>{item.label}</span>{badge > 0 && <em>{badge}</em>}</button>;
            })}
          </div>
        ))}
      </nav>
      <div className="suite-sidebar-bottom"><button onClick={() => load()}><RefreshCw size={16} />Sincronizar</button><div style={{ fontSize: 11, opacity: .58, padding: '8px 10px' }}>Dados reais · tenant isolado</div></div>
    </aside>

    <main className="suite-main">
      <header className="suite-topbar"><div className="suite-top-left"><div className="suite-breadcrumb">Te-connect <ArrowRight size={14} /><strong>{meta?.[0]}</strong></div></div><div className="suite-top-right"><div className="suite-live"><span /> Dados reais</div><button className="suite-top-search" onClick={() => setPage('people')}><Search size={15} />Pesquisar</button><button className="suite-top-icon" onClick={() => setPage('notifications')} aria-label="Notificações"><Bell size={17} />{unread > 0 && <i>{unread}</i>}</button><div className="suite-user-chip"><span className="suite-avatar small">{initials(profile?.full_name)}</span><span><strong>{profile?.full_name || 'Utilizador'}</strong><small>{profile?.role || 'Utilizador'}</small></span></div></div></header>
      <div className="suite-content">
        {state.error && <div className="suite-note" style={{ marginBottom: 14 }}><AlertTriangle size={16} /><span>{state.error}</span><Button onClick={() => load()}>Tentar novamente</Button></div>}
        <div className="suite-page-intro"><div><div className="suite-eyebrow"><Sparkles size={14} /> {meta?.[0]}</div><h1>{meta?.[1]}</h1><p>{meta?.[1]} · empresa <strong>{state.company?.name || 'atual'}</strong>.</p></div><div className="suite-page-meta"><span><ShieldCheck size={14} /> Controlo por empresa</span><span><Activity size={14} /> Operação ligada ao Supabase</span></div></div>

        {page === 'overview' && <Overview state={state} liveEmployees={liveEmployees} presentToday={presentToday} lateToday={lateToday} pendingVacations={pendingVacations} pendingOvertime={pendingOvertime} openTasks={openTasks} openAlerts={openAlerts} expiringDocs={expiringDocs} failedIntegrations={failedIntegrations} employeeMap={employeeMap} profile={profile} onNavigate={setPage} onOpenPanel={onOpenPanel} onOpenAttendance={onOpenAttendance} onRefresh={() => load()} />}
        {page === 'people' && <People employees={state.employees} query={query} setQuery={setQuery} canManage={canManage} onCreate={() => setModal({ type: 'employee' })} onOpen={(item) => setModal({ type: 'employee-detail', item })} />}
        {page === 'recruitment' && canManage && <Recruitment jobs={state.jobs} candidates={state.candidates} interviews={state.interviews} candidateMap={candidateMap} employeeMap={employeeMap} onCreateCandidate={() => setModal({ type: 'candidate' })} onCreateJob={() => setModal({ type: 'job' })} onInterview={() => setModal({ type: 'interview' })} onStage={updateCandidateStage} />}
        {page === 'onboarding' && canManage && <Onboarding employees={state.employees} documents={state.documents} invitations={state.invitations} trainings={state.trainings} onInvite={() => notify('Use o Gestor de acesso para enviar o convite e ligar o utilizador ao colaborador.')} onOpenAccess={() => onOpenPanel?.('employee-access')} />}
        {page === 'attendance' && <Attendance attendance={state.attendance} employees={state.employees} onOpenAttendance={onOpenAttendance} />}
        {page === 'vacations' && <Vacations requests={state.vacations} employees={state.employees} canApprove={canManage || isManager} canManage={canManage || isManager} onCreate={() => setModal({ type: 'vacation' })} onApprove={approveVacation} />}
        {page === 'documents' && <Documents documents={state.documents} employees={state.employees} canManage={canManage} onOpen={openDocument} onUpload={(employee) => { setModal({ type: 'document', item: { employee_id: employee.id, document_type: 'CONTRACT', issued_at: '', expires_at: '' } }); setTimeout(() => uploadRef.current?.focus(), 0); }} />}
        {page === 'development' && <Development employees={state.employees} courses={state.courses} trainings={state.trainings} competencies={state.competencies} courseMap={courseMap} canManage={canManage} onAssign={(item) => setModal({ type: 'training', item })} />}
        {page === 'tasks' && <Tasks tasks={state.tasks} employees={state.employees} canManage={canManage} onCreate={() => setModal({ type: 'task' })} onReload={() => load(true)} notify={notify} />}
        {page === 'alerts' && <Alerts alerts={state.alerts} employees={state.employees} onResolve={(alert) => act('Alerta encerrado.', async () => { const { error } = await supabase.from('hr_alerts').update({ status: 'RESOLVED', resolved_by: profile.user_id, resolved_at: new Date().toISOString() }).eq('id', alert.id).eq('company_id', profile.company_id); if (error) throw error; })} />}
        {page === 'payroll' && <Payroll runs={state.payroll} onOpen={() => onOpenPanel?.('payroll')} />}
        {page === 'integrations' && <Integrations jobs={state.integrations} onRefresh={() => load()} />}
        {page === 'notifications' && <Notifications notifications={state.notifications.filter((item) => item.user_id === profile.user_id || canManage)} unread={unread} onRead={markRead} />}
        <footer className="tc-app-footer"><span>Te-connect · People OS para empresas</span><span><a href="/privacy.html">Privacidade</a><a href="/terms.html">Termos</a><a href="/robots.txt">Robots</a></span></footer>
      </div>
    </main>

    {toast && <div className={`suite-toast ${toast.kind || 'ok'}`}><CheckCircle2 size={16} />{toast.message}</div>}
    {modal?.type === 'employee' && <EmployeeForm onClose={() => setModal(null)} onSave={createEmployee} />}
    {modal?.type === 'employee-detail' && <EmployeeDetail employee={modal.item} documents={state.documents.filter((d) => d.employee_id === modal.item.id)} trainings={state.trainings.filter((t) => t.employee_id === modal.item.id)} onClose={() => setModal(null)} />}
    {modal?.type === 'candidate' && <CandidateForm jobs={state.jobs} onClose={() => setModal(null)} onSave={createCandidate} />}
    {modal?.type === 'job' && <JobForm onClose={() => setModal(null)} onSave={createJob} />}
    {modal?.type === 'interview' && <InterviewForm candidates={state.candidates} employees={state.employees} onClose={() => setModal(null)} onSave={scheduleInterview} />}
    {modal?.type === 'vacation' && <VacationForm employees={state.employees} self={!canManage && !isManager} onClose={() => setModal(null)} onSave={createVacation} />}
    {modal?.type === 'task' && <TaskForm employees={state.employees} onClose={() => setModal(null)} onSave={createTask} />}
    {modal?.type === 'training' && <TrainingForm employees={state.employees} courses={state.courses} item={modal.item} onClose={() => setModal(null)} onSave={(form) => act('Formação atribuída.', async () => { await rpc('assign_training_app', { p_employee_id: form.employee_id, p_course_id: form.course_id, p_status: form.status }); setModal(null); })} />}
    {modal?.type === 'document' && <DocumentForm ref={uploadRef} employeeName={employeeMap.get(modal.item.employee_id)?.full_name || ''} item={modal.item} fileRef={uploadRef} onClose={() => setModal(null)} onFile={uploadDocument} />}
  </div>;
}


function Overview({ state, liveEmployees, presentToday, lateToday, pendingVacations, pendingOvertime, openTasks, openAlerts, expiringDocs, failedIntegrations, employeeMap, profile, onNavigate, onOpenPanel, onOpenAttendance, onRefresh }) {
  const activeCount = liveEmployees.length;
  const attendanceRate = activeCount ? (presentToday.length / activeCount) * 100 : 0;
  const overtimeWeek = state.attendance.filter((item) => new Date(item.work_date) >= new Date(Date.now() - 7 * 86400000)).reduce((sum, item) => sum + Number(item.overtime_minutes || 0), 0);
  const dayKeys = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - (6-index));
    return d.toISOString().slice(0,10);
  });
  const presenceSeries = dayKeys.map((key) => {
    const records = state.attendance.filter((item) => item.work_date === key);
    const present = records.filter((item) => !['ABSENT','NOT_SCHEDULED'].includes(String(item.status).toUpperCase())).length;
    return { key, label: new Intl.DateTimeFormat('pt-PT',{weekday:'short'}).format(new Date(key+'T12:00:00')).replace('.',''), value: activeCount ? Math.min(100, (present/activeCount)*100) : 0 };
  });
  const highlights = liveEmployees.slice(0, 5).map((employee) => {
    const latest = state.attendance.find((row) => row.employee_id === employee.id);
    const status = String(latest?.status || '').toUpperCase();
    return { employee, label: status === 'ABSENT' ? 'Ausente' : status === 'NOT_SCHEDULED' ? 'Fora da escala' : 'Em atividade', tone: status === 'ABSENT' ? 'muted' : 'positive' };
  });
  const upcoming = [
    ...state.interviews.filter((item) => item.scheduled_at && new Date(item.scheduled_at) >= new Date()).slice(0,3).map((item) => ({
      icon: Users, title: 'Entrevista', subtitle: item.candidate_id ? 'Candidato em processo' : 'Entrevista RH', when: new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(item.scheduled_at))
    })),
    ...state.vacations.filter((item) => item.start_date && new Date(item.start_date+'T00:00:00') >= new Date()).slice(0,2).map((item) => ({
      icon: CalendarCheck, title: 'Férias', subtitle: employeeMap.get(item.employee_id)?.full_name || 'Colaborador', when: date(item.start_date)
    })),
  ].slice(0,4);
  const operationalSignals = [
    { label: 'Presença', value: `${attendanceRate.toFixed(0)}%`, detail: lateToday.length ? `${lateToday.length} com atraso hoje` : 'Sem atrasos hoje', tone: lateToday.length ? 'warning' : 'positive', icon: Clock3 },
    { label: 'Aprovações', value: String(pendingVacations.length + pendingOvertime.length), detail: 'aguardam decisão', tone: (pendingVacations.length + pendingOvertime.length) ? 'warning' : 'positive', icon: CheckCircle2 },
    { label: 'Conformidade', value: String(expiringDocs.length), detail: expiringDocs.length ? 'documentos a rever' : 'sem vencimentos próximos', tone: expiringDocs.length ? 'warning' : 'positive', icon: ShieldCheck },
    { label: 'Integrações', value: String(failedIntegrations.length), detail: failedIntegrations.length ? 'falhas pendentes' : 'operação normal', tone: failedIntegrations.length ? 'danger' : 'positive', icon: Zap },
  ];

  const priorityActions = [
    expiringDocs.length > 0 ? {
      id: 'docs',
      tone: 'warning',
      icon: FileText,
      eyebrow: 'CONFORMIDADE',
      title: `${expiringDocs.length} documento${expiringDocs.length === 1 ? '' : 's'} exige${expiringDocs.length === 1 ? '' : 'm'} atenção`,
      detail: 'Evite que contratos ou certificados ultrapassem a validade.',
      action: 'Rever documentos',
      target: 'documents',
    } : null,
    pendingVacations.length > 0 ? {
      id: 'vacations',
      tone: 'blue',
      icon: CalendarCheck,
      eyebrow: 'APROVAÇÕES',
      title: `${pendingVacations.length} pedido${pendingVacations.length === 1 ? '' : 's'} de férias pendente${pendingVacations.length === 1 ? '' : 's'}`,
      detail: 'Resolva pedidos sem trocar de ecrã e mantenha a equipa informada.',
      action: 'Abrir aprovações',
      target: 'vacations',
    } : null,
    pendingOvertime.length > 0 ? {
      id: 'overtime',
      tone: 'blue',
      icon: Clock3,
      eyebrow: 'ASSIDUIDADE',
      title: `${pendingOvertime.length} pedido${pendingOvertime.length === 1 ? '' : 's'} de horas extra por decidir`,
      detail: 'Valide o impacto antes de fechar o período de trabalho.',
      action: 'Rever horas extra',
      target: 'attendance',
    } : null,
    failedIntegrations.length > 0 ? {
      id: 'integrations',
      tone: 'danger',
      icon: Zap,
      eyebrow: 'INTEGRAÇÕES',
      title: `${failedIntegrations.length} falha${failedIntegrations.length === 1 ? '' : 's'} de integração`,
      detail: 'Há operações que precisam de intervenção para não ficarem pendentes.',
      action: 'Ver integrações',
      target: 'integrations',
    } : null,
    state.invitations.filter((item) => item.status === 'PENDING').length > 0 ? {
      id: 'invites',
      tone: 'blue',
      icon: UserPlus,
      eyebrow: 'ACESSOS',
      title: `${state.invitations.filter((item) => item.status === 'PENDING').length} convite${state.invitations.filter((item) => item.status === 'PENDING').length === 1 ? '' : 's'} pendente${state.invitations.filter((item) => item.status === 'PENDING').length === 1 ? '' : 's'}`,
      detail: 'Conclua o acesso dos colaboradores para fechar o ciclo operacional.',
      action: 'Gerir acessos',
      target: 'people',
    } : null,
  ].filter(Boolean).slice(0, 4);

  const alertItems = [
    ...openAlerts.slice(0,3).map((alert) => ({ icon: AlertTriangle, tone: 'danger', title: employeeMap.get(alert.employee_id)?.full_name || alert.title, subtitle: alert.message, when: date(alert.created_at) })),
    ...pendingVacations.slice(0,2).map((item) => ({ icon: CalendarCheck, tone: 'warning', title: 'Pedido de férias', subtitle: employeeMap.get(item.employee_id)?.full_name || 'Colaborador', when: date(item.start_date) })),
    ...pendingOvertime.slice(0,1).map((item) => ({ icon: Clock3, tone: 'warning', title: 'Horas extra por aprovar', subtitle: employeeMap.get(item.employee_id)?.full_name || 'Colaborador', when: minutes(item.minutes) })),
  ].slice(0,4);

  return <>
    <div className="tc-dashboard-welcome tc-dashboard-welcome-pro">
      <div className="tc-dashboard-welcome-copy">
        <div className="tc-dashboard-welcome-kicker"><Activity size={13}/> VISÃO EXECUTIVA</div>
        <h2>Operação de pessoas em tempo real</h2>
        <p>Uma visão clara do que está a acontecer hoje — pessoas, assiduidade, pendências e exceções.</p>
        <div className="tc-dashboard-welcome-stats">
          <span><b>{attendanceRate.toFixed(0)}%</b> presença</span>
          <span><b>{pendingVacations.length + pendingOvertime.length}</b> pendências</span>
          <span><b>{openAlerts.length}</b> alertas</span>
        </div>
      </div>
      <div className="tc-dashboard-promo" aria-label="Te-connect People OS">
        <img
          className="tc-dashboard-promo-image"
          src="/assets/teconnect-dashboard-hero.webp"
          alt="Te-connect People OS — gestão de pessoas que impulsiona o seu futuro"
          width="2048"
          height="757"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>
    </div>

    <div className="tc-dashboard-kpis">
      <DashboardKpi icon={Users} label="Colaboradores ativos" value={activeCount} trend="Base atual" tone="blue" onClick={() => onNavigate('people')} />
      <DashboardKpi icon={Clock3} label="A trabalhar agora" value={presentToday.length} trend="● Em atividade" tone="green" onClick={onOpenAttendance} />
      <DashboardKpi icon={AlertTriangle} label="Atrasos hoje" value={lateToday.length} trend={lateToday.length ? ('+' + lateToday.length) : 'Sem atrasos'} tone="red" onClick={() => onNavigate('attendance')} />
      <DashboardKpi icon={FileText} label="Pendências" value={pendingVacations.length + pendingOvertime.length} trend="● Requerem atenção" tone="blue" onClick={() => onNavigate('vacations')} />
    </div>

    <section className="tc-executive-brief">
      <div className="tc-executive-brief-main">
        <div className="tc-dashboard-section-kicker"><Sparkles size={13}/> TE-CONNECT DAILY BRIEF</div>
        <h2>Bom dia. Aqui está o estado da operação.</h2>
        <p>
          Hoje existem <strong>{activeCount}</strong> colaboradores ativos. Foram registados <strong>{presentToday.length}</strong> colaboradores com presença,
          <strong> {lateToday.length}</strong> com atraso e <strong> {pendingVacations.length + pendingOvertime.length}</strong> pedidos a aguardar decisão.
        </p>
        <div className="tc-executive-brief-tags">
          <span><Users size={13}/> {activeCount} ativos</span>
          <span><Clock3 size={13}/> {presentToday.length} em atividade</span>
          <span><ShieldCheck size={13}/> {openAlerts.length} alertas abertos</span>
        </div>
      </div>
      <div className="tc-executive-brief-next">
        <small>PRÓXIMA AÇÃO</small>
        <strong>{priorityActions[0]?.title || 'Operação sob controlo'}</strong>
        <span>{priorityActions[0]?.detail || 'Não há pendências prioritárias neste momento.'}</span>
        {priorityActions[0] && <button type="button" onClick={() => onNavigate(priorityActions[0].target)}>Resolver agora <ArrowRight size={13}/></button>}
      </div>
    </section>

    <section className="tc-pulse-panel">
      <div className="tc-pulse-score">
        <div className="tc-pulse-ring"><strong>{Math.round(Math.max(0, Math.min(100, attendanceRate - (openAlerts.length * 4) - (pendingVacations.length * 2) - (failedIntegrations.length * 5))))}</strong><span>/100</span></div>
        <div><small>TE-CONNECT PULSE</small><h2>Saúde operacional</h2><p>Um resumo executivo calculado a partir da operação real da empresa.</p></div>
      </div>
      <div className="tc-pulse-signals">
        <div><span>Assiduidade</span><strong>{attendanceRate.toFixed(0)}%</strong><small>presença</small></div>
        <div><span>Exceções</span><strong>{openAlerts.length}</strong><small>em aberto</small></div>
        <div><span>Aprovações</span><strong>{pendingVacations.length + pendingOvertime.length}</strong><small>pendentes</small></div>
        <div><span>Conformidade</span><strong>{expiringDocs.length}</strong><small>a rever</small></div>
      </div>
      <button type="button" className="tc-pulse-action" onClick={() => onOpenPanel?.('analytics')}>Abrir Intelligence Center <ArrowRight size={15}/></button>
    </section>

    <section className="tc-executive-summary">
      <div className="tc-executive-summary-main">
        <div className="tc-dashboard-section-kicker"><Sparkles size={13}/> RESUMO EXECUTIVO</div>
        <h2>{openAlerts.length || pendingVacations.length || pendingOvertime.length || failedIntegrations.length ? 'Há sinais que merecem uma decisão hoje.' : 'A operação está sob controlo.'}</h2>
        <p>{openAlerts.length
          ? `${openAlerts.length} alerta${openAlerts.length === 1 ? '' : 's'} ativo${openAlerts.length === 1 ? '' : 's'}${pendingVacations.length ? `, ${pendingVacations.length} pedido${pendingVacations.length === 1 ? '' : 's'} de férias aguardam decisão` : ''}.`
          : pendingVacations.length
            ? `${pendingVacations.length} pedido${pendingVacations.length === 1 ? '' : 's'} de férias aguarda${pendingVacations.length === 1 ? '' : 'm'} decisão.`
            : pendingOvertime.length
              ? `${pendingOvertime.length} pedido${pendingOvertime.length === 1 ? '' : 's'} de horas extra precisa${pendingOvertime.length === 1 ? '' : 'm'} de validação.`
              : 'Não existem pendências prioritárias identificadas pelos módulos operacionais.'}</p>
      </div>
      <div className="tc-executive-summary-metrics">
        <div><span>Presença</span><strong>{attendanceRate.toFixed(0)}%</strong><small>hoje</small></div>
        <div><span>Atenção</span><strong>{openAlerts.length}</strong><small>alertas</small></div>
        <div><span>Decisões</span><strong>{pendingVacations.length + pendingOvertime.length}</strong><small>pendentes</small></div>
      </div>
    </section>

    <section className="tc-priority-panel">
      <div className="tc-priority-head">
        <div>
          <div className="tc-dashboard-section-kicker"><Target size={13}/> CENTRO DE AÇÃO</div>
          <h2>O que merece atenção agora</h2>
          <span>O Te-connect transforma os sinais do RH em próximos passos claros.</span>
        </div>
        <div className="tc-priority-head-actions">
          <span className="tc-priority-count">{priorityActions.length} ações</span>
          <button type="button" className="tc-priority-refresh" onClick={() => load(true)} aria-label="Atualizar indicadores"><RefreshCw size={14}/> Atualizar</button>
        </div>
      </div>
      <div className="tc-priority-grid">
        {priorityActions.length ? priorityActions.map((item) => {
          const Icon = item.icon;
          return <button type="button" className={`tc-priority-card ${item.tone}`} key={item.id} onClick={() => onNavigate(item.target)}>
            <div className="tc-priority-icon"><Icon size={17}/></div>
            <div className="tc-priority-copy"><small>{item.eyebrow}</small><strong>{item.title}</strong><span>{item.detail}</span><b>{item.action} <ArrowRight size={13}/></b></div>
          </button>;
        }) : <div className="tc-priority-empty"><CheckCircle2 size={19}/><div><strong>Operação sob controlo</strong><span>Não existem pendências prioritárias neste momento.</span></div></div>}
      </div>
    </section>

    <section className="tc-operational-strip">
      <div className="tc-operational-intro">
        <div className="tc-dashboard-section-kicker"><Activity size={13}/> COCKPIT OPERACIONAL</div>
        <h2>Saiba como a operação está antes de abrir os módulos.</h2>
        <span>Indicadores calculados diretamente dos dados da sua empresa.</span>
      </div>
      <div className="tc-operational-signals">
        {operationalSignals.map((item) => {
          const Icon = item.icon;
          return <div className={`tc-operational-signal ${item.tone}`} key={item.label}>
            <div className="tc-operational-signal-icon"><Icon size={15}/></div>
            <div><small>{item.label}</small><strong>{item.value}</strong><span>{item.detail}</span></div>
          </div>;
        })}
      </div>
    </section>

    <div className="tc-dashboard-grid">
      <section className="suite-card tc-chart-card">
        <div className="tc-card-head"><div><h2>Presença & assiduidade</h2><span>Evolução da presença da equipa nos últimos 7 dias.</span></div><div className="tc-card-actions"><span className="tc-live-chip">● Ao vivo</span><select defaultValue="7"><option value="7">Últimos 7 dias</option></select></div></div>
        <div className="tc-bar-chart">{presenceSeries.map((item) => <div className="tc-bar-col" key={item.key}><strong>{item.value.toFixed(0)}%</strong><div className="tc-bar-track"><div className="tc-bar-fill" style={{ height: Math.max(8,item.value) + '%' }} /></div><span>{item.label}</span></div>)}</div>
      </section>

      <section className="suite-card tc-alert-card">
        <div className="tc-card-head"><div><h2>Centro de alertas</h2><span>O que merece atenção agora.</span></div><button className="tc-link-btn" onClick={() => onNavigate('alerts')}>Ver todos →</button></div>
        <div className="tc-alert-list">{alertItems.map((item, index) => { const Icon = item.icon; return <div className="tc-alert-item" key={index}><div className={'tc-alert-icon ' + item.tone}><Icon size={16}/></div><div><strong>{item.title}</strong><span>{item.subtitle}</span></div><time>{item.when}</time></div>; })}{alertItems.length === 0 && <div className="suite-empty">Sem alertas críticos.</div>}</div>
      </section>
    </div>

    <div className="tc-lower-grid">
      <section className="suite-card tc-simple-card"><div className="tc-card-head"><div><h2>Colaboradores em destaque</h2><span>Estado operacional da equipa.</span></div><button className="tc-link-btn" onClick={() => onNavigate('people')}>Ver todos →</button></div><div className="tc-highlight-list">
        {highlights.map(({employee,label,tone}) => <button className="tc-highlight-row" key={employee.id} onClick={() => onNavigate('people')}><span className="tc-avatar">{initials(employee.full_name)}</span><span className="tc-highlight-main"><strong>{employee.full_name}</strong><small>{employee.employee_code || 'Colaborador'}</small></span><span className={'tc-status ' + tone}>● {label}</span></button>)}
        {highlights.length===0 && <div className="suite-empty">Ainda não existem colaboradores.</div>}
      </div></section>
      <section className="suite-card tc-simple-card"><div className="tc-card-head"><div><h2>Próximos eventos</h2><span>Agenda operacional do RH.</span></div><button className="tc-link-btn" onClick={() => onNavigate('recruitment')}>Ver todos →</button></div><div className="tc-event-list">
        {upcoming.map((item,index) => { const Icon = item.icon; return <div className="tc-event-row" key={index}><div className="tc-event-icon"><Icon size={15}/></div><div><strong>{item.title}</strong><span>{item.subtitle}</span></div><time>{item.when}</time></div>; })}
        {upcoming.length===0 && <div className="suite-empty">Sem eventos próximos.</div>}
      </div></section>
    </div>

    <div className="tc-bottom-grid">
      <button className="suite-card tc-bottom-card" onClick={() => onNavigate('vacations')}><div className="tc-bottom-icon blue"><FileText size={18}/></div><div><strong>Pedidos pendentes</strong><span>Férias, ajustes e ausências.</span><b>{pendingVacations.length + pendingOvertime.length}</b></div><ArrowRight size={18}/></button>
      <button className="suite-card tc-bottom-card" onClick={() => onNavigate('attendance')}><div className="tc-bottom-icon blue"><Clock3 size={18}/></div><div><strong>Horas extra</strong><span>Esta semana.</span><b>{minutes(overtimeWeek)}</b></div><ArrowRight size={18}/></button>
      <button className="suite-card tc-bottom-card" onClick={() => onNavigate('vacations')}><div className="tc-bottom-icon blue"><CalendarCheck size={18}/></div><div><strong>Férias a aprovar</strong><span>Pedidos em análise.</span><b>{pendingVacations.length}</b></div><ArrowRight size={18}/></button>
      <button className="suite-card tc-intelligence-card" onClick={() => onOpenPanel?.('analytics')}><div className="tc-intelligence-spark"><Sparkles size={22}/></div><div><strong>Intelligence Center</strong><span>Riscos, tendências e recomendações para agir antes do problema.</span></div><ArrowRight size={18}/></button>
      <button className="suite-card tc-help-card" onClick={() => onNavigate('notifications')}><div className="tc-help-icon">◉</div><div><strong>Precisa de ajuda?</strong><span>A nossa equipa está disponível.</span><b>Falar agora</b></div></button>
    </div>
  </>;
}

function DashboardKpi({ icon: Icon, label, value, trend, tone, onClick }) {
  return <button type="button" className={'tc-kpi-card ' + tone} onClick={onClick}><div className="tc-kpi-icon"><Icon size={20}/></div><div className="tc-kpi-copy"><span>{label}</span><strong>{value}</strong><small>{trend}</small></div><ArrowRight size={18}/></button>;
}

function People({ employees, query, setQuery, canManage, onCreate, onOpen }) { const filtered = employees.filter((e) => `${e.full_name} ${e.email} ${e.employee_code} ${e.status}`.toLowerCase().includes(query.toLowerCase())); return <><div className="suite-section-head"><div><h2>Colaboradores</h2><span>{employees.length} registos acessíveis ao seu perfil</span></div>{canManage && <Button variant="primary" icon={UserPlus} onClick={onCreate}>Novo colaborador</Button>}</div><div className="suite-toolbar"><div className="suite-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar nome, código ou email" /></div><Filter size={16} /></div><div className="suite-card table-wrap"><table className="suite-table"><thead><tr><th>Colaborador</th><th>Código</th><th>Email</th><th>Admissão</th><th>Estado</th><th /></tr></thead><tbody>{filtered.map((employee) => <tr key={employee.id}><td><button className="suite-person-cell" onClick={() => onOpen(employee)}><span className="suite-avatar">{initials(employee.full_name)}</span><span><strong>{employee.full_name}</strong><small>{employee.phone || 'Sem telefone'}</small></span></button></td><td>{employee.employee_code || '—'}</td><td>{employee.email || '—'}</td><td>{date(employee.hire_date)}</td><td><Badge tone={employee.status === 'ACTIVE' ? 'positive' : 'warning'}>{employee.status}</Badge></td><td><ArrowRight size={15} /></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="suite-empty">Nenhum colaborador encontrado.</div>}</div></>; }

function Recruitment({ jobs, candidates, interviews, candidateMap, employeeMap, onCreateCandidate, onCreateJob, onInterview, onStage }) { const stages = ['SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']; return <><div className="suite-section-head"><div><h2>Recrutamento</h2><span>{jobs.length} vagas · {candidates.length} candidatos · {interviews.length} entrevistas</span></div><div className="suite-actions"><Button icon={CalendarCheck} onClick={onInterview}>Agendar entrevista</Button><Button icon={UserPlus} onClick={onCreateCandidate}>Novo candidato</Button><Button variant="primary" icon={Plus} onClick={onCreateJob}>Nova vaga</Button></div></div><div className="suite-grid-3">{jobs.slice(0, 6).map((job) => <div className="suite-panel" key={job.id}><div className="suite-panel-head"><div><h3>{job.title}</h3><span>{job.location || 'Local a definir'} · {job.employment_type || '—'}</span></div><Badge tone={job.status === 'OPEN' ? 'positive' : 'neutral'}>{job.status}</Badge></div><div className="suite-shift-metrics"><div><span>Candidatos</span><strong>{candidates.filter((c) => c.job_id === job.id).length}</strong></div><div><span>Entrevistas</span><strong>{interviews.filter((i) => candidateMap.get(i.candidate_id)?.job_id === job.id).length}</strong></div><div><span>Aberta em</span><strong>{date(job.opened_at)}</strong></div></div></div>)}</div><div className="suite-kanban">{stages.map((stage) => <section className="suite-kanban-col" key={stage}><div className="suite-kanban-head"><strong>{stage}</strong><span>{candidates.filter((c) => c.stage === stage).length}</span></div>{candidates.filter((c) => c.stage === stage).slice(0, 12).map((candidate) => <div className="suite-candidate-card suite-card" key={candidate.id}><div className="suite-candidate-top"><span className="suite-avatar">{initials(candidate.full_name)}</span><Badge tone="neutral">{candidate.source || 'Directo'}</Badge></div><strong>{candidate.full_name}</strong><span>{candidate.email || 'Sem email'}</span><small>{candidate.job_id ? jobs.find((j) => j.id === candidate.job_id)?.title || 'Vaga' : 'Candidatura espontânea'}</small><div className="suite-actions"><Button tc-small="true" onClick={() => onStage(candidate.id, stage === 'SCREENING' ? 'INTERVIEW' : stage === 'INTERVIEW' ? 'OFFER' : stage === 'OFFER' ? 'HIRED' : stage)}>{stage === 'SCREENING' ? 'Avançar para entrevista' : stage === 'INTERVIEW' ? 'Avançar para proposta' : stage === 'OFFER' ? 'Marcar contratado' : 'Atualizar'}</Button></div></div>)}</section>)}</div></>; }

function Onboarding({ employees, documents, invitations, trainings, onInvite, onOpenAccess }) { const rows = employees.slice(0, 50).map((employee) => { const docs = documents.filter((d) => d.employee_id === employee.id).length; const invites = invitations.filter((i) => i.employee_id === employee.id); const training = trainings.filter((t) => t.employee_id === employee.id); const parts = [Boolean(docs), Boolean(invites.find((i) => i.status === 'ACCEPTED')), Boolean(training.find((t) => ['COMPLETED', 'DONE'].includes(t.status)))]; const progress = Math.round(parts.filter(Boolean).length / 3 * 100); return { employee, docs, invitation: invites[0], training: training[0], progress }; }); return <><div className="suite-section-head"><div><h2>Onboarding</h2><span>Estado real de documentação, acesso e formação após admissão.</span></div><div className="suite-actions"><Button onClick={onInvite} icon={MessageSquareText}>Apoio de acesso</Button><Button variant="primary" onClick={onOpenAccess} icon={ShieldCheck}>Gestor de acessos</Button></div></div><div className="suite-card table-wrap"><table className="suite-table"><thead><tr><th>Colaborador</th><th>Documentos</th><th>Acesso</th><th>Formação</th><th>Progresso</th></tr></thead><tbody>{rows.map(({ employee, docs, invitation, training, progress }) => <tr key={employee.id}><td>{employee.full_name}</td><td>{docs}</td><td>{invitation?.status || 'Não enviado'}</td><td>{training?.status || 'Não atribuída'}</td><td><div style={{ minWidth: 150 }}><div className="suite-score-row"><span>{progress}%</span><strong>{progress === 100 ? 'Concluído' : 'Em preparação'}</strong></div><div className="suite-progress"><span style={{ width: `${progress}%` }} /></div></div></td></tr>)}</tbody></table>{rows.length === 0 && <div className="suite-empty">Sem colaboradores para acompanhar.</div>}</div></>; }

function Attendance({ attendance, employees, onOpenAttendance }) { const recent = attendance.slice(0, 30); return <><div className="suite-section-head"><div><h2>Ponto & assiduidade</h2><span>Motor real com GPS, turno, pausas e cálculo no backend.</span></div><Button variant="primary" icon={Clock3} onClick={onOpenAttendance}>Abrir marcação real</Button></div><div className="suite-grid-3"><div className="suite-kpi compact"><span>Registos analisados</span><strong>{attendance.length}</strong><span>últimos movimentos</span></div><div className="suite-kpi compact"><span>Atrasos</span><strong>{attendance.filter((a) => Number(a.late_minutes) > 0).length}</strong><span>exceções</span></div><div className="suite-kpi compact"><span>Horas extra</span><strong>{minutes(attendance.reduce((s, a) => s + Number(a.overtime_minutes || 0), 0))}</strong><span>registos atuais</span></div></div><div className="suite-card table-wrap"><table className="suite-table"><thead><tr><th>Data</th><th>Colaborador</th><th>Trabalhado</th><th>Atraso</th><th>Extra</th><th>Noite</th><th>Estado</th></tr></thead><tbody>{recent.map((row) => <tr key={row.id}><td>{date(row.work_date)}</td><td>{employees.find((e) => e.id === row.employee_id)?.full_name || 'Colaborador'}</td><td>{minutes(row.worked_minutes)}</td><td>{Number(row.late_minutes || 0)} min</td><td>{Number(row.overtime_minutes || 0)} min</td><td>{Number(row.night_minutes || 0)} min</td><td><Badge tone={Number(row.late_minutes || 0) ? 'warning' : 'positive'}>{row.status}</Badge></td></tr>)}</tbody></table>{recent.length === 0 && <div className="suite-empty">Ainda não existem registos de assiduidade.</div>}</div></>; }

function Vacations({ requests, employees, canApprove, canManage, onCreate, onApprove }) { return <><div className="suite-section-head"><div><h2>Férias & ausências</h2><span>Pedidos com fluxo de aprovação e saldo ligado ao backend.</span></div><Button variant="primary" icon={Plus} onClick={onCreate}>Novo pedido</Button></div><div className="suite-card table-wrap"><table className="suite-table"><thead><tr><th>Colaborador</th><th>Período</th><th>Dias</th><th>Motivo</th><th>Estado</th><th>Ação</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td>{employees.find((e) => e.id === request.employee_id)?.full_name || 'Colaborador'}</td><td>{date(request.start_date)} → {date(request.end_date)}</td><td>{request.days}</td><td>{request.reason || '—'}</td><td><Badge tone={request.status === 'APPROVED' ? 'positive' : request.status === 'PENDING' ? 'warning' : 'neutral'}>{request.status}</Badge></td><td>{request.status === 'PENDING' && canApprove && <div className="suite-inline-actions"><button className="suite-icon-btn" onClick={() => onApprove(request, true)}><Check size={15} /></button><button className="suite-icon-btn danger" onClick={() => onApprove(request, false)}><X size={15} /></button></div>}</td></tr>)}</tbody></table>{requests.length === 0 && <div className="suite-empty">Nenhum pedido de férias ou ausência neste tenant.</div>}</div></>; }

function Documents({ documents, employees, canManage, onOpen, onUpload }) { return <><div className="suite-section-head"><div><h2>Documentos & conformidade</h2><span>Arquivo privado com URLs assinadas e alertas de validade.</span></div><span className="suite-page-meta"><ShieldCheck size={14} /> Storage privado</span></div><div className="suite-grid-3">{documents.map((doc) => { const expiring = doc.expires_at && new Date(doc.expires_at) <= new Date(Date.now() + 30 * 86400000); return <div className="suite-panel" key={doc.id}><div className="suite-document-icon"><FileText size={18} /></div><div className="suite-panel-head"><div><h3>{doc.title || doc.document_type}</h3><span>{employees.find((e) => e.id === doc.employee_id)?.full_name || 'Colaborador'}</span></div><Badge tone={expiring ? 'warning' : 'positive'}>{expiring ? 'A expirar' : doc.status || 'VALID'}</Badge></div><div className="suite-doc-date">Validade <strong>{date(doc.expires_at)}</strong></div><div className="suite-actions"><Button icon={FileText} onClick={() => onOpen(doc)}>Abrir</Button>{canManage && <Button icon={Upload} onClick={() => onUpload(employees.find((e) => e.id === doc.employee_id))}>Novo ficheiro</Button>}</div></div>; })}{documents.length === 0 && <div className="suite-empty">Ainda não existem documentos arquivados.</div>}</div></>; }

function Development({ employees, courses, trainings, competencies, courseMap, canManage, onAssign }) { return <><div className="suite-section-head"><div><h2>Desenvolvimento</h2><span>Formação, certificados e competências num só lugar.</span></div>{canManage && <Button variant="primary" icon={Plus} onClick={onAssign}>Atribuir formação</Button>}</div><div className="suite-grid-3">{courses.slice(0, 6).map((course) => <div className="suite-panel" key={course.id}><div className="suite-panel-head"><div><h3>{course.name}</h3><span>{course.duration_hours || 0} h</span></div><BookOpen size={18} /></div><p className="suite-muted">{course.description || 'Curso interno da organização.'}</p><div className="suite-score-row"><span>Inscrições</span><strong>{trainings.filter((t) => t.course_id === course.id).length}</strong></div></div>)}</div><div className="suite-card table-wrap"><table className="suite-table"><thead><tr><th>Colaborador</th><th>Formação</th><th>Estado</th><th>Score</th><th>Certificado</th></tr></thead><tbody>{trainings.slice(0, 50).map((item) => <tr key={item.id}><td>{employees.find((e) => e.id === item.employee_id)?.full_name || 'Colaborador'}</td><td>{courseMap.get(item.course_id)?.name || item.course_id}</td><td><Badge tone={item.status === 'COMPLETED' ? 'positive' : 'warning'}>{item.status}</Badge></td><td>{item.score ?? '—'}</td><td>{item.certificate_url ? <Paperclip size={15} /> : '—'}</td></tr>)}</tbody></table>{trainings.length === 0 && <div className="suite-empty">Ainda não existem formações atribuídas.</div>}</div><div className="suite-panel"><div className="suite-panel-head"><div><h2>Competências registadas</h2><span>{competencies.length} avaliações</span></div><Target size={18} /></div><div className="suite-kanban">{competencies.slice(0, 12).map((item) => <div className="suite-card" key={item.id}><strong>{employees.find((e) => e.id === item.employee_id)?.full_name || 'Colaborador'}</strong><span>{item.competency} · {item.level}</span><small>{date(item.assessed_at)}</small></div>)}</div></div></>; }

function Tasks({ tasks, employees, canManage, onCreate, onReload, notify }) { const columns = [['PENDING', 'Pendentes'], ['IN_PROGRESS', 'Em curso'], ['DONE', 'Concluídas']]; const change = async (task, status) => { const { error } = await supabase.from('hr_tasks').update({ status, completed_at: status === 'DONE' ? new Date().toISOString() : null, completed_by: status === 'DONE' ? undefined : null }).eq('id', task.id); if (error) notify(error.message, 'error'); else { notify('Tarefa atualizada.'); onReload(); } }; return <><div className="suite-section-head"><div><h2>Tarefas RH</h2><span>Fila de trabalho operacional com trilho de auditoria.</span></div>{canManage && <Button variant="primary" icon={Plus} onClick={onCreate}>Nova tarefa</Button>}</div><div className="suite-kanban">{columns.map(([status, label]) => <section className="suite-kanban-col" key={status}><div className="suite-kanban-head"><strong>{label}</strong><span>{tasks.filter((t) => t.status === status).length}</span></div>{tasks.filter((t) => t.status === status).slice(0, 30).map((task) => <div className="suite-card suite-candidate-card" key={task.id}><strong>{task.title}</strong><small>{task.priority} · {task.category || 'RH'}</small><small>{task.due_at ? `Prazo: ${date(task.due_at)}` : 'Sem prazo'}</small><span>{employees.find((e) => e.id === task.employee_id)?.full_name || 'Sem colaborador ligado'}</span><div className="suite-actions">{status === 'PENDING' && <Button onClick={() => change(task, 'IN_PROGRESS')}>Iniciar</Button>}{status === 'IN_PROGRESS' && <Button variant="primary" onClick={() => change(task, 'DONE')} icon={Check}>Concluir</Button>}</div></div>)}</section>)}</div></>; }

function Alerts({ alerts, employees, onResolve }) { return <><div className="suite-section-head"><div><h2>Alertas</h2><span>Exceções geradas pelo motor operacional.</span></div><Badge tone="warning">{alerts.length} abertos</Badge></div><div className="suite-card">{alerts.map((alert) => <div className="suite-alert-row" key={alert.id}><div className={`suite-alert-icon ${String(alert.severity).toLowerCase()}`}><AlertTriangle size={16} /></div><div className="suite-row-main"><strong>{alert.title}</strong><span>{alert.message}{employees.find((e) => e.id === alert.employee_id) ? ` · ${employees.find((e) => e.id === alert.employee_id)?.full_name}` : ''}</span><small>{alert.score ?? 0}/100 · criado {date(alert.created_at)}</small></div><div className="suite-actions"><Badge tone={String(alert.severity).toLowerCase() === 'high' ? 'danger' : 'warning'}>{alert.severity}</Badge><Button icon={Check} onClick={() => onResolve(alert)}>Resolver</Button></div></div>)}{alerts.length === 0 && <div className="suite-empty">Nenhum alerta aberto.</div>}</div></>; }

function Payroll({ runs, onOpen }) { return <><div className="suite-section-head"><div><h2>Folha</h2><span>Preparação e fecho de períodos com controlo de estado.</span></div><Button variant="primary" icon={Layers3} onClick={onOpen}>Abrir centro de folha</Button></div><div className="suite-card table-wrap"><table className="suite-table"><thead><tr><th>Período</th><th>Estado</th><th>Colaboradores</th><th>Bruto</th><th>Extra</th><th>Noite</th><th>Líquido</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id}><td>{String(run.period_month).padStart(2, '0')}/{run.period_year}</td><td><Badge>{run.status}</Badge></td><td>{run.employee_count || 0}</td><td>{money(run.gross_cents)}</td><td>{money(run.overtime_cents)}</td><td>{money(run.night_cents)}</td><td>{money(run.net_cents)}</td></tr>)}</tbody></table>{runs.length === 0 && <div className="suite-empty">Nenhum ciclo registado.</div>}</div></>; }

function Integrations({ jobs, onRefresh }) { const healthy = jobs.filter((j) => !['FAILED', 'ERROR'].includes(String(j.status).toUpperCase())).length; return <><div className="suite-section-head"><div><h2>Integrações</h2><span>Estado real da fila assíncrona e tentativas.</span></div><Button onClick={onRefresh} icon={RefreshCw}>Atualizar</Button></div><div className="suite-kpis"><div className="suite-kpi"><span>Jobs</span><strong>{jobs.length}</strong><span>últimos registos</span></div><div className="suite-kpi"><span>Sem falha</span><strong>{healthy}</strong><span>processamentos</span></div><div className="suite-kpi"><span>Falhas</span><strong>{jobs.length - healthy}</strong><span>requerem investigação</span></div></div><div className="suite-card table-wrap"><table className="suite-table"><thead><tr><th>Fornecedor</th><th>Operação</th><th>Entidade</th><th>Estado</th><th>Tentativas</th><th>Erro</th></tr></thead><tbody>{jobs.slice(0, 100).map((job) => <tr key={job.id}><td>{job.provider}</td><td>{job.operation}</td><td>{job.entity_type}</td><td><Badge tone={['FAILED', 'ERROR'].includes(String(job.status).toUpperCase()) ? 'danger' : 'positive'}>{job.status}</Badge></td><td>{job.attempts}</td><td>{job.last_error || '—'}</td></tr>)}</tbody></table>{jobs.length === 0 && <div className="suite-empty">Nenhuma integração registada.</div>}</div></>; }

function Notifications({ notifications, unread, onRead }) { return <><div className="suite-section-head"><div><h2>Notificações</h2><span>{unread} por ler</span></div></div><div className="suite-card">{notifications.map((item) => <div className={`notification-row ${!item.read_at ? 'unread' : ''}`} key={item.id}><div className="suite-notification-icon"><Bell size={16} /></div><div className="suite-row-main"><strong>{item.title}</strong><span>{item.message}</span><small>{date(item.created_at)}</small></div>{!item.read_at && <Button icon={Check} onClick={() => onRead(item.id)}>Lida</Button>}</div>)}{notifications.length === 0 && <div className="suite-empty">Sem notificações para este utilizador.</div>}</div></>; }

function EmployeeForm({ onClose, onSave }) { const [form, setForm] = useState({ employee_code: '', full_name: '', email: '', phone: '', nif: '', department_id: '', position_id: '', hire_date: today() }); const patch = (key, value) => setForm((current) => ({ ...current, [key]: value })); return <Modal title="Novo colaborador" onClose={onClose}><form className="suite-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }}><div className="suite-form-grid"><Field label="Nome"><input value={form.full_name} onChange={(e) => patch('full_name', e.target.value)} required autoFocus /></Field><Field label="Código"><input value={form.employee_code} onChange={(e) => patch('employee_code', e.target.value)} required /></Field><Field label="Email"><input type="email" value={form.email} onChange={(e) => patch('email', e.target.value)} /></Field><Field label="Telefone"><input value={form.phone} onChange={(e) => patch('phone', e.target.value)} /></Field><Field label="NIF"><input value={form.nif} onChange={(e) => patch('nif', e.target.value)} /></Field><Field label="Data de admissão"><input type="date" value={form.hire_date} onChange={(e) => patch('hire_date', e.target.value)} /></Field></div><div className="suite-modal-actions"><Button onClick={onClose}>Cancelar</Button><Button variant="primary" type="submit">Criar</Button></div></form></Modal>; }
function EmployeeDetail({ employee, documents, trainings, onClose }) { return <Modal title={employee.full_name} onClose={onClose}><div className="suite-profile-head"><span className="suite-avatar xl">{initials(employee.full_name)}</span><div><h3>{employee.email || 'Sem email'}</h3><span>{employee.employee_code || '—'} · {employee.status}</span></div></div><div className="suite-detail-grid"><div><span>Admissão</span><strong>{date(employee.hire_date)}</strong><small>{employee.nif || 'NIF não registado'}</small></div><div><span>Contacto</span><strong>{employee.phone || '—'}</strong><small>{employee.email || '—'}</small></div><div><span>Documentos</span><strong>{documents.length}</strong><small>registos no tenant</small></div><div><span>Formação</span><strong>{trainings.length}</strong><small>atribuições</small></div></div><div className="suite-note"><ShieldCheck size={16} /><span>Os dados apresentados são filtrados pelas políticas de acesso da organização.</span></div></Modal>; }
function CandidateForm({ jobs, onClose, onSave }) { const [form, setForm] = useState({ job_id: jobs[0]?.id || '', full_name: '', email: '', phone: '', source: 'Site', notes: '' }); const p = (k, v) => setForm((f) => ({ ...f, [k]: v })); return <Modal title="Novo candidato" onClose={onClose}><form className="suite-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }}><Field label="Vaga"><select value={form.job_id} onChange={(e) => p('job_id', e.target.value)}><option value="">Candidatura espontânea</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select></Field><div className="suite-form-grid"><Field label="Nome"><input value={form.full_name} onChange={(e) => p('full_name', e.target.value)} required /></Field><Field label="Email"><input type="email" value={form.email} onChange={(e) => p('email', e.target.value)} /></Field><Field label="Telefone"><input value={form.phone} onChange={(e) => p('phone', e.target.value)} /></Field><Field label="Origem"><input value={form.source} onChange={(e) => p('source', e.target.value)} /></Field></div><Field label="Notas"><textarea rows="4" value={form.notes} onChange={(e) => p('notes', e.target.value)} /></Field><div className="suite-modal-actions"><Button onClick={onClose}>Cancelar</Button><Button variant="primary" type="submit">Adicionar</Button></div></form></Modal>; }
function JobForm({ onClose, onSave }) { const [form, setForm] = useState({ title: '', location: '', employment_type: 'FULL_TIME', description: '' }); const p = (k, v) => setForm((f) => ({ ...f, [k]: v })); return <Modal title="Nova vaga" onClose={onClose}><form className="suite-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }}><Field label="Título"><input value={form.title} onChange={(e) => p('title', e.target.value)} required autoFocus /></Field><div className="suite-form-grid"><Field label="Local"><input value={form.location} onChange={(e) => p('location', e.target.value)} /></Field><Field label="Tipo"><select value={form.employment_type} onChange={(e) => p('employment_type', e.target.value)}><option>FULL_TIME</option><option>PART_TIME</option><option>FIXED_TERM</option><option>INTERNSHIP</option></select></Field></div><Field label="Descrição"><textarea rows="5" value={form.description} onChange={(e) => p('description', e.target.value)} /></Field><div className="suite-modal-actions"><Button onClick={onClose}>Cancelar</Button><Button variant="primary" type="submit">Criar vaga</Button></div></form></Modal>; }
function InterviewForm({ candidates, employees, onClose, onSave }) { const [form, setForm] = useState({ candidate_id: candidates[0]?.id || '', interviewer_id: '', scheduled_at: '' }); const p = (k, v) => setForm((f) => ({ ...f, [k]: v })); return <Modal title="Agendar entrevista" onClose={onClose}><form className="suite-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }}><Field label="Candidato"><select value={form.candidate_id} onChange={(e) => p('candidate_id', e.target.value)}>{candidates.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></Field><Field label="Entrevistador"><select value={form.interviewer_id} onChange={(e) => p('interviewer_id', e.target.value)}><option value="">Por atribuir</option>{employees.map((e) => <option key={e.id} value={e.user_id || ''}>{e.full_name}</option>)}</select></Field><Field label="Data e hora"><input type="datetime-local" value={form.scheduled_at} onChange={(e) => p('scheduled_at', e.target.value)} required /></Field><div className="suite-modal-actions"><Button onClick={onClose}>Cancelar</Button><Button variant="primary" type="submit">Agendar</Button></div></form></Modal>; }
function VacationForm({ employees, self, onClose, onSave }) { const [form, setForm] = useState({ employee_id: employees[0]?.id || '', start_date: today(), end_date: today(), days: 1, reason: '' }); const p = (k, v) => setForm((f) => ({ ...f, [k]: v })); return <Modal title="Novo pedido de férias" onClose={onClose}><form className="suite-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }}><Field label="Colaborador"><select disabled={self} value={form.employee_id} onChange={(e) => p('employee_id', e.target.value)}>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></Field><div className="suite-form-grid"><Field label="Início"><input type="date" value={form.start_date} onChange={(e) => p('start_date', e.target.value)} required /></Field><Field label="Fim"><input type="date" value={form.end_date} onChange={(e) => p('end_date', e.target.value)} required /></Field><Field label="Dias"><input type="number" min="0.5" step="0.5" value={form.days} onChange={(e) => p('days', e.target.value)} required /></Field></div><Field label="Motivo"><textarea rows="3" value={form.reason} onChange={(e) => p('reason', e.target.value)} /></Field><div className="suite-modal-actions"><Button onClick={onClose}>Cancelar</Button><Button variant="primary" type="submit">Submeter</Button></div></form></Modal>; }
function TaskForm({ employees, onClose, onSave }) { const [form, setForm] = useState({ title: '', description: '', category: 'HR', priority: 'NORMAL', assignee_id: '', employee_id: '', due_at: '' }); const p = (k, v) => setForm((f) => ({ ...f, [k]: v })); return <Modal title="Nova tarefa RH" onClose={onClose}><form className="suite-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }}><Field label="Título"><input value={form.title} onChange={(e) => p('title', e.target.value)} required autoFocus /></Field><Field label="Descrição"><textarea rows="3" value={form.description} onChange={(e) => p('description', e.target.value)} /></Field><div className="suite-form-grid"><Field label="Prioridade"><select value={form.priority} onChange={(e) => p('priority', e.target.value)}><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></select></Field><Field label="Categoria"><input value={form.category} onChange={(e) => p('category', e.target.value)} /></Field><Field label="Colaborador ligado"><select value={form.employee_id} onChange={(e) => p('employee_id', e.target.value)}><option value="">Nenhum</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></Field><Field label="Prazo"><input type="datetime-local" value={form.due_at} onChange={(e) => p('due_at', e.target.value)} /></Field></div><div className="suite-modal-actions"><Button onClick={onClose}>Cancelar</Button><Button variant="primary" type="submit">Criar tarefa</Button></div></form></Modal>; }
function TrainingForm({ employees, courses, item, onClose, onSave }) { const [form, setForm] = useState({ employee_id: item?.employee_id || employees[0]?.id || '', course_id: item?.course_id || courses[0]?.id || '', status: 'PLANNED' }); const p = (k, v) => setForm((f) => ({ ...f, [k]: v })); return <Modal title="Atribuir formação" onClose={onClose}><form className="suite-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }}><Field label="Colaborador"><select value={form.employee_id} onChange={(e) => p('employee_id', e.target.value)}>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></Field><Field label="Curso"><select value={form.course_id} onChange={(e) => p('course_id', e.target.value)}>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Estado inicial"><select value={form.status} onChange={(e) => p('status', e.target.value)}><option>PLANNED</option><option>IN_PROGRESS</option></select></Field><div className="suite-modal-actions"><Button onClick={onClose}>Cancelar</Button><Button variant="primary" type="submit">Atribuir</Button></div></form></Modal>; }
function DocumentForm({ employeeName, item, onClose, onFile }) { const [meta, setMeta] = useState(item); const p = (k, v) => setMeta((f) => ({ ...f, [k]: v })); return <Modal title={`Carregar documento · ${employeeName}`} onClose={onClose}><form className="suite-form" onSubmit={(e) => e.preventDefault()}><div className="suite-form-grid"><Field label="Tipo"><select value={meta.document_type} onChange={(e) => p('document_type', e.target.value)}><option>CONTRACT</option><option>ID_DOCUMENT</option><option>CERTIFICATE</option><option>TRAINING_CERTIFICATE</option><option>OTHER</option></select></Field><Field label="Emissão"><input type="date" value={meta.issued_at || ''} onChange={(e) => p('issued_at', e.target.value)} /></Field><Field label="Validade"><input type="date" value={meta.expires_at || ''} onChange={(e) => p('expires_at', e.target.value)} /></Field></div><div className="suite-note"><Upload size={16} /><span>Ficheiro privado até 10 MB. PDF, PNG, JPG ou WEBP.</span></div><input id="document-upload" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => onFile(e.target.files?.[0])} /><div className="suite-modal-actions"><Button onClick={onClose}>Cancelar</Button></div></form></Modal>; }
function BriefcaseIcon(props) { return <Briefcase {...props} />; }
function Briefcase(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="17" height="17" aria-hidden="true"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M2 12h20"/></svg>; }
