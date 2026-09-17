import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CalendarClock, Check, CheckCircle2, MapPin, Plus, RefreshCw, Save, Settings2, Users, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
const today = () => new Date().toISOString().slice(0, 10);
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 11px', borderRadius: 9, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.045)', color: '#fff', fontSize: 10 };

function Button({ children, icon: Icon, variant = 'secondary', onClick, type = 'button', disabled }) { return <button type={type} onClick={onClick} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 12px', borderRadius: 9, border: variant === 'primary' ? '1px solid #3c82ff' : '1px solid rgba(255,255,255,.1)', background: variant === 'primary' ? 'linear-gradient(135deg,#3f82ff,#2459dd)' : 'rgba(255,255,255,.045)', color: '#fff', fontSize: 10, fontWeight: 750, opacity: disabled ? .55 : 1 }}>{Icon && <Icon size={15} />}{children}</button>; }
function Field({ label, children }) { return <label style={{ display: 'grid', gap: 5, fontSize: 9, color: 'rgba(255,255,255,.55)' }}>{label}{children}</label>; }

export default function SetupWizard({ profile, onClose }) {
  const [company, setCompany] = useState(null);
  const [settings, setSettings] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [checklist, setChecklist] = useState({});
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [positionName, setPositionName] = useState('');
  const [locationForm, setLocationForm] = useState({ name: '', address: '', latitude: '', longitude: '', gps_radius_m: 200 });
  const [shiftForm, setShiftForm] = useState({ name: '', start_time: '08:30', end_time: '17:30', break_minutes: 60, tolerance_minutes: 5, night_shift: false });

  const load = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true); setMessage('');
    const companyId = profile.company_id;
    const [companyResult, settingsResult, depResult, posResult, locResult, shiftResult, employeeResult] = await Promise.all([
      supabase.from('companies').select('id,name,nif,email,phone,address').eq('id', companyId).maybeSingle(),
      supabase.from('company_settings').select('company_id,timezone,work_week_days,default_gps_radius_m,night_start,night_end,absenteeism_risk_days,setup_checklist,setup_completed_at').eq('company_id', companyId).maybeSingle(),
      supabase.from('departments').select('id,name,active').eq('company_id', companyId).eq('active', true).order('name'),
      supabase.from('positions').select('id,name,active').eq('company_id', companyId).eq('active', true).order('name'),
      supabase.from('work_locations').select('id,name,address,latitude,longitude,gps_radius_m,active').eq('company_id', companyId).eq('active', true).order('name'),
      supabase.from('shifts').select('id,name,start_time,end_time,break_minutes,tolerance_minutes,night_shift,active').eq('company_id', companyId).eq('active', true).order('name'),
      supabase.from('employees').select('id,full_name,status').eq('company_id', companyId).order('full_name').limit(2000),
    ]);
    const firstError = [companyResult, settingsResult, depResult, posResult, locResult, shiftResult, employeeResult].find((result) => result.error)?.error;
    if (firstError) setMessage(firstError.message || 'Falha ao carregar a configuração.');
    setCompany(companyResult.data || null); setSettings(settingsResult.data || null); setDepartments(depResult.data || []); setPositions(posResult.data || []); setLocations(locResult.data || []); setShifts(shiftResult.data || []); setEmployees(employeeResult.data || []); setChecklist(settingsResult.data?.setup_checklist || {}); setLoading(false);
  }, [profile?.company_id]);
  useEffect(() => { load(); }, [load]);

  const steps = useMemo(() => [
    { id: 1, title: 'Empresa', icon: Building2, done: Boolean(company?.name && company?.email && company?.nif) },
    { id: 2, title: 'Estrutura', icon: Users, done: departments.length > 0 && positions.length > 0 },
    { id: 3, title: 'Ponto', icon: MapPin, done: locations.length > 0 && shifts.length > 0 },
    { id: 4, title: 'Pessoas', icon: Users, done: employees.length > 0 },
    { id: 5, title: 'Concluir', icon: CheckCircle2, done: Boolean(settings?.setup_completed_at) },
  ], [company, departments, positions, locations, shifts, employees, settings]);

  const saveChecklist = async (next, completed = false) => {
    setSaving(true); setMessage('');
    const { data, error } = await supabase.rpc('save_company_setup', { p_checklist: next, p_completed: completed });
    if (error) setMessage(error.message || 'Não foi possível guardar.');
    else { setChecklist(data?.checklist || next); setMessage(completed ? 'Setup concluído.' : 'Progresso guardado.'); await load(); }
    setSaving(false);
  };

  const saveCompany = async (event) => {
    event.preventDefault(); setSaving(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.rpc('update_company_setup_profile', { p_name: form.get('name'), p_nif: form.get('nif') || null, p_email: form.get('email') || null, p_phone: form.get('phone') || null, p_address: form.get('address') || null });
    setSaving(false);
    if (error) setMessage(error.message || 'Não foi possível guardar a empresa.'); else { await saveChecklist({ ...checklist, company: true }); }
  };

  const addDepartment = async () => { if (!departmentName.trim()) return; setSaving(true); const { error } = await supabase.rpc('create_department', { p_name: departmentName.trim() }); setSaving(false); if (error) setMessage(error.message); else { setDepartmentName(''); await load(); await saveChecklist({ ...checklist, structure: true }); } };
  const addPosition = async () => { if (!positionName.trim()) return; setSaving(true); const { error } = await supabase.from('positions').insert({ company_id: profile.company_id, name: positionName.trim(), active: true }); setSaving(false); if (error) setMessage(error.message); else { setPositionName(''); await load(); await saveChecklist({ ...checklist, structure: true }); } };
  const addLocation = async () => { if (!locationForm.name.trim()) return; setSaving(true); const { error } = await supabase.rpc('create_work_location', { p_name: locationForm.name.trim(), p_address: locationForm.address.trim() || null, p_latitude: locationForm.latitude === '' ? null : Number(locationForm.latitude), p_longitude: locationForm.longitude === '' ? null : Number(locationForm.longitude), p_gps_radius_m: Number(locationForm.gps_radius_m) }); setSaving(false); if (error) setMessage(error.message); else { setLocationForm({ name: '', address: '', latitude: '', longitude: '', gps_radius_m: 200 }); await load(); await saveChecklist({ ...checklist, attendance: true }); } };
  const addShift = async () => { if (!shiftForm.name.trim()) return; setSaving(true); const { error } = await supabase.rpc('create_shift', { p_name: shiftForm.name.trim(), p_start_time: shiftForm.start_time, p_end_time: shiftForm.end_time, p_break_minutes: Number(shiftForm.break_minutes), p_tolerance_minutes: Number(shiftForm.tolerance_minutes), p_night_shift: Boolean(shiftForm.night_shift) }); setSaving(false); if (error) setMessage(error.message); else { setShiftForm({ name: '', start_time: '08:30', end_time: '17:30', break_minutes: 60, tolerance_minutes: 5, night_shift: false }); await load(); await saveChecklist({ ...checklist, attendance: true }); } };

  const complete = async () => { const next = { ...checklist, company: true, structure: departments.length > 0 && positions.length > 0, attendance: locations.length > 0 && shifts.length > 0, people: employees.length > 0 }; await saveChecklist(next, true); };
  const current = steps.find((item) => item.id === step);

  if (loading) return <div style={{ position: 'fixed', inset: 0, zIndex: 190, background: '#07101f', color: '#fff', display: 'grid', placeItems: 'center' }}>A preparar o Setup empresarial…</div>;
  return <div style={{ position: 'fixed', inset: 0, zIndex: 190, overflow: 'auto', background: '#07101f', color: '#fff', padding: 24 }}>
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}><div><div style={{ color: '#71a5ff', fontSize: 10, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '.12em' }}>Enterprise Setup</div><h1 style={{ margin: '6px 0', fontSize: 29 }}>Configuração da organização</h1><p style={{ margin: 0, color: 'rgba(255,255,255,.5)', fontSize: 11 }}>Configure a empresa uma vez e deixe o RH operar sozinho.</p></div><div style={{ display: 'flex', gap: 7 }}><Button icon={RefreshCw} onClick={load}>Atualizar</Button><button onClick={onClose} style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#fff', borderRadius: 9, padding: '9px 12px' }}><X size={15} /> Fechar</button></div></header>
      {message && <div style={{ marginBottom: 12, padding: 11, border: '1px solid rgba(72,138,255,.25)', background: 'rgba(54,112,255,.08)', borderRadius: 10, color: '#aac6ff', fontSize: 9 }}>{message}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 14 }}>
        <aside style={{ border: '1px solid rgba(255,255,255,.09)', borderRadius: 15, padding: 10, background: 'rgba(255,255,255,.035)' }}><div style={{ padding: '8px 9px 12px', fontSize: 9, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', fontWeight: 800 }}>Progresso</div>{steps.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setStep(item.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: 10, marginBottom: 4, textAlign: 'left', borderRadius: 10, border: step === item.id ? '1px solid rgba(71,133,255,.42)' : '1px solid transparent', background: step === item.id ? 'rgba(62,123,255,.12)' : 'transparent', color: '#fff' }}><span style={{ width: 25, height: 25, borderRadius: 8, display: 'grid', placeItems: 'center', background: item.done ? 'rgba(39,201,132,.11)' : 'rgba(255,255,255,.05)', color: item.done ? '#57daa1' : 'rgba(255,255,255,.55)' }}>{item.done ? <Check size={14} /> : <Icon size={14} />}</span><span><strong style={{ display: 'block', fontSize: 9 }}>{item.id}. {item.title}</strong><small style={{ display: 'block', marginTop: 2, color: 'rgba(255,255,255,.4)', fontSize: 8 }}>{item.done ? 'Concluído' : 'Pendente'}</small></span></button>; })}</aside>
        <main style={{ border: '1px solid rgba(255,255,255,.09)', borderRadius: 15, padding: 20, background: 'rgba(255,255,255,.025)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}><div><div style={{ fontSize: 9, color: '#71a5ff', textTransform: 'uppercase', fontWeight: 800 }}>Passo {step} de {steps.length}</div><h2 style={{ margin: '5px 0', fontSize: 20 }}>{current?.title}</h2></div><span style={{ fontSize: 9, color: 'rgba(255,255,255,.45)' }}>{steps.filter((s) => s.done).length}/{steps.length} concluídos</span></div>
          {step === 1 && <form onSubmit={saveCompany} style={{ display: 'grid', gap: 11 }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><Field label="Nome legal"><input name="name" required defaultValue={company?.name || ''} style={inputStyle} /></Field><Field label="NIF"><input name="nif" defaultValue={company?.nif || ''} style={inputStyle} /></Field><Field label="Email RH"><input name="email" type="email" defaultValue={company?.email || ''} style={inputStyle} /></Field><Field label="Telefone"><input name="phone" defaultValue={company?.phone || ''} style={inputStyle} /></Field></div><Field label="Morada"><input name="address" defaultValue={company?.address || ''} style={inputStyle} /></Field><div><Button variant="primary" type="submit" icon={Save} disabled={saving}>Guardar empresa</Button></div></form>}
          {step === 2 && <div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}><section><h3 style={{ fontSize: 12 }}>Departamentos</h3><div style={{ display: 'flex', gap: 7, marginBottom: 8 }}><input value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} placeholder="Ex.: Recursos Humanos" style={inputStyle} /><Button variant="primary" icon={Plus} onClick={addDepartment} disabled={saving}>Adicionar</Button></div>{departments.map((item) => <div key={item.id} style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,.06)', fontSize: 9 }}>{item.name}</div>)}</section><section><h3 style={{ fontSize: 12 }}>Funções</h3><div style={{ display: 'flex', gap: 7, marginBottom: 8 }}><input value={positionName} onChange={(e) => setPositionName(e.target.value)} placeholder="Ex.: Técnico RH" style={inputStyle} /><Button variant="primary" icon={Plus} onClick={addPosition} disabled={saving}>Adicionar</Button></div>{positions.map((item) => <div key={item.id} style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,.06)', fontSize: 9 }}>{item.name}</div>)}</section></div><div style={{ marginTop: 18 }}><Button variant="primary" onClick={() => setStep(3)}>Continuar</Button></div></div>}
          {step === 3 && <div><div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 14 }}><section><h3 style={{ fontSize: 12 }}>Locais de trabalho</h3><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><Field label="Nome"><input value={locationForm.name} onChange={(e) => setLocationForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} /></Field><Field label="Morada"><input value={locationForm.address} onChange={(e) => setLocationForm((f) => ({ ...f, address: e.target.value }))} style={inputStyle} /></Field><Field label="Latitude"><input value={locationForm.latitude} onChange={(e) => setLocationForm((f) => ({ ...f, latitude: e.target.value }))} placeholder="38.72" style={inputStyle} /></Field><Field label="Longitude"><input value={locationForm.longitude} onChange={(e) => setLocationForm((f) => ({ ...f, longitude: e.target.value }))} placeholder="-9.14" style={inputStyle} /></Field><Field label="Raio GPS (m)"><input type="number" value={locationForm.gps_radius_m} onChange={(e) => setLocationForm((f) => ({ ...f, gps_radius_m: e.target.value }))} style={inputStyle} /></Field></div><div style={{ marginTop: 8 }}><Button variant="primary" icon={Plus} onClick={addLocation} disabled={saving}>Adicionar local</Button></div>{locations.map((item) => <div key={item.id} style={{ padding: 8, marginTop: 6, border: '1px solid rgba(255,255,255,.06)', borderRadius: 9, fontSize: 9 }}>{item.name} · raio {item.gps_radius_m}m</div>)}</section><section><h3 style={{ fontSize: 12 }}>Turnos</h3><div style={{ display: 'grid', gap: 8 }}><Field label="Nome"><input value={shiftForm.name} onChange={(e) => setShiftForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Normal 08:30–17:30" style={inputStyle} /></Field><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><Field label="Entrada"><input type="time" value={shiftForm.start_time} onChange={(e) => setShiftForm((f) => ({ ...f, start_time: e.target.value }))} style={inputStyle} /></Field><Field label="Saída"><input type="time" value={shiftForm.end_time} onChange={(e) => setShiftForm((f) => ({ ...f, end_time: e.target.value }))} style={inputStyle} /></Field><Field label="Pausa (min)"><input type="number" value={shiftForm.break_minutes} onChange={(e) => setShiftForm((f) => ({ ...f, break_minutes: e.target.value }))} style={inputStyle} /></Field><Field label="Tolerância (min)"><input type="number" value={shiftForm.tolerance_minutes} onChange={(e) => setShiftForm((f) => ({ ...f, tolerance_minutes: e.target.value }))} style={inputStyle} /></Field></div><label style={{ fontSize: 9 }}><input type="checkbox" checked={shiftForm.night_shift} onChange={(e) => setShiftForm((f) => ({ ...f, night_shift: e.target.checked }))} /> Turno noturno</label><Button variant="primary" icon={Plus} onClick={addShift} disabled={saving}>Adicionar turno</Button>{shifts.map((item) => <div key={item.id} style={{ padding: 8, marginTop: 6, border: '1px solid rgba(255,255,255,.06)', borderRadius: 9, fontSize: 9 }}>{item.name} · {item.start_time}–{item.end_time}</div>)}</div></section></div><div style={{ marginTop: 18 }}><Button variant="primary" onClick={() => setStep(4)}>Continuar</Button></div></div>}
          {step === 4 && <div><div style={{ padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', marginBottom: 12 }}><Users size={18} /><h3 style={{ margin: '8px 0 4px', fontSize: 14 }}>Colaboradores</h3><p style={{ margin: 0, color: 'rgba(255,255,255,.48)', fontSize: 9 }}>Já existem {employees.length} colaboradores neste tenant. Use o módulo Colaboradores para importar/criar a equipa e o Gestor de acessos para ativar contas.</p></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}><div style={{ padding: 12, border: '1px solid rgba(255,255,255,.08)', borderRadius: 11 }}>Ativos<strong style={{ display: 'block', marginTop: 5, fontSize: 20 }}>{employees.filter((e) => e.status === 'ACTIVE').length}</strong></div><div style={{ padding: 12, border: '1px solid rgba(255,255,255,.08)', borderRadius: 11 }}>Inativos<strong style={{ display: 'block', marginTop: 5, fontSize: 20 }}>{employees.filter((e) => e.status !== 'ACTIVE').length}</strong></div><div style={{ padding: 12, border: '1px solid rgba(255,255,255,.08)', borderRadius: 11 }}>Total<strong style={{ display: 'block', marginTop: 5, fontSize: 20 }}>{employees.length}</strong></div></div><div style={{ marginTop: 18 }}><Button variant="primary" onClick={() => setStep(5)}>Continuar</Button></div></div>}
          {step === 5 && <div style={{ textAlign: 'center', padding: 30 }}><div style={{ width: 62, height: 62, margin: '0 auto 12px', borderRadius: 18, background: 'rgba(41,200,131,.1)', display: 'grid', placeItems: 'center', color: '#55dca1' }}><CheckCircle2 size={31} /></div><h3 style={{ fontSize: 20 }}>Pronto para operar</h3><p style={{ color: 'rgba(255,255,255,.5)', fontSize: 10, maxWidth: 520, margin: '0 auto 18px' }}>Ao concluir, o checklist de configuração fica registado no tenant e o RH pode trabalhar com ponto, férias, documentos, formação, recrutamento, tarefas, alertas e folha.</p><div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}><Button onClick={() => setStep(1)}>Rever configuração</Button><Button variant="primary" icon={Check} onClick={complete} disabled={saving}>Concluir setup</Button></div></div>}
        </main>
      </div>
    </div>
  </div>;
}
