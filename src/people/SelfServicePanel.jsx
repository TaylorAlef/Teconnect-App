import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, Bell, CalendarCheck, Clock3, FileText, LogOut, RefreshCw, ShieldCheck, Target, UserRound, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
const date = (value) => value ? new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
const minutes = (value = 0) => `${Math.floor(Number(value || 0) / 60)}h ${Number(value || 0) % 60}m`;

function Card({ title, icon: Icon, children }) {
  return <section style={{ border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.035)', borderRadius: 15, padding: 17 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}><Icon size={16} /><h3 style={{ margin: 0, fontSize: 13 }}>{title}</h3></div>{children}</section>;
}

export default function SelfServicePanel({ profile, onClose, onOpenAttendance }) {
  const [employee, setEmployee] = useState(null);
  const [clock, setClock] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [goals, setGoals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!profile?.user_id) return;
    setLoading(true); setError('');
    const employeeResult = await supabase.from('employees').select('id,user_id,employee_code,full_name,email,phone,nif,department_id,position_id,hire_date,status').eq('company_id', profile.company_id).eq('user_id', profile.user_id).maybeSingle();
    if (employeeResult.error) { setError(employeeResult.error.message); setLoading(false); return; }
    const currentEmployee = employeeResult.data;
    setEmployee(currentEmployee);
    if (!currentEmployee) { setClock({ state: 'UNAVAILABLE' }); setLoading(false); return; }
    const [clockResult, attendanceResult, vacationResult, documentResult, trainingResult, goalResult, notificationResult] = await Promise.all([
      supabase.rpc('get_my_clock_state'),
      supabase.from('attendance_days').select('id,work_date,scheduled_minutes,worked_minutes,overtime_minutes,late_minutes,early_leave_minutes,night_minutes,status,first_clock_in,last_clock_out').eq('company_id', profile.company_id).eq('employee_id', currentEmployee.id).order('work_date', { ascending: false }).limit(30),
      supabase.from('vacation_requests').select('id,start_date,end_date,days,reason,status,created_at').eq('company_id', profile.company_id).eq('employee_id', currentEmployee.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('employee_documents').select('id,document_type,title,issued_at,expires_at,status,notes,created_at').eq('company_id', profile.company_id).eq('employee_id', currentEmployee.id).order('expires_at', { ascending: true, nullsFirst: false }).limit(50),
      supabase.from('employee_trainings').select('id,course_id,status,started_at,completed_at,score,certificate_url,notes,created_at').eq('company_id', profile.company_id).eq('employee_id', currentEmployee.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('performance_goals').select('id,title,target,progress,status,due_date,weight').eq('company_id', profile.company_id).eq('employee_id', currentEmployee.id).order('due_date', { ascending: true, nullsFirst: false }).limit(50),
      supabase.from('notifications').select('id,type,title,message,read_at,created_at').eq('company_id', profile.company_id).eq('user_id', profile.user_id).order('created_at', { ascending: false }).limit(50),
    ]);
    setClock(clockResult.data || null); setAttendance(attendanceResult.data || []); setVacations(vacationResult.data || []); setDocuments(documentResult.data || []); setTrainings(trainingResult.data || []); setGoals(goalResult.data || []); setNotifications(notificationResult.data || []);
    const firstError = [clockResult, attendanceResult, vacationResult, documentResult, trainingResult, goalResult, notificationResult].find((result) => result.error)?.error;
    if (firstError) setError(firstError.message || 'Alguns dados não puderam ser carregados.');
    setLoading(false);
  }, [profile?.company_id, profile?.user_id]);
  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => ({
    worked: minutes(attendance.reduce((sum, row) => sum + Number(row.worked_minutes || 0), 0)),
    overtime: minutes(attendance.reduce((sum, row) => sum + Number(row.overtime_minutes || 0), 0)),
    late: attendance.reduce((sum, row) => sum + Number(row.late_minutes || 0), 0),
    approvedVacationDays: vacations.filter((row) => row.status === 'APPROVED').reduce((sum, row) => sum + Number(row.days || 0), 0),
    goalProgress: goals.length ? Math.round(goals.reduce((sum, row) => sum + Number(row.progress || 0), 0) / goals.length) : 0,
  }), [attendance, vacations, goals]);

  const markRead = async (notification) => {
    const { error: updateError } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notification.id).eq('user_id', profile.user_id).eq('company_id', profile.company_id);
    if (updateError) setError(updateError.message); else load();
  };

  return <div style={{ position: 'fixed', inset: 0, zIndex: 170, overflow: 'auto', background: '#07101f', color: '#fff', padding: '24px' }}>
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14, marginBottom: 16 }}><div><div style={{ color: '#72a6ff', fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>Employee Experience</div><h1 style={{ margin: '5px 0', fontSize: 28 }}>Meu RH</h1><p style={{ margin: 0, color: 'rgba(255,255,255,.5)', fontSize: 11 }}>O essencial do seu ciclo profissional num único espaço.</p></div><div style={{ display: 'flex', gap: 7 }}><button onClick={load} style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: '9px 11px', background: 'rgba(255,255,255,.045)', color: '#fff', display: 'inline-flex', gap: 7, alignItems: 'center' }}><RefreshCw size={15} /> Atualizar</button>{onOpenAttendance && <button onClick={onOpenAttendance} style={{ border: '1px solid #3d7fff', borderRadius: 9, padding: '9px 11px', background: 'linear-gradient(135deg,#397eff,#2458df)', color: '#fff', display: 'inline-flex', gap: 7, alignItems: 'center' }}><Clock3 size={15} /> Abrir ponto</button>}<button onClick={onClose} style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: '9px 11px', background: 'rgba(255,255,255,.045)', color: '#fff', display: 'inline-flex', gap: 7, alignItems: 'center' }}><X size={15} /> Fechar</button></div></header>
      {error && <div style={{ marginBottom: 12, padding: 11, borderRadius: 10, border: '1px solid rgba(239,103,123,.25)', background: 'rgba(239,103,123,.08)', color: '#ff9daf', fontSize: 9 }}>{error}</div>}
      {loading ? <div style={{ minHeight: 520, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.5)' }}>A carregar o seu espaço…</div> : !employee ? <div style={{ minHeight: 520, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.5)' }}><div style={{ textAlign: 'center' }}><UserRound size={26} /><h3 style={{ color: '#fff' }}>Conta ainda não ligada a um colaborador</h3><p style={{ fontSize: 10 }}>Peça ao RH para associar a sua conta ao registo de colaborador.</p></div></div> : <>
        <section style={{ border: '1px solid rgba(255,255,255,.09)', borderRadius: 16, padding: 18, background: 'linear-gradient(135deg,rgba(27,56,111,.7),rgba(10,18,33,.95))', marginBottom: 12 }}><div style={{ display: 'flex', alignItems: 'center', gap: 13 }}><span style={{ width: 58, height: 58, borderRadius: 17, display: 'grid', placeItems: 'center', background: '#e8f1ff', color: '#175bd6', fontWeight: 900 }}>{(employee.full_name || 'TC').split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase()}</span><div><h2 style={{ margin: 0, fontSize: 20 }}>{employee.full_name}</h2><p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,.52)', fontSize: 9 }}>{employee.employee_code || '—'} · {employee.email || 'Sem email'} · Admissão {date(employee.hire_date)}</p></div><div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, color: '#69dfa9', fontSize: 9 }}><ShieldCheck size={15} /> Acesso pessoal protegido</div></div></section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 9, marginBottom: 12 }}>{[['Horas acumuladas', summary.worked, Clock3],['Horas extra', summary.overtime, Target],['Atrasos', `${summary.late} min`, Clock3],['Férias aprovadas', `${summary.approvedVacationDays} d`, CalendarCheck],['Objetivos', `${summary.goalProgress}%`, Award]].map(([label,value,Icon]) => <div key={label} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 13, background: 'rgba(255,255,255,.03)' }}><div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,.48)', fontSize: 8 }}><span>{label}</span><Icon size={14} /></div><strong style={{ display: 'block', marginTop: 11, fontSize: 21 }}>{value}</strong></div>)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 12 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <Card title={`Ponto de hoje · ${clock?.state || 'OFF'}`} icon={Clock3}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 10, background: 'rgba(255,255,255,.035)' }}><div><strong style={{ display: 'block', fontSize: 13 }}>{clock?.state === 'WORKING' ? 'Em trabalho' : clock?.state === 'ON_BREAK' ? 'Em pausa' : 'Fora de serviço'}</strong><small style={{ display: 'block', marginTop: 4, color: 'rgba(255,255,255,.45)', fontSize: 8 }}>{clock?.last_event?.event_type ? `Último evento: ${clock.last_event.event_type}` : 'Nenhuma marcação hoje'}</small></div>{onOpenAttendance && <button onClick={onOpenAttendance} style={{ border: '1px solid #3d7fff', borderRadius: 8, padding: '8px 10px', background: 'rgba(57,126,255,.14)', color: '#a8c5ff', fontSize: 9 }}>Marcar ponto</button>}</div>{attendance.slice(0,7).map((row) => <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.06)', fontSize: 9 }}><span style={{ color: 'rgba(255,255,255,.45)' }}>{date(row.work_date)}</span><span>{minutes(row.worked_minutes)} · atraso {row.late_minutes || 0} min</span><strong>{row.overtime_minutes || 0} min extra</strong></div>)}</Card>
            <Card title="Férias" icon={CalendarCheck}>{vacations.slice(0,6).map((item) => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}><span style={{ fontSize: 9 }}>{date(item.start_date)} → {date(item.end_date)} · {item.days} dias</span><strong style={{ fontSize: 8 }}>{item.status}</strong></div>)}{!vacations.length && <small style={{ color: 'rgba(255,255,255,.45)', fontSize: 9 }}>Sem pedidos registados.</small>}</Card>
            <Card title="Objetivos" icon={Target}>{goals.slice(0,6).map((goal) => <div key={goal.id} style={{ marginBottom: 10 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong style={{ fontSize: 9 }}>{goal.title}</strong><span style={{ fontSize: 8 }}>{goal.progress}%</span></div><div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.08)', marginTop: 5, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${Math.max(0,Math.min(100,Number(goal.progress || 0)))}%`, background: '#4c89ff' }} /></div><small style={{ display: 'block', marginTop: 4, color: 'rgba(255,255,255,.4)', fontSize: 8 }}>{goal.status} · prazo {date(goal.due_date)}</small></div>)}{!goals.length && <small style={{ color: 'rgba(255,255,255,.45)', fontSize: 9 }}>Nenhum objetivo atribuído.</small>}</Card>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <Card title="Documentos" icon={FileText}>{documents.slice(0,8).map((doc) => <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}><div><strong style={{ display: 'block', fontSize: 9 }}>{doc.title || doc.document_type}</strong><small style={{ display: 'block', marginTop: 3, color: 'rgba(255,255,255,.4)', fontSize: 8 }}>Validade {date(doc.expires_at)}</small></div><span style={{ fontSize: 8 }}>{doc.status}</span></div>)}{!documents.length && <small style={{ color: 'rgba(255,255,255,.45)', fontSize: 9 }}>Sem documentos.</small>}</Card>
            <Card title="Formação" icon={Award}>{trainings.slice(0,8).map((item) => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}><span style={{ fontSize: 9 }}>{item.status}</span><strong style={{ fontSize: 8 }}>{item.score ?? '—'}</strong></div>)}{!trainings.length && <small style={{ color: 'rgba(255,255,255,.45)', fontSize: 9 }}>Sem formações.</small>}</Card>
            <Card title={`Notificações · ${notifications.filter((n) => !n.read_at).length} por ler`} icon={Bell}>{notifications.slice(0,8).map((item) => <div key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong style={{ fontSize: 9 }}>{item.title}</strong>{!item.read_at && <button onClick={() => markRead(item)} style={{ border: 0, background: 'transparent', color: '#6da2ff', fontSize: 8 }}>Marcar lida</button>}</div><span style={{ display: 'block', marginTop: 4, color: 'rgba(255,255,255,.48)', fontSize: 8 }}>{item.message}</span></div>)}{!notifications.length && <small style={{ color: 'rgba(255,255,255,.45)', fontSize: 9 }}>Sem notificações.</small>}</Card>
          </div>
        </div>
      </>}
    </div>
  </div>;
}
