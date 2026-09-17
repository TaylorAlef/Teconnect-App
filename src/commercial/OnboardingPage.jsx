import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock3,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const STEPS = [
  { key: 'company', label: 'Empresa', icon: Building2 },
  { key: 'department', label: 'Departamento', icon: Users },
  { key: 'location', label: 'Local', icon: MapPin },
  { key: 'shift', label: 'Turno', icon: Clock3 },
  { key: 'employee', label: 'Colaborador', icon: UserPlus },
  { key: 'finish', label: 'Pronto', icon: CheckCircle2 },
];

const today = new Date().toISOString().slice(0, 10);

const errorMessage = (error) => {
  const code = error?.message || '';
  const messages = {
    PLAN_EMPLOYEE_LIMIT_REACHED: 'O limite de colaboradores do plano atual foi atingido.',
    BILLING_PAST_DUE: 'A subscrição está com faturação pendente. Regularize o plano para continuar.',
    EMPLOYEE_CODE_ALREADY_EXISTS: 'O código do colaborador já existe nesta empresa.',
    NOT_AUTHORIZED: 'A sua conta não tem permissão para concluir esta configuração.',
    PROFILE_NOT_FOUND: 'O perfil da empresa ainda não está disponível. Atualize a página e tente novamente.',
  };
  return messages[code] || code || 'Não foi possível concluir esta etapa.';
};

export default function OnboardingPage({ onComplete }) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [company, setCompany] = useState({ name: '', nif: '', phone: '', address: '' });
  const [department, setDepartment] = useState({ name: 'Recursos Humanos' });
  const [departments, setDepartments] = useState([]);
  const [location, setLocation] = useState({ name: 'Sede principal', address: '', latitude: '', longitude: '', radius: '200' });
  const [locations, setLocations] = useState([]);
  const [shift, setShift] = useState({ name: 'Horário normal', start: '09:00', end: '18:00', breakMinutes: '60', tolerance: '5' });
  const [shifts, setShifts] = useState([]);
  const [employee, setEmployee] = useState({ code: '001', name: '', email: '', phone: '', nif: '', hireDate: today });

  const progress = Math.round((step / (STEPS.length - 1)) * 100);

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_my_onboarding_v1');
      if (rpcError) throw rpcError;
      const next = data || { has_company: false, current_step: 1, completed_steps: [] };
      setState(next);
      const nextCompleted = Array.isArray(next.completed_steps) ? next.completed_steps : [];
      setCompleted(nextCompleted);

      if (next.has_company) {
        const [departmentResult, locationResult, shiftResult] = await Promise.all([
          supabase.from('departments').select('id,name').eq('active', true).order('name'),
          supabase.from('work_locations').select('id,name,address,latitude,longitude,gps_radius_m').eq('active', true).order('name'),
          supabase.from('shifts').select('id,name,start_time,end_time,break_minutes,tolerance_minutes').eq('active', true).order('name'),
        ]);
        if (departmentResult.error) throw departmentResult.error;
        if (locationResult.error) throw locationResult.error;
        if (shiftResult.error) throw shiftResult.error;
        setDepartments(departmentResult.data || []);
        setLocations(locationResult.data || []);
        setShifts(shiftResult.data || []);

        const checks = next.checks || {};
        const firstMissing = ['department', 'location', 'shift', 'employee'].findIndex((key) => !checks[key]);
        setStep(firstMissing === -1 ? 5 : firstMissing + 1);
      } else {
        setStep(0);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveProgress = async (nextStep, nextCompleted) => {
    const { error: progressError } = await supabase.rpc('save_onboarding_v1_progress', {
      p_current_step: nextStep + 1,
      p_completed_steps: nextCompleted,
    });
    if (progressError) throw progressError;
    setCompleted(nextCompleted);
  };

  const markDone = async (key, nextStep) => {
    const nextCompleted = Array.from(new Set([...completed, key]));
    await saveProgress(nextStep, nextCompleted);
    setStep(nextStep);
  };

  const submitCompany = async () => {
    if (!company.name.trim()) throw new Error('Indique o nome da empresa.');
    const { error: rpcError } = await supabase.rpc('create_company_onboarding', {
      p_company_name: company.name.trim(),
      p_nif: company.nif.trim() || null,
      p_phone: company.phone.trim() || null,
      p_address: company.address.trim() || null,
    });
    if (rpcError) throw rpcError;
    await markDone('company', 1);
    await load();
  };

  const submitDepartment = async () => {
    if (!department.name.trim()) throw new Error('Indique o nome do departamento.');
    if (!departments.length) {
      const { data, error: rpcError } = await supabase.rpc('create_department', { p_name: department.name.trim() });
      if (rpcError) throw rpcError;
      setDepartments([data]);
    }
    await markDone('department', 2);
  };

  const submitLocation = async () => {
    if (!location.name.trim()) throw new Error('Indique o nome do local.');
    if (!locations.length) {
      const latitude = location.latitude === '' ? null : Number(location.latitude);
      const longitude = location.longitude === '' ? null : Number(location.longitude);
      if ((latitude === null) !== (longitude === null)) throw new Error('Informe latitude e longitude juntas ou deixe ambas vazias.');
      const { data, error: rpcError } = await supabase.rpc('create_work_location', {
        p_name: location.name.trim(),
        p_address: location.address.trim() || null,
        p_latitude: latitude,
        p_longitude: longitude,
        p_gps_radius_m: Number(location.radius) || 200,
      });
      if (rpcError) throw rpcError;
      setLocations([data]);
    }
    await markDone('location', 3);
  };

  const submitShift = async () => {
    if (!shift.name.trim()) throw new Error('Indique o nome do turno.');
    if (!shifts.length) {
      const { data, error: rpcError } = await supabase.rpc('create_shift', {
        p_name: shift.name.trim(),
        p_start_time: shift.start,
        p_end_time: shift.end,
        p_break_minutes: Number(shift.breakMinutes) || 60,
        p_tolerance_minutes: Number(shift.tolerance) || 5,
        p_night_shift: false,
      });
      if (rpcError) throw rpcError;
      setShifts([data]);
    }
    await markDone('shift', 4);
  };

  const submitEmployee = async () => {
    if (!employee.name.trim()) throw new Error('Indique o nome do colaborador.');
    if (!employee.code.trim()) throw new Error('Indique o código do colaborador.');
    const selectedDepartment = departments[0];
    const selectedShift = shifts[0];
    if (!selectedDepartment?.id || !selectedShift?.id) throw new Error('Configure primeiro o departamento e o turno.');

    const { data: createdEmployee, error: employeeError } = await supabase.rpc('create_employee', {
      p_employee_code: employee.code.trim(),
      p_full_name: employee.name.trim(),
      p_email: employee.email.trim() || null,
      p_phone: employee.phone.trim() || null,
      p_nif: employee.nif.trim() || null,
      p_department_id: selectedDepartment.id,
      p_position_id: null,
      p_hire_date: employee.hireDate || today,
    });
    if (employeeError) throw employeeError;

    const { error: shiftError } = await supabase.rpc('assign_shift', {
      p_employee_id: createdEmployee.id,
      p_shift_id: selectedShift.id,
      p_start_date: employee.hireDate || today,
      p_end_date: null,
    });
    if (shiftError) throw shiftError;

    await markDone('employee', 5);
    await load();
  };

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      const nextCompleted = Array.from(new Set([...completed, 'finish', 'employee', 'shift', 'location', 'department', 'company']));
      await saveProgress(5, nextCompleted);
      setStep(5);
      onComplete();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const run = async (action) => {
    setBusy(true);
    setError('');
    try { await action(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  const ready = useMemo(() => Boolean(state?.ready), [state]);

  if (loading) {
    return <div style={overlay}><div className="tc-card" style={loadingCard}><Loader2 className="spin" size={20} /> A preparar a configuração da empresa…</div></div>;
  }

  return (
    <div style={overlay}>
      <div style={shell}>
        <header style={header}>
          <div className="tc-brand">
            <div className="tc-brand-mark">T</div>
            <div><strong>Teconnect</strong><span>People OS</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, opacity: .65 }}>Configuração empresarial</div>
            <strong>{progress}% concluído</strong>
          </div>
        </header>

        <div style={progressTrack}><span style={{ ...progressFill, width: `${progress}%` }} /></div>

        <div style={bodyGrid}>
          <aside className="tc-card" style={sideCard}>
            <div className="tc-eyebrow"><ShieldCheck size={14} /> Setup seguro</div>
            <h2 style={{ margin: '10px 0 6px' }}>Vamos colocar a operação de pé.</h2>
            <p className="tc-muted" style={{ lineHeight: 1.55 }}>Em poucos passos, a empresa fica preparada para pessoas, assiduidade e gestão diária.</p>
            <div style={{ marginTop: 24, display: 'grid', gap: 8 }}>
              {STEPS.map((item, index) => {
                const Icon = item.icon;
                const done = completed.includes(item.key) || (item.key === 'finish' && ready);
                const current = index === step;
                return <button key={item.key} type="button" onClick={() => index <= step && setStep(index)} disabled={index > step} style={{ ...stepButton, opacity: index > step ? .42 : 1, borderColor: current ? 'rgba(100,150,255,.38)' : 'rgba(255,255,255,.07)' }}>
                  {done ? <CheckCircle2 size={17} /> : current ? <Icon size={17} /> : <Circle size={17} />}
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  {done && <span style={{ fontSize: 11, opacity: .7 }}>OK</span>}
                </button>;
              })}
            </div>
          </aside>

          <main className="tc-card" style={mainCard}>
            {error && <div className="tc-error" style={{ marginBottom: 18 }}>{error}</div>}

            {step === 0 && <Step title="Crie o ambiente da empresa" description="Estes dados serão a base da organização no Teconnect." icon={Building2}>
              <div className="tc-form">
                <label>Nome da empresa<input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} placeholder="Ex.: Taylor Consulting, Lda." autoFocus required /></label>
                <label>NIF <span className="tc-muted">(opcional)</span><input value={company.nif} onChange={(e) => setCompany({ ...company, nif: e.target.value })} placeholder="PT 000 000 000" /></label>
                <label><Phone size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Telefone <span className="tc-muted">(opcional)</span><input value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} placeholder="+351 ..." /></label>
                <label>Morada <span className="tc-muted">(opcional)</span><input value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} placeholder="Lisboa, Portugal" /></label>
              </div>
            </Step>}

            {step === 1 && <Step title="Crie o primeiro departamento" description="A estrutura organizacional será usada para equipas, relatórios e permissões." icon={Users}>
              {departments.length > 0 ? <ResourceChoice label="Departamento disponível" items={departments} value={departments[0].id} /> : <div className="tc-form"><label>Nome do departamento<input value={department.name} onChange={(e) => setDepartment({ name: e.target.value })} autoFocus /></label></div>}
            </Step>}

            {step === 2 && <Step title="Configure o primeiro local" description="O local pode ser usado como referência de geofence para o ponto." icon={MapPin}>
              {locations.length > 0 ? <ResourceChoice label="Local disponível" items={locations} value={locations[0].id} extra={locations[0].address || 'Geofence configurável'} /> : <div className="tc-form">
                <label>Nome do local<input value={location.name} onChange={(e) => setLocation({ ...location, name: e.target.value })} autoFocus /></label>
                <label>Morada<input value={location.address} onChange={(e) => setLocation({ ...location, address: e.target.value })} placeholder="Rua, cidade, Portugal" /></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label>Latitude <span className="tc-muted">(opcional)</span><input value={location.latitude} onChange={(e) => setLocation({ ...location, latitude: e.target.value })} placeholder="38.7223" inputMode="decimal" /></label>
                  <label>Longitude <span className="tc-muted">(opcional)</span><input value={location.longitude} onChange={(e) => setLocation({ ...location, longitude: e.target.value })} placeholder="-9.1393" inputMode="decimal" /></label>
                </div>
                <label>Raio de geofence (metros)<input value={location.radius} onChange={(e) => setLocation({ ...location, radius: e.target.value })} type="number" min="50" step="10" /></label>
              </div>}
            </Step>}

            {step === 3 && <Step title="Defina o primeiro turno" description="Este horário será usado para calcular assiduidade, atrasos e horas extra." icon={Clock3}>
              {shifts.length > 0 ? <ResourceChoice label="Turno disponível" items={shifts} value={shifts[0].id} extra={`${String(shifts[0].start_time).slice(0, 5)} – ${String(shifts[0].end_time).slice(0, 5)}`} /> : <div className="tc-form">
                <label>Nome do turno<input value={shift.name} onChange={(e) => setShift({ ...shift, name: e.target.value })} autoFocus /></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label>Entrada<input type="time" value={shift.start} onChange={(e) => setShift({ ...shift, start: e.target.value })} /></label>
                  <label>Saída<input type="time" value={shift.end} onChange={(e) => setShift({ ...shift, end: e.target.value })} /></label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label>Pausa (minutos)<input type="number" min="0" value={shift.breakMinutes} onChange={(e) => setShift({ ...shift, breakMinutes: e.target.value })} /></label>
                  <label>Tolerância (minutos)<input type="number" min="0" value={shift.tolerance} onChange={(e) => setShift({ ...shift, tolerance: e.target.value })} /></label>
                </div>
              </div>}
            </Step>}

            {step === 4 && <Step title="Adicione o primeiro colaborador" description="O primeiro colaborador fica ligado ao departamento e ao turno configurados acima." icon={UserPlus}>
              <div className="tc-form">
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12 }}>
                  <label>Código<input value={employee.code} onChange={(e) => setEmployee({ ...employee, code: e.target.value })} autoFocus /></label>
                  <label>Nome completo<input value={employee.name} onChange={(e) => setEmployee({ ...employee, name: e.target.value })} placeholder="Nome do colaborador" /></label>
                </div>
                <label>E-mail <span className="tc-muted">(opcional)</span><input type="email" value={employee.email} onChange={(e) => setEmployee({ ...employee, email: e.target.value })} placeholder="nome@empresa.pt" /></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label>Telefone <span className="tc-muted">(opcional)</span><input value={employee.phone} onChange={(e) => setEmployee({ ...employee, phone: e.target.value })} /></label>
                  <label>NIF <span className="tc-muted">(opcional)</span><input value={employee.nif} onChange={(e) => setEmployee({ ...employee, nif: e.target.value })} /></label>
                </div>
                <label>Data de entrada<input type="date" value={employee.hireDate} onChange={(e) => setEmployee({ ...employee, hireDate: e.target.value })} /></label>
              </div>
            </Step>}

            {step === 5 && <Step title="Empresa pronta para operar" description="A estrutura mínima está criada. A partir daqui, o RH pode gerir a operação no workspace." icon={CheckCircle2}>
              <div className="tc-card" style={{ padding: 20, marginTop: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                  <Metric label="Departamentos" value={state?.departments_count || departments.length} />
                  <Metric label="Locais" value={state?.locations_count || locations.length} />
                  <Metric label="Turnos" value={state?.shifts_count || shifts.length} />
                  <Metric label="Colaboradores" value={state?.employees_count || 0} />
                </div>
              </div>
              <div className="tc-geofence" style={{ marginTop: 16 }}><ShieldCheck size={17} className="tc-ok" /><span>O trial inicial e os limites de utilização continuam associados ao plano da empresa.</span></div>
            </Step>}

            <footer style={footer}>
              {step > 0 && step < 5 ? <button type="button" className="tc-btn ghost" onClick={() => setStep(step - 1)} disabled={busy}><ChevronLeft size={16} /> Voltar</button> : <span />}
              {step === 0 && <button type="button" className="tc-btn primary" onClick={() => run(submitCompany)} disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <ArrowRight size={16} />} Criar empresa e continuar</button>}
              {step === 1 && <button type="button" className="tc-btn primary" onClick={() => run(submitDepartment)} disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <ArrowRight size={16} />} Guardar departamento</button>}
              {step === 2 && <button type="button" className="tc-btn primary" onClick={() => run(submitLocation)} disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <ArrowRight size={16} />} Guardar local</button>}
              {step === 3 && <button type="button" className="tc-btn primary" onClick={() => run(submitShift)} disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <ArrowRight size={16} />} Guardar turno</button>}
              {step === 4 && <button type="button" className="tc-btn primary" onClick={() => run(submitEmployee)} disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <ArrowRight size={16} />} Criar colaborador e concluir setup</button>}
              {step === 5 && <button type="button" className="tc-btn primary" onClick={finish} disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <Check size={16} />} Entrar no workspace</button>}
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

function Step({ title, description, icon: Icon, children }) {
  return <>
    <div className="tc-eyebrow"><Icon size={15} /> Etapa de configuração</div>
    <h1 style={{ margin: '10px 0 8px', fontSize: 30 }}>{title}</h1>
    <p className="tc-muted" style={{ lineHeight: 1.65, maxWidth: 680 }}>{description}</p>
    {children}
  </>;
}

function ResourceChoice({ label, items, value, extra }) {
  const item = items.find((entry) => entry.id === value) || items[0];
  return <div className="tc-card" style={{ padding: 18, marginTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
    <CheckCircle2 size={20} className="tc-ok" />
    <div><strong>{label}: {item?.name}</strong><div className="tc-muted" style={{ marginTop: 4 }}>{extra || 'Já existe na empresa e será reutilizado nesta configuração.'}</div></div>
  </div>;
}

function Metric({ label, value }) {
  return <div><div className="tc-muted" style={{ fontSize: 12 }}>{label}</div><strong style={{ display: 'block', fontSize: 22, marginTop: 4 }}>{value}</strong></div>;
}

const overlay = { position: 'fixed', inset: 0, zIndex: 300, overflow: 'auto', background: 'var(--tc-bg, #080c16)', padding: '30px 20px 44px' };
const shell = { width: 'min(1180px, 100%)', margin: '0 auto' };
const header = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 14 };
const progressTrack = { height: 5, borderRadius: 99, background: 'rgba(255,255,255,.08)', overflow: 'hidden', marginBottom: 22 };
const progressFill = { height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#5b8cff,#8b5cf6)' };
const bodyGrid = { display: 'grid', gridTemplateColumns: '310px minmax(0,1fr)', gap: 18, alignItems: 'start' };
const sideCard = { padding: 22, position: 'sticky', top: 18 };
const mainCard = { padding: 30, minHeight: 590, display: 'flex', flexDirection: 'column' };
const stepButton = { width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', border: '1px solid', borderRadius: 10, background: 'transparent', color: 'inherit', cursor: 'pointer' };
const footer = { marginTop: 'auto', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 };
const loadingCard = { width: 'min(520px,100%)', margin: '16vh auto 0', padding: 28, display: 'flex', alignItems: 'center', gap: 10 };
