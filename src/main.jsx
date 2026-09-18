import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronUp,
  CreditCard,
  FileUp,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  Settings2,
  Shield,
  UserCog,
  UsersRound,
  Clock3,
  UserRound,
  X,
  Send,
} from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import TeconnectSuite from './TeconnectSuite.jsx';
import ProductionWorkspace from './ProductionWorkspace.jsx';
import EnterpriseCommandCenter from './EnterpriseCommandCenter.jsx';
import AttendanceWorkspace from './attendance/AttendanceWorkspace.jsx';
import AuditCenter from './audit/AuditCenter.jsx';
import EmployeeAccessManager from './commercial/EmployeeAccessManager.jsx';
import ApprovalsCenter from './commercial/ApprovalsCenter.jsx';
import PayrollControlCenter from './payroll/PayrollControlCenter.jsx';
import BillingPage from './commercial/BillingPage.jsx';
import OnboardingPage from './commercial/OnboardingPage.jsx';
import SuperAdminPage from './commercial/SuperAdminPage.jsx';
import Employee360Panel from './people/Employee360Panel.jsx';
import PerformanceCenter from './people/PerformanceCenter.jsx';
import SelfServicePanel from './people/SelfServicePanel.jsx';
import EmployeeRequestCenter from './people/EmployeeRequestCenter.jsx';
import EmployeeImportPanel from './people/EmployeeImportPanel.jsx';
import LifecycleCenter from './people/LifecycleCenter.jsx';
import EmployeeMobileWorkspace from './employee/EmployeeMobileWorkspace.jsx';
import SetupWizard from './commercial/SetupWizard.jsx';
import ExceptionCenter from './ops/ExceptionCenter.jsx';
import PeopleAnalyticsCenter from './analytics/PeopleAnalyticsCenter.jsx';
import SecurityCenter from './security/SecurityCenter.jsx';
import PrivacyCenter from './security/PrivacyCenter.jsx';
import IntegrationsCenter from './integrations/IntegrationsCenter.jsx';
import RulesCenter from './company/RulesCenter.jsx';
import RoleCenter from './security/RoleCenter.jsx';
import './styles.css';
import './mobile.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
let supabase = null;
let supabaseInitError = null;

try {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Configuração do Supabase não encontrada no aplicativo.');
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
} catch (error) {
  supabaseInitError = error;
}


const ADMIN_HR_ROLES = new Set(['SUPER_ADMIN', 'COMPANY_ADMIN', 'RH']);
const MANAGER_ROLES = new Set(['GESTOR', 'SUPERVISOR']);
const roleLabels = {
  SUPER_ADMIN: 'Super Admin',
  COMPANY_ADMIN: 'Admin da empresa',
  RH: 'RH',
  GESTOR: 'Gestor',
  SUPERVISOR: 'Supervisor',
  EMPLOYEE: 'Colaborador',
};

function StartupError({ error }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#07101f', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 460, padding: 28, borderRadius: 20, border: '1px solid rgba(255,255,255,.1)', background: '#0d1728', boxShadow: '0 20px 60px rgba(0,0,0,.35)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#15263f', marginBottom: 18, fontWeight: 800 }}>T</div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Te-connect</h1>
        <p style={{ color: 'rgba(255,255,255,.65)', lineHeight: 1.6, margin: '10px 0 18px' }}>O aplicativo não conseguiu inicializar. Verifique a configuração e abra novamente.</p>
        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#fecaca', fontSize: 13 }}>
          {error?.message || 'Erro de inicialização.'}
        </div>
      </div>
    </div>
  );
}

function NativeLogin({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      onSuccess(data.session || null);
    } catch (loginError) {
      setError(loginError?.message || 'Não foi possível iniciar sessão.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px 18px calc(24px + env(safe-area-inset-bottom))', background: 'radial-gradient(circle at 50% 0%, rgba(59,130,246,.14), transparent 42%), #07101f', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 430, padding: 26, borderRadius: 22, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(13,23,40,.96)', boxShadow: '0 24px 70px rgba(0,0,0,.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#15263f', fontWeight: 800, fontSize: 20 }}>T</div>
          <div><strong style={{ display: 'block', fontSize: 18 }}>Te-connect</strong><span style={{ color: 'rgba(255,255,255,.55)', fontSize: 12 }}>People OS</span></div>
        </div>
        <h1 style={{ margin: 0, fontSize: 25 }}>Acesso corporativo</h1>
        <p style={{ color: 'rgba(255,255,255,.62)', lineHeight: 1.55, margin: '10px 0 22px' }}>Entre para gerir pessoas, ponto, turnos e operações de RH.</p>
        {error && <div style={{ marginBottom: 14, padding: 11, borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#fecaca', fontSize: 13 }}>{error}</div>}
        <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 7, color: 'rgba(255,255,255,.72)', fontSize: 13 }}>
            Email
            <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required style={{ width: '100%', boxSizing: 'border-box', padding: '13px 12px', borderRadius: 11, border: '1px solid rgba(255,255,255,.12)', background: '#091423', color: '#fff', outline: 'none' }} />
          </label>
          <label style={{ display: 'grid', gap: 7, color: 'rgba(255,255,255,.72)', fontSize: 13 }}>
            Palavra-passe
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required style={{ width: '100%', boxSizing: 'border-box', padding: '13px 12px', borderRadius: 11, border: '1px solid rgba(255,255,255,.12)', background: '#091423', color: '#fff', outline: 'none' }} />
          </label>
          <button type="submit" disabled={busy} style={{ marginTop: 4, border: 0, borderRadius: 11, padding: '13px 16px', background: '#2563eb', color: '#fff', fontWeight: 700, opacity: busy ? .65 : 1 }}>{busy ? 'A entrar…' : 'Entrar'}</button>
        </form>
      </div>
    </div>
  );
}

function CommercialBridge() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [billing, setBilling] = useState(null);
  const [panel, setPanel] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [attendancePanel, setAttendancePanel] = useState(false);
  const [notice, setNotice] = useState(null);
  const [attendanceLocations, setAttendanceLocations] = useState([]);
  const [attendanceAnomalies, setAttendanceAnomalies] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const isDemoMode = useMemo(() => new URLSearchParams(window.location.search).get('demo') === '1', []);

  const loadCommercial = useCallback(async (activeSession) => {
    if (!activeSession) {
      setProfile(null);
      setBilling(null);
      setPanel(null);
      setNeedsOnboarding(false);
      return;
    }
    const profileResult = await supabase.rpc('get_my_profile');
    if (profileResult.error) {
      setProfile(null);
      setBilling(null);
      setNeedsOnboarding(false);
      return;
    }
    const nextProfile = Array.isArray(profileResult.data) ? profileResult.data[0] : profileResult.data;
    setProfile(nextProfile || null);
    setNeedsOnboarding(!nextProfile?.company_id);
    if (!nextProfile?.company_id || ![...ADMIN_HR_ROLES, ...MANAGER_ROLES].includes(nextProfile.role)) {
      setBilling(null);
      return;
    }
    if (!ADMIN_HR_ROLES.has(nextProfile.role)) {
      setBilling(null);
      return;
    }
    const billingResult = await supabase.rpc('get_my_billing');
    setBilling(!billingResult.error ? (Array.isArray(billingResult.data) ? billingResult.data[0] : billingResult.data) : null);
  }, []);

  const loadAttendanceContext = useCallback(async () => {
    if (!profile?.company_id) return;
    const [locationsResult, anomaliesResult] = await Promise.all([
      supabase
        .from('work_locations')
        .select('id,name,address,latitude,longitude,gps_radius_m,active')
        .eq('company_id', profile.company_id)
        .eq('active', true)
        .order('name'),
      supabase
        .from('attendance_days')
        .select('id,employee_id,work_date,status,late_minutes,early_leave_minutes,overtime_minutes,night_minutes,worked_minutes')
        .eq('company_id', profile.company_id)
        .order('work_date', { ascending: false })
        .limit(100),
    ]);
    if (!locationsResult.error) setAttendanceLocations(locationsResult.data || []);
    if (!anomaliesResult.error) setAttendanceAnomalies(anomaliesResult.data || []);
  }, [profile?.company_id]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session || null);
      loadCommercial(data.session || null).catch(console.error);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      loadCommercial(nextSession || null).catch(console.error);
      if (!nextSession) {
        setAttendancePanel(false);
        setMoreOpen(false);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadCommercial]);

  const notify = useCallback((message, kind = 'ok') => {
    setNotice({ message, kind });
    window.clearTimeout(window.__teconnectGlobalNotice);
    window.__teconnectGlobalNotice = window.setTimeout(() => setNotice(null), 4200);
  }, []);

  const openAttendance = async () => {
    setMoreOpen(false);
    setPanel(null);
    await loadAttendanceContext();
    setAttendancePanel(true);
  };
  const closeAll = () => {
    setMoreOpen(false);
    setAttendancePanel(false);
    setPanel(null);
  };
  if (supabaseInitError) return <StartupError error={supabaseInitError} />;
  if (profile?.role === 'EMPLOYEE') return <EmployeeMobileWorkspace profile={profile} />;
  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#07101f', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}><div className="tc-brand-mark" style={{ margin: '0 auto 12px' }}>T</div><strong>A iniciar o Te-connect…</strong></div>
    </div>
  );
  if (!session) return <NativeLogin onSuccess={(nextSession) => setSession(nextSession)} />;
  if (needsOnboarding) return <OnboardingPage onComplete={() => window.location.reload()} />;
  if (!profile) return null;

  const canManageHr = ADMIN_HR_ROLES.has(profile.role);
  const canApprove = canManageHr || MANAGER_ROLES.has(profile.role);
  const openPanel = (type) => {
    setMoreOpen(false);
    setAttendancePanel(false);
    setPanel(type);
  };
  const roleLabel = roleLabels[profile.role] || profile.role;

  const quickActions = [
    { key: 'home', icon: LayoutDashboard, label: 'Visão geral', onClick: closeAll },
    { key: 'attendance', icon: Clock3, label: 'Ponto', primary: true, onClick: openAttendance },
    ...(profile.role !== 'SUPER_ADMIN'
      ? [
          { key: 'self', icon: UserRound, label: 'Meu RH', onClick: () => openPanel('self-service') },
          { key: 'request', icon: Send, label: 'Solicitar', onClick: () => openPanel('requests') },
        ]
      : []),
    ...(canApprove ? [{ key: 'approvals', icon: CheckCircle2, label: 'Aprovações', onClick: () => openPanel('approvals'), badge: true }] : []),
    ...(canManageHr ? [{ key: 'people', icon: UsersRound, label: 'People 360', onClick: () => openPanel('people360') }] : []),
  ];

  return (
    <>
      {isDemoMode ? (
        <TeconnectSuite profile={profile} />
      ) : (
        <ProductionWorkspace
          profile={profile}
          billing={billing}
          onOpenAttendance={openAttendance}
          onOpenPanel={openPanel}
          onOpenBilling={() => openPanel('billing')}
        />
      )}
      {!isDemoMode && <EnterpriseCommandCenter profile={profile} billing={billing} />}

      <nav className={`tc-product-chrome${moreOpen ? ' is-open' : ''}`} aria-label="Navegação do Te-connect">
        <div className="tc-dock-shell">
          <div className="tc-dock-identity" aria-label={`Espaço ${roleLabel}`}>
            <span className="tc-dock-logo">T</span>
            <span className="tc-dock-identity-copy">
              <strong>Te-connect</strong>
              <span>{roleLabel}</span>
            </span>
          </div>

          <div className="tc-dock-primary">
            {quickActions.map(({ key, icon: Icon, label, onClick, primary, badge }) => (
              <button
                key={key}
                type="button"
                className={`tc-dock-item${primary ? ' is-primary' : ''}${key === 'home' ? ' is-home' : ''}`}
                onClick={onClick}
                title={label}
                aria-label={label}
              >
                <span className="tc-dock-icon"><Icon size={17} strokeWidth={2} /></span>
                <span className="tc-dock-label">{label}</span>
                {badge && <span className="tc-dock-badge" aria-hidden="true" />}
              </button>
            ))}
          </div>

          <div className="tc-dock-actions">
            <button
              type="button"
              className="tc-dock-item tc-dock-more"
              onClick={() => setMoreOpen((current) => !current)}
              title="Mais áreas"
              aria-label="Mais áreas"
              aria-expanded={moreOpen}
            >
              <span className="tc-dock-icon"><MoreHorizontal size={18} strokeWidth={2} /></span>
              <span className="tc-dock-label">Mais</span>
              <ChevronUp size={12} className={`tc-dock-chevron${moreOpen ? ' is-open' : ''}`} />
            </button>
          </div>
        </div>

        {moreOpen && (
          <div className="tc-dock-more-panel">
            <div className="tc-dock-more-head">
              <div>
                <span className="tc-dock-section-label">Te-connect</span>
                <strong>Centro de operações</strong>
              </div>
              <span className="tc-dock-role-chip">{roleLabel}</span>
            </div>
            <div className="tc-dock-menu-grid">
              <button type="button" onClick={() => openPanel('security')}><LockKeyhole size={16} /><span><strong>Segurança</strong><small>MFA e proteção da conta</small></span></button>
              <button type="button" onClick={() => openPanel('privacy')}><Shield size={16} /><span><strong>Privacidade</strong><small>Dados e exportação</small></span></button>
              {canManageHr && <button type="button" onClick={() => openPanel('setup')}><Settings2 size={16} /><span><strong>Setup</strong><small>Estrutura da empresa</small></span></button>}
              {canManageHr && <button type="button" onClick={() => openPanel('rules')}><Clock3 size={16} /><span><strong>Regras</strong><small>Horários, GPS e turnos</small></span></button>}
              {canManageHr && <button type="button" onClick={() => openPanel('people360')}><UsersRound size={16} /><span><strong>People 360</strong><small>Visão integrada</small></span></button>}
              {canManageHr && <button type="button" onClick={() => openPanel('performance')}><Award size={16} /><span><strong>Performance</strong><small>Objetivos e PDI</small></span></button>}
              {canManageHr && <button type="button" onClick={() => openPanel('exceptions')}><AlertTriangle size={16} /><span><strong>Exceções</strong><small>Pendências e riscos</small></span></button>}
              {canManageHr && <button type="button" onClick={() => openPanel('analytics')}><Activity size={16} /><span><strong>Analytics</strong><small>Indicadores de pessoas</small></span></button>}
              {canManageHr && <button type="button" onClick={() => openPanel('integrations')}><Link2 size={16} /><span><strong>API</strong><small>Integrações e webhooks</small></span></button>}
              {canManageHr && <button type="button" onClick={() => openPanel('roles')}><UserCog size={16} /><span><strong>Papéis</strong><small>Funções e acessos</small></span></button>}
              {canManageHr && <button type="button" onClick={() => openPanel('employee-import')}><FileUp size={16} /><span><strong>Importar</strong><small>Equipa por CSV</small></span></button>}
              {canManageHr && <button type="button" onClick={() => openPanel('lifecycle')}><LogOut size={16} /><span><strong>Offboarding</strong><small>Saídas e checklist</small></span></button>}
              {canManageHr && <button type="button" onClick={() => openPanel('employee-access')}><UsersRound size={16} /><span><strong>Acessos</strong><small>Convites de colaboradores</small></span></button>}
              {canManageHr && <button type="button" onClick={() => openPanel('payroll')}><CreditCard size={16} /><span><strong>Folha</strong><small>Controlo e fecho</small></span></button>}
              {canManageHr && <button type="button" onClick={() => openPanel('audit')}><Shield size={16} /><span><strong>Auditoria</strong><small>Rasto operacional</small></span></button>}
              {canManageHr && <button type="button" onClick={() => openPanel('billing')}><CreditCard size={16} /><span><strong>Faturamento</strong><small>Plano e subscrição</small></span></button>}
              {profile.role === 'SUPER_ADMIN' && <button type="button" onClick={() => openPanel('super-admin')}><Shield size={16} /><span><strong>Super Admin</strong><small>Administração global</small></span></button>}
            </div>
          </div>
        )}
      </nav>

      {attendancePanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, overflow: 'auto', background: 'rgba(4,8,18,.94)', backdropFilter: 'blur(12px)', padding: '28px 26px 50px' }}>
          <div style={{ maxWidth: 1380, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button type="button" className="tc-btn" onClick={() => setAttendancePanel(false)}><X size={16} /> Fechar ponto</button>
            </div>
            <AttendanceWorkspace profile={profile} locations={attendanceLocations} anomalies={attendanceAnomalies} notify={notify} onReload={loadAttendanceContext} />
          </div>
          {notice && <div className={`tc-pill ${notice.kind === 'error' ? 'tc-no' : 'tc-ok'}`} style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 130, padding: '12px 15px' }}>{notice.message}</div>}
        </div>
      )}

      {panel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, overflow: 'auto', background: 'var(--tc-bg, #0b1020)', padding: '26px 28px 44px' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ color: 'rgba(255,255,255,.58)', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}><Shield size={15} /> Área protegida · tenant</div>
              <button type="button" className="tc-btn" onClick={() => setPanel(null)}><X size={16} /> Fechar</button>
            </div>
            {panel === 'requests' && profile.role !== 'SUPER_ADMIN' && <EmployeeRequestCenter profile={profile} onClose={() => setPanel(null)} />}
            {panel === 'self-service' && profile.role !== 'SUPER_ADMIN' && <SelfServicePanel profile={profile} onClose={() => setPanel(null)} onOpenAttendance={openAttendance} />}
            {panel === 'security' && <SecurityCenter profile={profile} onClose={() => setPanel(null)} />}
            {panel === 'privacy' && <PrivacyCenter profile={profile} onClose={() => setPanel(null)} />}
            {panel === 'approvals' && canApprove && <ApprovalsCenter profile={profile} onToast={notify} />}
            {panel === 'people360' && canManageHr && <Employee360Panel profile={profile} onClose={() => setPanel(null)} />}
            {panel === 'performance' && canManageHr && <PerformanceCenter profile={profile} onClose={() => setPanel(null)} />}
            {panel === 'setup' && canManageHr && <SetupWizard profile={profile} onClose={() => setPanel(null)} />}
            {panel === 'rules' && canManageHr && <RulesCenter profile={profile} onClose={() => setPanel(null)} />}
            {panel === 'exceptions' && canManageHr && <ExceptionCenter profile={profile} onClose={() => setPanel(null)} />}
            {panel === 'analytics' && canManageHr && <PeopleAnalyticsCenter profile={profile} onClose={() => setPanel(null)} />}
            {panel === 'integrations' && canManageHr && <IntegrationsCenter profile={profile} onClose={() => setPanel(null)} />}
            {panel === 'roles' && canManageHr && <RoleCenter profile={profile} onClose={() => setPanel(null)} />}
            {panel === 'employee-import' && canManageHr && <EmployeeImportPanel profile={profile} onClose={() => setPanel(null)} />}
            {panel === 'lifecycle' && canManageHr && <LifecycleCenter profile={profile} onClose={() => setPanel(null)} />}
            {panel === 'billing' && canManageHr && <BillingPage />}
            {panel === 'super-admin' && profile.role === 'SUPER_ADMIN' && <SuperAdminPage />}
            {panel === 'employee-access' && canManageHr && <EmployeeAccessManager profile={profile} onToast={notify} />}
            {panel === 'payroll' && canManageHr && <PayrollControlCenter profile={profile} onToast={notify} />}
            {panel === 'audit' && canManageHr && <AuditCenter profile={profile} onToast={notify} />}
            {!['requests','self-service','security','privacy','approvals','people360','performance','setup','rules','exceptions','analytics','integrations','roles','employee-import','lifecycle','billing','super-admin','employee-access','payroll','audit'].includes(panel) && <div style={{ padding: 32, textAlign: 'center' }}>Área disponível no centro administrativo.</div>}
          </div>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><CommercialBridge /></React.StrictMode>);
