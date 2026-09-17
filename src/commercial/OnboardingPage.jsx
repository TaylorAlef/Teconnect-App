import { useState } from 'react';
import { Building2, CheckCircle2, Loader2, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

export default function OnboardingPage({ onComplete }) {
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Indique o nome da empresa.');
      return;
    }
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('create_company_onboarding', {
        p_company_name: name.trim(),
        p_nif: nif.trim() || null,
        p_phone: phone.trim() || null,
        p_address: address.trim() || null,
      });
      if (rpcError) throw rpcError;
      onComplete();
    } catch (e) {
      setError(e.message || 'Não foi possível criar a organização.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, overflow: 'auto', background: 'var(--tc-bg, #080c16)', padding: '42px 20px' }}>
      <div style={{ width: 'min(760px, 100%)', margin: '0 auto' }}>
        <div className="tc-brand" style={{ marginBottom: 26 }}>
          <div className="tc-brand-mark">T</div>
          <div><strong>Teconnect</strong><span>People OS</span></div>
        </div>
        <section className="tc-card" style={{ padding: '34px', borderRadius: 18 }}>
          <div className="tc-eyebrow"><Building2 size={15} /> Primeira configuração</div>
          <h1 style={{ margin: '10px 0 8px', fontSize: 30 }}>Crie a sua organização</h1>
          <p className="tc-muted" style={{ lineHeight: 1.65, maxWidth: 620 }}>
            A sua conta está autenticada, mas ainda não está ligada a uma empresa. Crie a organização para iniciar o ambiente de RH.
          </p>
          {error && <div className="tc-error" style={{ margin: '18px 0' }}>{error}</div>}
          <form className="tc-form" onSubmit={submit} style={{ marginTop: 24 }}>
            <label>Nome da empresa<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Taylor Consulting, Lda." required autoFocus /></label>
            <label>NIF <span className="tc-muted">(opcional)</span><input value={nif} onChange={(e) => setNif(e.target.value)} placeholder="PT 000 000 000" /></label>
            <label><Phone size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Telefone <span className="tc-muted">(opcional)</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+351 ..." /></label>
            <label><MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Morada <span className="tc-muted">(opcional)</span><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Lisboa, Portugal" /></label>
            <div className="tc-geofence" style={{ marginTop: 4 }}><ShieldCheck size={17} className="tc-ok" /><span>Será criado automaticamente um período inicial de teste do plano Starter.</span></div>
            <button className="tc-btn primary" disabled={busy} style={{ marginTop: 8, justifyContent: 'center' }}>
              {busy ? <><Loader2 size={16} className="spin" /> A criar organização…</> : <><CheckCircle2 size={16} /> Criar organização e entrar</>}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
