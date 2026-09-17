import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Award, CheckCircle2, CreditCard, Settings2, Shield, UsersRound, Clock3, UserRound, X } from 'lucide-react';
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
import SetupWizard from './commercial/SetupWizard.jsx';
import ExceptionCenter from './ops/ExceptionCenter.jsx';
import PeopleAnalyticsCenter from './analytics/PeopleAnalyticsCenter.jsx';
import './styles.css';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
const ADMIN_HR_ROLES = new Set(['SUPER_ADMIN', 'COMPANY_ADMIN', 'RH']);
const MANAGER_ROLES = new Set(['GESTOR', 'SUPERVISOR']);

function CommercialBridge() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [billing, setBilling] = useState(null);
  const [panel, setPanel] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [attendancePanel, setAttendancePanel] = useState(false);
  const [notice, setNotice] = useState(null);
  const [attendanceLocations, setAttendanceLocations] = useState([]);
  const [attendanceAnomalies, setAttendanceAnomalies] = useState([]);
  const isDemoMode = useMemo(() => new URLSearchParams(window.location.search).get('demo') === '1', []);

  const loadCommercial = useCallback(async (activeSession) => {
    if (!activeSession) {
      setProfile(null); setBilling(null); setPanel(null); setNeedsOnboarding(false); return;
    }
    const profileResult = await supabase.rpc('get_my_profile');
    if (profileResult.error) { setProfile(null); setBilling(null); setNeedsOnboarding(false); return; }
    const nextProfile = Array.isArray(profileResult.data) ? profileResult.data[0] : profileResult.data;
    setProfile(nextProfile || null);
    setNeedsOnboarding(!nextProfile?.company_id);
    if (!nextProfile?.company_id || ![...ADMIN_HR_ROLES, ...MANAGER_ROLES].includes(nextProfile.role)) { setBilling(null); return; }
    if (!ADMIN_HR_ROLES.has(nextProfile.role)) { setBilling(null); return; }
    const billingResult = await supabase.rpc('get_my_billing');
    setBilling(!billingResult.error ? (Array.isArray(billingResult.data) ? billingResult.data[0] : billingResult.data) : null);
  }, []);

  const loadAttendanceContext = useCallback(async () => {
    if (!profile?.company_id) return;
    const [locationsResult, anomaliesResult] = await Promise.all([
      supabase.from('work_locations').select('id,name,address,latitude,longitude,gps_radius_m,active').eq('company_id', profile.company_id).eq('active', true).order('name'),
      supabase.from('attendance_days').select('id,employee_id,work_date,status,late_minutes,early_leave_minutes,overtime_minutes,night_minutes,worked_minutes').eq('company_id', profile.company_id).order('work_date', { ascending: false }).limit(100),
    ]);
    if (!locationsResult.error) setAttendanceLocations(locationsResult.data || []);
    if (!anomaliesResult.error) setAttendanceAnomalies(anomaliesResult.data || []);
  }, [profile?.company_id]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session || null);
      loadCommercial(data.session || null).catch(console.error);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      loadCommercial(nextSession || null).catch(console.error);
      if (!nextSession) setAttendancePanel(false);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [loadCommercial]);

  const notify = useCallback((message, kind = 'ok') => {
    setNotice({ message, kind });
    window.clearTimeout(window.__teconnectGlobalNotice);
    window.__teconnectGlobalNotice = window.setTimeout(() => setNotice(null), 4200);
  }, []);

  const openAttendance = async () => { await loadAttendanceContext(); setAttendancePanel(true); };

  if (!session) return null;
  if (needsOnboarding) return <OnboardingPage onComplete={() => window.location.reload()} />;
  if (!profile) return null;

  const canManageHr = ADMIN_HR_ROLES.has(profile.role);
  const canApprove = canManageHr || MANAGER_ROLES.has(profile.role);
  const openPanel = (type) => setPanel(type);

  return (
    <>
      {isDemoMode ? <TeconnectSuite profile={profile} /> : <ProductionWorkspace profile={profile} billing={billing} onOpenAttendance={openAttendance} onOpenPanel={openPanel} onOpenBilling={() => setPanel('billing')} />}
      {!isDemoMode && <EnterpriseCommandCenter profile={profile} billing={billing} />}

      <div className="tc-product-chrome">
        <button type="button" className="tc-btn primary tc-billing-trigger" onClick={openAttendance} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 10px 28px rgba(0,0,0,.18)' }} title="Abrir ponto e geofence real"><Clock3 size={16} /> Ponto real</button>
        {profile.role !== 'SUPER_ADMIN' && <button type="button" className="tc-btn ghost tc-billing-trigger" onClick={() => setPanel('self-service')} title="Área pessoal do colaborador"><UserRound size={16} /> Meu RH</button>}
        {canApprove && <button type="button" className="tc-btn primary tc-billing-trigger" onClick={() => setPanel('approvals')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 10px 28px rgba(0,0,0,.18)' }} title="Férias, ausências e horas extra"><CheckCircle2 size={16} /> Aprovações</button>}
        {canManageHr && <>
          <button type="button" className="tc-btn ghost tc-billing-trigger" onClick={() => setPanel('people360')} title="Ficha integrada de colaborador"><UsersRound size={16} /> People 360</button>
          <button type="button" className="tc-btn ghost tc-billing-trigger" onClick={() => setPanel('performance')} title="Objetivos, avaliações e PDI"><Award size={16} /> Performance</button>
          <button type="button" className="tc-btn ghost tc-billing-trigger" onClick={() => setPanel('setup')} title="Configurar organização"><Settings2 size={16} /> Setup</button>
          <button type="button" className="tc-btn ghost tc-billing-trigger" onClick={() => setPanel('exceptions')} title="Fila unificada de exceções"><AlertTriangle size={16} /> Exceções</button>
          <button type="button" className="tc-btn ghost tc-billing-trigger" onClick={() => setPanel('analytics')} title="Indicadores e tendências de pessoas"><Activity size={16} /> Analytics</button>
          <EmployeeAccessManager profile={profile} onToast={notify} />
          <PayrollControlCenter profile={profile} onToast={notify} />
          <AuditCenter profile={profile} onToast={notify} />
          <button type="button" className="tc-btn ghost tc-billing-trigger" onClick={() => setPanel('billing')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 10px 28px rgba(0,0,0,.18)' }}><CreditCard size={16} /> Faturamento</button>
        </>}
        {profile.role === 'SUPER_ADMIN' && <button type="button" className="tc-btn ghost tc-billing-trigger" onClick={() => setPanel('super-admin')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 10px 28px rgba(0,0,0,.18)' }}><Shield size={16} /> Super Admin</button>}
      </div>

      {attendancePanel && <div style={{ position: 'fixed', inset: 0, zIndex: 110, overflow: 'auto', background: 'rgba(4,8,18,.94)', backdropFilter: 'blur(12px)', padding: '28px 26px 50px' }}><div style={{ maxWidth: 1380, margin: '0 auto' }}><div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}><button type="button" className="tc-btn" onClick={() => setAttendancePanel(false)}><X size={16} /> Fechar ponto</button></div><AttendanceWorkspace profile={profile} locations={attendanceLocations} anomalies={attendanceAnomalies} notify={notify} onReload={loadAttendanceContext} /></div>{notice && <div className={`tc-pill ${notice.kind === 'error' ? 'tc-no' : 'tc-ok'}`} style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 130, padding: '12px 15px' }}>{notice.message}</div>}</div>}

      {panel && <div style={{ position: 'fixed', inset: 0, zIndex: 100, overflow: 'auto', background: 'var(--tc-bg, #0b1020)', padding: '26px 28px 44px' }}><div style={{ maxWidth: 1400, margin: '0 auto' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}><div style={{ color: 'rgba(255,255,255,.58)', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}><Shield size={15} /> Área protegida · tenant {profile.company_id}</div><button type="button" className="tc-btn" onClick={() => setPanel(null)}><X size={16} /> Fechar</button></div>
        {panel === 'self-service' && profile.role !== 'SUPER_ADMIN' && <SelfServicePanel profile={profile} onClose={() => setPanel(null)} onOpenAttendance={openAttendance} />}
        {panel === 'approvals' && canApprove && <ApprovalsCenter profile={profile} onToast={notify} />}
        {panel === 'people360' && canManageHr && <Employee360Panel profile={profile} onClose={() => setPanel(null)} />}
        {panel === 'performance' && canManageHr && <PerformanceCenter profile={profile} onClose={() => setPanel(null)} />}
        {panel === 'setup' && canManageHr && <SetupWizard profile={profile} onClose={() => setPanel(null)} />}
        {panel === 'exceptions' && canManageHr && <ExceptionCenter profile={profile} onClose={() => setPanel(null)} />}
        {panel === 'analytics' && canManageHr && <PeopleAnalyticsCenter profile={profile} onClose={() => setPanel(null)} />}
        {panel === 'billing' && canManageHr && <BillingPage />}
        {panel === 'super-admin' && profile.role === 'SUPER_ADMIN' && <SuperAdminPage />}
        {panel === 'employee-access' && canManageHr && <EmployeeAccessManager profile={profile} onToast={notify} />}
        {panel === 'payroll' && canManageHr && <PayrollControlCenter profile={profile} onToast={notify} />}
        {panel === 'audit' && canManageHr && <AuditCenter profile={profile} onToast={notify} />}
        {!['self-service','approvals','people360','performance','setup','exceptions','analytics','billing','super-admin','employee-access','payroll','audit'].includes(panel) && <div style={{ padding: 32, textAlign: 'center' }}>Área disponível no centro administrativo.</div>}
      </div></div>}
    </>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><CommercialBridge /></React.StrictMode>);
