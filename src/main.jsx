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
import { initCloudflareWebAnalytics } from './lib/web-analytics.js';

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
  const [mode, setMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail.includes('@')) throw new Error('Informe um e-mail válido.');
      if (mode === 'signup') {
        if (fullName.trim().length < 2) throw new Error('Informe o seu nome.');
        if (password.length < 8) throw new Error('A palavra-passe deve ter pelo menos 8 caracteres.');
        if (!accepted) throw new Error('Aceite os Termos e a Privacidade para criar a conta.');

        const { data, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: fullName.trim(), name: fullName.trim() } },
        });
        if (authError) throw authError;
        if (data.session) {
          onSuccess(data.session);
        } else {
          setMode('login');
          setMessage('Conta criada. Verifique o seu e-mail para confirmar a conta e depois entre no Te-connect.');
        }
        return;
      }

      if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setMessage('Enviámos as instruções de recuperação para o seu e-mail, caso a conta exista.');
        setMode('login');
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (authError) throw authError;
      onSuccess(data.session || null);
    } catch (loginError) {
      setError(loginError?.message || 'Não foi possível concluir a operação.');
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'signup' ? 'Criar conta empresarial' : mode === 'reset' ? 'Recuperar acesso' : 'Acesso corporativo';
  const subtitle = mode === 'signup'
    ? 'Crie a conta de administrador e configure a empresa em poucos passos.'
    : mode === 'reset'
      ? 'Receba por e-mail um link para recuperar o acesso.'
      : 'Entre para gerir pessoas, ponto, turnos e operações de RH.';

  return (
    <div className="tc-login-shell">
      <div className="tc-login-card">
        <div className="tc-login-brand">
          <img className="tc-auth-logo" src="/teconnect-logo.svg" alt="Te-connect" />
          <div><strong>Te-connect</strong><span>People OS para empresas</span></div>
        </div>
        <div className="tc-login-kicker">CENTRAL DE RH</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>

        {error && <div className="tc-login-message error">{error}</div>}
        {message && <div className="tc-login-message success">{message}</div>}

        <form onSubmit={submit} className="tc-login-form">
          {mode === 'signup' && <label>Nome completo<input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required /></label>}
          <label>Email<input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          {mode !== 'reset' && <label>Palavra-passe<input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>}
          {mode === 'signup' && <label className="tc-login-check"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>Aceito os <a href="/terms.html" target="_blank" rel="noreferrer">Termos</a> e a <a href="/privacy.html" target="_blank" rel="noreferrer">Privacidade</a>.</span></label>}
          <button type="submit" disabled={busy} className="tc-login-submit">{busy ? 'A processar…' : mode === 'signup' ? 'Criar conta e começar' : mode === 'reset' ? 'Enviar recuperação' : 'Entrar'}</button>
        </form>

        <div className="tc-login-links">
          {mode === 'login' && <><button type="button" onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Criar nova empresa</button><button type="button" onClick={() => { setMode('reset'); setError(''); setMessage(''); }}>Esqueci a palavra-passe</button></>}
          {mode !== 'login' && <button type="button" onClick={() => { setMode('login'); setError(''); setMessage(''); }}>Voltar ao acesso</button>}
        </div>

        <div className="tc-auth-privacy">
          <span>Conta empresarial, sessão segura e dados separados por organização.</span>
          <span><a href="/privacy.html">Privacidade</a><a href="/terms.html">Termos</a></span>
        </div>
        <div className="tc-auth-footer">Te-connect · People OS para empresas</div>
      </div>
    </div>
  );
}

function PasswordRecoveryPage({ onComplete }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('A nova palavra-passe deve ter pelo menos 8 caracteres.');
    if (password !== confirmation) return setError('As palavras-passe não coincidem.');
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      alert('Palavra-passe atualizada com sucesso. Entre novamente no Te-connect.');
      await onComplete?.();
    } catch (e) {
      setError(e?.message || 'Não foi possível atualizar a palavra-passe.');
    } finally {
      setBusy(false);
    }
  };
  return <div className="tc-login-shell"><div className="tc-login-card">
    <div className="tc-login-brand"><img className="tc-auth-logo" src="/teconnect-logo.svg" alt="Te-connect" /><div><strong>Te-connect</strong><span>Recuperação de acesso</span></div></div>
    <div className="tc-login-kicker">SEGURANÇA</div><h1>Definir nova palavra-passe</h1><p>Escolha uma nova palavra-passe para voltar ao seu acesso empresarial.</p>
    {error && <div className="tc-login-message error">{error}</div>}
    <form onSubmit={submit} className="tc-login-form">
      <label>Nova palavra-passe<input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      <label>Confirmar palavra-passe<input type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></label>
      <button className="tc-login-submit" type="submit" disabled={busy}>{busy ? 'A atualizar…' : 'Atualizar palavra-passe'}</button>
    </form>
  </div></div>;
}

function CommercialBridge() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoadError, setProfileLoadError] = useState(null);
  const [billing, setBilling] = useState(null);
  const [panel, setPanel] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [attendancePanel, setAttendancePanel] = useState(false);
  const [notice, setNotice] = useState(null);
  const [attendanceLocations, setAttendanceLocations] = useState([]);
  const [attendanceAnomalies, setAttendanceAnomalies] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const isDemoMode = useMemo(() => new URLSearchParams(window.location.search).get('demo') === '1', []);

  const loadCommercial = useCallback(async (activeSession) => {
    setProfileLoadError(null);
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
      setProfileLoadError(profileResult.error);
      return;
    }
    const nextProfile = Array.isArray(profileResult.data) ? profileResult.data[0] : profileResult.data;
    setProfile(nextProfile || null);
    if (!nextProfile) {
      setNeedsOnboarding(true);
      return;
    }
    setNeedsOnboarding(!nextProfile.company_id);
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
    initCloudflareWebAnalytics();
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const nextSession = data.session || null;
      setSession(nextSession);
      try {
        await loadCommercial(nextSession);
      } catch (error) {
        setProfile(null);
        setProfileLoadError(error);
      } finally {
        if (active) setAuthLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      if (event === 'SIGNED_OUT') setRecoveryMode(false);
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
  if (authLoading) return (

    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#07101f', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}><img className="tc-auth-logo tc-auth-logo-small" src="/teconnect-logo.svg" alt="Te-connect" /><strong>A iniciar o Te-connect…</strong></div>
    </div>
  );
  if (recoveryMode && session) return <PasswordRecoveryPage onComplete={async () => {
    setRecoveryMode(false);
    await supabase.auth.signOut();
  }} />;
  if (profile?.role === 'EMPLOYEE') return <EmployeeMobileWorkspace profile={profile} />;
  if (!session) return <NativeLogin onSuccess={(nextSession) => setSession(nextSession)} />;
  if (needsOnboarding) return <OnboardingPage onComplete={() => window.location.reload()} />;
  if (!profile && profileLoadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f4f7fb', color: '#10223f', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 520, padding: 28, borderRadius: 20, border: '1px solid #e3eaf4', background: '#fff', boxShadow: '0 20px 55px rgba(16,42,79,.10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}><img className="tc-auth-logo" src="/teconnect-logo.svg" alt="Te-connect" /><div><strong style={{ display: 'block', fontSize: 20 }}>Te-connect</strong><span style={{ color: '#71809a', fontSize: 12 }}>Acesso empresarial</span></div></div>
          <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Não foi possível carregar o perfil</h1>
          <p style={{ margin: '0 0 16px', color: '#66758d', lineHeight: 1.6, fontSize: 13 }}>A sessão foi encontrada, mas o perfil do utilizador não foi carregado. A aplicação foi interrompida com segurança para evitar uma página em branco.</p>
          <div style={{ padding: 12, borderRadius: 10, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: 12, lineHeight: 1.5 }}>{profileLoadError.message}</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}><button type="button" className="tc-btn" onClick={() => window.location.reload()}>Tentar novamente</button><button type="button" className="tc-btn" onClick={async () => { await supabase?.auth.signOut(); window.location.reload(); }}>Sair e entrar novamente</button></div>
        </div>
      </div>
    );
  }
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
