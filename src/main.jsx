import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, LockKeyhole, Shield, Clock3, X } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import TeconnectSuite from './TeconnectSuite.jsx';
import EnterpriseCommandCenter from './EnterpriseCommandCenter.jsx';
import AttendanceWorkspace from './attendance/AttendanceWorkspace.jsx';
import EmployeeAccessManager from './commercial/EmployeeAccessManager.jsx';
import BillingPage from './commercial/BillingPage.jsx';
import OnboardingPage from './commercial/OnboardingPage.jsx';
import SuperAdminPage from './commercial/SuperAdminPage.jsx';
import './styles.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
);

function CommercialBridge() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [billing, setBilling] = useState(null);
  const [panel, setPanel] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [attendancePanel, setAttendancePanel] = useState(false);
  const [attendanceNotice, setAttendanceNotice] = useState(null);
  const [attendanceLocations, setAttendanceLocations] = useState([]);
  const [attendanceAnomalies, setAttendanceAnomalies] = useState([]);

  const loadCommercial = useCallback(async (activeSession) => {
    if (!activeSession) {
      setProfile(null);
      setBilling(null);
      setPanel(null);
      setNeedsOnboarding(false);
      return;
    }
    const [profileResult, billingResult] = await Promise.all([
      supabase.rpc('get_my_profile'),
      supabase.rpc('get_my_billing'),
    ]);
    if (!profileResult.error) {
      const nextProfile = Array.isArray(profileResult.data) ? profileResult.data[0] : profileResult.data;
      setProfile(nextProfile || null);
      setNeedsOnboarding(!nextProfile?.company_id);
    } else {
      setProfile(null);
      setNeedsOnboarding(false);
    }
    if (!billingResult.error) {
      setBilling(Array.isArray(billingResult.data) ? billingResult.data[0] : billingResult.data);
    } else {
      setBilling(null);
    }
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

  useEffect(() => {
    if (!session) return undefined;
    const isStarter = billing?.plan_code === 'STARTER';
    const lockedLabels = isStarter ? ['Integrações', 'Turnos'] : [];
    const cleanups = [];
    const wire = () => {
      const navButtons = Array.from(document.querySelectorAll('.tc-side .tc-nav button'));
      navButtons.forEach((button) => {
        const label = button.textContent?.trim() || '';
        if (!lockedLabels.some((name) => label.includes(name))) return;
        if (button.dataset.tcCommercialLocked === String(isStarter)) return;
        button.dataset.tcCommercialLocked = String(isStarter);
        if (isStarter) {
          button.title = 'Disponível a partir do plano Business';
          const handler = (event) => { event.preventDefault(); event.stopImmediatePropagation(); setPanel('billing'); };
          button.addEventListener('click', handler, true);
          cleanups.push(() => button.removeEventListener('click', handler, true));
        }
      });
    };
    wire();
    const observer = new MutationObserver(wire);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); cleanups.forEach((cleanup) => cleanup()); };
  }, [billing?.plan_code, session]);

  const attendanceNotify = useCallback((message, kind = 'ok') => {
    setAttendanceNotice({ message, kind });
    window.clearTimeout(window.__teconnectAttendanceNotice);
    window.__teconnectAttendanceNotice = window.setTimeout(() => setAttendanceNotice(null), 4200);
  }, []);

  const openAttendance = async () => {
    await loadAttendanceContext();
    setAttendancePanel(true);
  };

  if (!session) return null;
  if (needsOnboarding) return <OnboardingPage onComplete={() => window.location.reload()} />;
  if (!profile) return null;

  return (
    <>
      <TeconnectSuite profile={profile} />
      <EnterpriseCommandCenter profile={profile} billing={billing} />
      <div className="tc-product-chrome">
        <button type="button" className="tc-btn primary tc-billing-trigger" onClick={openAttendance} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 10px 28px rgba(0,0,0,.18)' }} title="Abrir ponto e geofence real">
          <Clock3 size={16} /> Ponto real
        </button>
        <EmployeeAccessManager profile={profile} onToast={attendanceNotify} />
        <button type="button" className="tc-btn ghost tc-billing-trigger" onClick={() => setPanel('billing')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 10px 28px rgba(0,0,0,.18)' }}>
          <CreditCard size={16} /> Faturamento
        </button>
        {profile.role === 'SUPER_ADMIN' && (
          <button type="button" className="tc-btn ghost tc-billing-trigger" onClick={() => setPanel('super-admin')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 10px 28px rgba(0,0,0,.18)' }}>
            <Shield size={16} /> Super Admin
          </button>
        )}
      </div>
      {attendancePanel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, overflow: 'auto', background: 'rgba(4,8,18,.94)', backdropFilter: 'blur(12px)', padding: '28px 26px 50px' }}>
          <div style={{ maxWidth: 1380, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button type="button" className="tc-btn" onClick={() => setAttendancePanel(false)}><X size={16} /> Fechar ponto</button>
            </div>
            <AttendanceWorkspace profile={profile} locations={attendanceLocations} anomalies={attendanceAnomalies} notify={attendanceNotify} onReload={loadAttendanceContext} />
          </div>
          {attendanceNotice && <div className={`tc-pill ${attendanceNotice.kind === 'error' ? 'tc-no' : 'tc-ok'}`} style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 130, padding: '12px 15px' }}>{attendanceNotice.kind === 'error' ? <Shield size={15} /> : <Clock3 size={15} />}{attendanceNotice.message}</div>}
        </div>
      )}
      {panel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, overflow: 'auto', background: 'var(--tc-bg, #0b1020)', padding: '26px 28px 44px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}><button type="button" className="tc-btn" onClick={() => setPanel(null)}>Fechar</button></div>
            {panel === 'billing' ? <BillingPage /> : <SuperAdminPage />}
          </div>
        </div>
      )}
      {billing?.plan_code === 'STARTER' && (
        <div style={{ position: 'fixed', left: 22, bottom: 22, zIndex: 30, maxWidth: 360, display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', borderRadius: 12, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(20,24,38,.92)', backdropFilter: 'blur(12px)', fontSize: 12 }}>
          <LockKeyhole size={15} /><span>Plano Starter: ERP e turnos avançados estão bloqueados.</span><button type="button" className="tc-btn primary tc-small" onClick={() => setPanel('billing')}>Upgrade</button>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CommercialBridge />
  </React.StrictMode>,
);
