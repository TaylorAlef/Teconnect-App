import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, LockKeyhole, Shield } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import App from './App.jsx';
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
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
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
          if (!button.querySelector('[data-tc-lock]')) {
            const lock = document.createElement('span');
            lock.dataset.tcLock = 'true';
            lock.textContent = '🔒';
            lock.style.marginLeft = 'auto';
            lock.style.fontSize = '12px';
            button.appendChild(lock);
          }
          const handler = (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            setPanel('billing');
          };
          button.addEventListener('click', handler, true);
          cleanups.push(() => button.removeEventListener('click', handler, true));
        }
      });
    };

    wire();
    const observer = new MutationObserver(wire);
    const root = document.querySelector('.tc-shell') || document.body;
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      document.querySelectorAll('[data-tc-lock]').forEach((node) => node.remove());
    };
  }, [billing?.plan_code, session]);

  if (!session) return null;

  if (needsOnboarding) {
    return <OnboardingPage onComplete={() => window.location.reload()} />;
  }

  return (
    <>
      <div style={{ position: 'fixed', right: 22, top: 82, zIndex: 40, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          className="tc-btn ghost"
          onClick={() => setPanel('billing')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 10px 28px rgba(0,0,0,.18)' }}
        >
          <CreditCard size={16} /> Faturamento
        </button>
        {profile?.role === 'SUPER_ADMIN' && (
          <button
            type="button"
            className="tc-btn ghost"
            onClick={() => setPanel('super-admin')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 10px 28px rgba(0,0,0,.18)' }}
          >
            <Shield size={16} /> Super Admin
          </button>
        )}
      </div>

      {panel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, overflow: 'auto', background: 'var(--tc-bg, #0b1020)', padding: '26px 28px 44px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18, gap: 8 }}>
              <button type="button" className="tc-btn" onClick={() => setPanel(null)}>
                Fechar
              </button>
            </div>
            {panel === 'billing' ? <BillingPage /> : <SuperAdminPage />}
          </div>
        </div>
      )}

      {billing?.plan_code === 'STARTER' && (
        <div style={{ position: 'fixed', left: 22, bottom: 22, zIndex: 30, maxWidth: 360, display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', borderRadius: 12, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(20,24,38,.92)', backdropFilter: 'blur(12px)', fontSize: 12 }}>
          <LockKeyhole size={15} />
          <span>Plano Starter: ERP e turnos avançados estão bloqueados.</span>
          <button type="button" className="tc-btn primary tc-small" onClick={() => setPanel('billing')}>Upgrade</button>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <CommercialBridge />
  </React.StrictMode>,
);
