import { useEffect, useMemo, useState } from 'react';
import { Mail, RefreshCw, Send, ShieldCheck, UserCheck, UserPlus, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
);

const allowedRoles = new Set(['SUPER_ADMIN', 'COMPANY_ADMIN', 'RH']);

const friendlyError = (message = '') => ({
  EMPLOYEE_ALREADY_LINKED: 'Este colaborador já tem uma conta associada.',
  EMAIL_ALREADY_REGISTERED: 'Este e-mail já tem uma conta Teconnect. Use a conta existente ou faça o vínculo administrativo.',
  EMPLOYEE_INACTIVE: 'O colaborador está inativo e não pode receber acesso.',
  INVITE_FAILED: 'Não foi possível enviar o convite.',
  PROFILE_PROVISION_FAILED: 'A conta foi criada, mas não foi possível concluir o vínculo do perfil.',
  EMPLOYEE_LINK_FAILED: 'A conta foi criada, mas não foi possível associá-la ao colaborador.',
  BILLING_PAST_DUE: 'A faturação da empresa precisa de ser regularizada.',
}[message] || message || 'Não foi possível concluir o convite.');

export default function EmployeeAccessManager({ profile, onToast }) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [emailById, setEmailById] = useState({});

  const canManage = allowedRoles.has(profile?.role);
  const pending = useMemo(() => employees.filter((employee) => !employee.user_id && employee.status === 'ACTIVE'), [employees]);

  const load = async () => {
    if (!canManage || !profile?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id,employee_code,full_name,email,user_id,status')
        .eq('company_id', profile.company_id)
        .eq('status', 'ACTIVE')
        .order('full_name');
      if (error) throw error;
      setEmployees(data || []);
      setEmailById((current) => Object.fromEntries((data || []).map((employee) => [employee.id, current[employee.id] || employee.email || ''])));
    } catch (error) {
      console.error(error);
      onToast?.('Não foi possível carregar os colaboradores.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) load(); }, [open, profile?.company_id]);
  if (!canManage) return null;

  const invite = async (employee) => {
    const email = String(emailById[employee.id] || employee.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      onToast?.('Informe um e-mail válido para o colaborador.', 'error');
      return;
    }
    setSendingId(employee.id);
    try {
      const { data, error } = await supabase.functions.invoke('invite-employee', { body: { employee_id: employee.id, email } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onToast?.('Convite enviado. O colaborador receberá o acesso por e-mail.');
      await load();
    } catch (error) {
      console.error(error);
      onToast?.(friendlyError(error?.message), 'error');
    } finally {
      setSendingId(null);
    }
  };

  return <>
    <button type="button" className="tc-btn ghost tc-billing-trigger" onClick={() => setOpen(true)} title="Gerir acesso dos colaboradores" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <UserPlus size={16} /> Acessos
    </button>

    {open && <div style={{ position: 'fixed', inset: 0, zIndex: 115, background: 'rgba(2,6,23,.76)', backdropFilter: 'blur(12px)', overflow: 'auto', padding: '30px 20px' }}>
      <div className="tc-card" style={{ width: 'min(900px,100%)', margin: '0 auto', padding: 24 }}>
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 18 }}>
          <div>
            <div className="tc-eyebrow"><ShieldCheck size={14} /> Acesso corporativo</div>
            <h2 style={{ margin: '8px 0 5px' }}>Convide os colaboradores</h2>
            <p className="tc-muted" style={{ margin: 0, lineHeight: 1.55 }}>Cada colaborador recebe o próprio acesso e fica ligado ao cadastro, turno e ponto da empresa.</p>
          </div>
          <button type="button" className="tc-btn" onClick={() => setOpen(false)} aria-label="Fechar"><X size={16} /></button>
        </header>

        <div className="tc-geofence" style={{ marginBottom: 16 }}><UserCheck size={16} /><span><strong>{pending.length}</strong> colaboradores ainda sem acesso.</span><button type="button" className="tc-btn tc-small" style={{ marginLeft: 'auto' }} onClick={load} disabled={loading}><RefreshCw size={13} className={loading ? 'spin' : ''} /> Atualizar</button></div>

        {pending.length === 0 ? <div className="tc-empty">Todos os colaboradores ativos deste tenant já possuem uma conta associada.</div> : <div style={{ display: 'grid', gap: 10 }}>{pending.map((employee) => {
          const email = emailById[employee.id] || '';
          const sending = sendingId === employee.id;
          return <div key={employee.id} className="tc-row" style={{ alignItems: 'center' }}>
            <div className="tc-row-main" style={{ minWidth: 0 }}>
              <div className="tc-row-title">{employee.full_name}</div>
              <div className="tc-row-sub">Código {employee.employee_code} · acesso ainda não associado</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <label style={{ position: 'relative', display: 'block' }}><Mail size={14} style={{ position: 'absolute', left: 9, top: 10, opacity: .55 }} /><input type="email" value={email} placeholder="colaborador@empresa.pt" onChange={(event) => setEmailById((current) => ({ ...current, [employee.id]: event.target.value }))} style={{ width: 250, paddingLeft: 29 }} /></label>
              <button type="button" className="tc-btn primary" onClick={() => invite(employee)} disabled={sending}>{sending ? <><RefreshCw size={14} className="spin" /> A enviar…</> : <><Send size={14} /> Convidar</>}</button>
            </div>
          </div>;
        })}</div>}

        <footer style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <span className="tc-muted" style={{ fontSize: 12 }}>O convite abre o acesso corporativo do colaborador e mantém os dados isolados pela empresa.</span>
        </footer>
      </div>
    </div>}
  </>;
}
