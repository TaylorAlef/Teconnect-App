import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Award, BarChart3, CalendarCheck, CheckCircle2, Clock3, FileText, MessageSquareText, RefreshCw, ShieldCheck, Target, UserRound, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
const date = (value) => value ? new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
const today = () => new Date().toISOString().slice(0, 10);
const minutes = (value = 0) => `${Math.floor(Number(value || 0) / 60)}h ${Number(value || 0) % 60}m`;
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'TC';

function Section({ title, icon: Icon, children }) {
  return <section style={{ border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.035)', borderRadius: 16, padding: 18 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}><Icon size={16} /><h3 style={{ margin: 0, fontSize: 13 }}>{title}</h3></div>{children}</section>;
}

function Metric({ label, value, helper }) {
  return <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 13, background: 'rgba(255,255,255,.025)' }}><span style={{ display: 'block', fontSize: 9, color: 'rgba(255,255,255,.5)' }}>{label}</span><strong style={{ display: 'block', marginTop: 5, fontSize: 21 }}>{value}</strong><small style={{ display: 'block', marginTop: 4, color: 'rgba(255,255,255,.42)', fontSize: 8 }}>{helper}</small></div>;
}

export default function Employee360Panel({ profile, onClose, focusEmployeeId = null }) {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState(focusEmployeeId);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shifts, setShifts] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [assignmentDate, setAssignmentDate] = useState(today());
  const [assignmentBusy, setAssignmentBusy] = useState(false);

  const loadEmployees = useCallback(async () => {
    const { data, error: queryError } = await supabase.from('employees').select('id,full_name,employee_code,email,status').eq('company_id', profile.company_id).order('full_name').limit(2000);
    if (queryError) throw queryError;
    setEmployees(data || []);
    if (!selectedId && !focusEmployeeId && data?.[0]?.id) setSelectedId(data[0].id);
  }, [profile.company_id, selectedId, focusEmployeeId]);

  const loadShiftContext = useCallback(async () => {
    if (!profile?.company_id || !selectedId) return;
    const [{ data: shiftRows, error: shiftError }, { data: assignmentRows, error: assignmentError }] = await Promise.all([
      supabase.from('shifts').select('id,name,start_time,end_time,break_minutes,tolerance_minutes,night_shift,active').eq('company_id', profile.company_id).eq('active', true).order('start_time'),
      supabase.from('shift_assignments').select('id,employee_id,shift_id,start_date,end_date').eq('company_id', profile.company_id).eq('employee_id', selectedId).order('start_date', { ascending: false }).limit(10),
    ]);
    if (shiftError) throw shiftError;
    if (assignmentError) throw assignmentError;
    setShifts(shiftRows || []);
    const active = (assignmentRows || []).find((row) => row.start_date <= assignmentDate && (!row.end_date || row.end_date >= assignmentDate)) || assignmentRows?.[0] || null;
    setAssignment(active || null);
  }, [profile?.company_id, selectedId, assignmentDate]);

  const assignShift = async (shiftId) => {
    if (!selectedId || !shiftId) return;
    setAssignmentBusy(true); setError('');
    const { data, error: rpcError } = await supabase.rpc('assign_shift', {
      p_employee_id: selectedId,
      p_shift_id: shiftId,
      p_start_date: assignmentDate,
      p_end_date: null,
    });
    if (rpcError) setError(rpcError.message || 'Não foi possível associar o turno.');
    else { setAssignment(data || null); await loadShiftContext(); }
    setAssignmentBusy(false);
  };

  const loadSummary = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true); setError('');
    const { data, error: rpcError } = await supabase.rpc('get_people_performance_summary', { p_employee_id: selectedId });
    if (rpcError) setError(rpcError.message || 'Não foi possível carregar o colaborador.');
    else setSummary(data || null);
    setLoading(false);
  }, [selectedId]);

  useEffect(() => { loadEmployees().catch((err) => setError(err.message || 'Erro ao carregar colaboradores.')); }, [loadEmployees]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadShiftContext().catch((err) => setError(err.message || 'Erro ao carregar turnos.')); }, [loadShiftContext]);

  const metrics = useMemo(() => {
    const attendance = summary?.attendance || [];
    const vacations = summary?.vacations || [];
    const overtime = summary?.overtime || [];
    const documents = summary?.documents || [];
    const goals = summary?.goals || [];
    const completedGoals = goals.filter((goal) => Number(goal.progress || 0) >= 100).length;
    return {
      worked: minutes(attendance.reduce((total, row) => total + Number(row.worked_minutes || 0), 0)),
      overtime: minutes(overtime.reduce((total, row) => total + Number(row.minutes || 0), 0)),
      approvedLeave: vacations.filter((item) => item.status === 'APPROVED').reduce((total, item) => total + Number(item.days || 0), 0),
      documents: documents.filter((item) => item.status !== 'EXPIRED').length,
      goalProgress: goals.length ? Math.round(goals.reduce((total, item) => total + Number(item.progress || 0), 0) / goals.length) : 0,
      completedGoals,
    };
  }, [summary]);

  const employee = summary?.employee;
  return <div style={{ position: 'fixed', inset: 0, zIndex: 160, overflow: 'auto', background: 'rgba(5,10,20,.96)', backdropFilter: 'blur(15px)', padding: '24px' }}>
    <div style={{ maxWidth: 1420, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div><div style={{ color: '#6fa4ff', fontSize: 10, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '.12em' }}>People Operations</div><h2 style={{ margin: '5px 0', fontSize: 28 }}>Employee 360</h2><p style={{ margin: 0, color: 'rgba(255,255,255,.5)', fontSize: 11 }}>Visão integrada do ciclo de vida do colaborador.</p></div>
        <button type="button" onClick={onClose} style={{ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: '#fff', borderRadius: 9, padding: '9px 12px', display: 'inline-flex', alignItems: 'center', gap: 7 }}><X size={16} /> Fechar</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14 }}>
        <aside style={{ border: '1px solid rgba(255,255,255,.09)', borderRadius: 16, background: 'rgba(255,255,255,.035)', padding: 10, minHeight: 620 }}>
          <div style={{ padding: '7px 8px 12px', color: 'rgba(255,255,255,.45)', fontSize: 9, textTransform: 'uppercase', fontWeight: 800 }}>Colaboradores</div>
          <div style={{ display: 'grid', gap: 5 }}>{employees.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 9, borderRadius: 10, border: selectedId === item.id ? '1px solid rgba(80,145,255,.45)' : '1px solid transparent', background: selectedId === item.id ? 'rgba(65,125,255,.13)' : 'transparent', color: '#fff', textAlign: 'left' }}><span style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', background: '#e8f1ff', color: '#1b59cb', fontSize: 9, fontWeight: 800 }}>{initials(item.full_name)}</span><span style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.full_name}</strong><small style={{ display: 'block', marginTop: 3, color: 'rgba(255,255,255,.45)', fontSize: 8 }}>{item.employee_code || 'Sem código'} · {item.status}</small></span></button>)}</div>
        </aside>
        <main>
          {error && <div style={{ marginBottom: 12, padding: 12, border: '1px solid rgba(239,100,120,.25)', background: 'rgba(239,100,120,.08)', borderRadius: 12, color: '#ff9aac', fontSize: 10 }}>{error}</div>}
          {loading ? <div style={{ minHeight: 500, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.5)' }}><RefreshCw size={18} /> A carregar perfil...</div> : employee ? <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'center', border: '1px solid rgba(255,255,255,.09)', background: 'linear-gradient(135deg,rgba(28,56,110,.65),rgba(12,20,38,.9))', borderRadius: 17, padding: 20, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}><span style={{ width: 64, height: 64, borderRadius: 18, display: 'grid', placeItems: 'center', background: '#e8f1ff', color: '#175bd6', fontWeight: 900 }}>{initials(employee.full_name)}</span><div><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><h3 style={{ margin: 0, fontSize: 20 }}>{employee.full_name}</h3><span style={{ borderRadius: 999, padding: '3px 7px', background: employee.status === 'ACTIVE' ? 'rgba(39,201,132,.12)' : 'rgba(245,174,55,.12)', color: employee.status === 'ACTIVE' ? '#5ee0a5' : '#e4b65d', fontSize: 8 }}>{employee.status}</span></div><span style={{ display: 'block', marginTop: 5, color: 'rgba(255,255,255,.5)', fontSize: 10 }}>{employee.email || 'Sem email'} · {employee.employee_code || 'Sem código'}</span></div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,.55)', fontSize: 9 }}><ShieldCheck size={14} /> Dados protegidos por tenant e papel</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 9, marginBottom: 14 }}>
              <Metric label="Admissão" value={date(employee.hire_date)} helper="data de entrada" />
              <Metric label="Horas" value={metrics.worked} helper="últimos 30 registos" />
              <Metric label="Horas extra" value={metrics.overtime} helper="últimos pedidos" />
              <Metric label="Férias aprovadas" value={`${metrics.approvedLeave} d`} helper="pedidos aprovados" />
              <Metric label="Documentos" value={metrics.documents} helper="válidos / não expirados" />
              <Metric label="Objetivos" value={`${metrics.goalProgress}%`} helper={`${metrics.completedGoals} concluídos`} />
            </div>
            <Section title="Turno & horário" icon={Clock3}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px auto', gap: 9, alignItems: 'end' }}>
                <label style={{ display: 'grid', gap: 5, color: 'rgba(255,255,255,.55)', fontSize: 9 }}>Turno
                  <select value={assignment?.shift_id || ''} onChange={(e) => assignShift(e.target.value)} disabled={assignmentBusy || !shifts.length} style={{ padding: 10, borderRadius: 9, border: '1px solid rgba(255,255,255,.11)', background: '#101a2b', color: '#fff' }}>
                    <option value="">Selecionar turno</option>
                    {shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name} · {String(shift.start_time).slice(0,5)}–{String(shift.end_time).slice(0,5)}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 5, color: 'rgba(255,255,255,.55)', fontSize: 9 }}>Início
                  <input type="date" value={assignmentDate} onChange={(e) => setAssignmentDate(e.target.value)} style={{ padding: 10, borderRadius: 9, border: '1px solid rgba(255,255,255,.11)', background: 'rgba(255,255,255,.04)', color: '#fff' }} />
                </label>
                <div style={{ paddingBottom: 8, fontSize: 9, color: assignment ? '#5ee0a5' : 'rgba(255,255,255,.45)' }}>{assignment ? 'Turno associado' : (shifts.length ? 'Selecione um turno' : 'Nenhum turno criado')}</div>
              </div>
              {assignment && <div style={{ marginTop: 9, fontSize: 8, color: 'rgba(255,255,255,.48)' }}>Válido desde {date(assignment.start_date)}{assignment.end_date ? ' até ' + date(assignment.end_date) : ' · sem data de fim'}. O ponto usa este turno para calcular o dia.</div>}
            </Section>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 12 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <Section title="Assiduidade" icon={Clock3}>{(summary.attendance || []).slice(0, 8).map((row) => <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}><span style={{ fontSize: 9, color: 'rgba(255,255,255,.5)' }}>{date(row.work_date)}</span><span style={{ fontSize: 9 }}>{minutes(row.worked_minutes)} · atraso {Number(row.late_minutes || 0)} min</span><strong style={{ fontSize: 9 }}>{Number(row.overtime_minutes || 0)} min extra</strong></div>)}</Section>
                <Section title="Objetivos e desenvolvimento" icon={Target}>{(summary.goals || []).slice(0, 8).map((goal) => <div key={goal.id} style={{ marginBottom: 11 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong style={{ fontSize: 10 }}>{goal.title}</strong><span style={{ fontSize: 9 }}>{Number(goal.progress || 0)}%</span></div><div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.08)', marginTop: 6, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${Math.min(100, Math.max(0, Number(goal.progress || 0)))}%`, background: '#4e8cff' }} /></div><small style={{ color: 'rgba(255,255,255,.4)', fontSize: 8 }}>{goal.status} · prazo {date(goal.due_date)}</small></div>)}{(summary.goals || []).length === 0 && <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 9 }}>Nenhum objetivo registado.</p>}</Section>
                <Section title="Feedback e avaliações" icon={MessageSquareText}>{(summary.feedback || []).slice(0, 5).map((item) => <div key={item.id} style={{ padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong style={{ fontSize: 9 }}>{item.kind}</strong><small style={{ color: 'rgba(255,255,255,.4)', fontSize: 8 }}>{date(item.created_at)}</small></div><p style={{ margin: '4px 0 0', fontSize: 9, color: 'rgba(255,255,255,.62)' }}>{item.message}</p></div>)}{(summary.feedback || []).length === 0 && <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 9 }}>Sem feedback registado.</p>}</Section>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <Section title="Documentos" icon={FileText}>{(summary.documents || []).slice(0, 8).map((item) => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}><div><strong style={{ display: 'block', fontSize: 9 }}>{item.title || item.document_type}</strong><small style={{ color: 'rgba(255,255,255,.45)', fontSize: 8 }}>Validade {date(item.expires_at)}</small></div><span style={{ fontSize: 8 }}>{item.status}</span></div>)}</Section>
                <Section title="Formação & competências" icon={Award}>{(summary.trainings || []).slice(0, 6).map((item) => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}><span style={{ fontSize: 9 }}>{item.status}</span><strong style={{ fontSize: 9 }}>{item.score ?? '—'}</strong></div>)}{(summary.competencies || []).slice(0, 6).map((item) => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span style={{ fontSize: 9 }}>{item.competency}</span><strong style={{ fontSize: 9 }}>{item.level}</strong></div>)}</Section>
                <Section title="Férias, ausências e horas extra" icon={CalendarCheck}><div style={{ display: 'grid', gap: 8 }}>{(summary.vacations || []).slice(0, 4).map((item) => <div key={item.id} style={{ fontSize: 9 }}><strong>Férias</strong> · {date(item.start_date)} → {date(item.end_date)} · {item.status}</div>)}{(summary.absences || []).slice(0, 4).map((item) => <div key={item.id} style={{ fontSize: 9 }}><strong>Ausência</strong> · {date(item.start_date)} → {date(item.end_date)} · {item.status}</div>)}</div></Section>
              </div>
            </div>
          </> : <div style={{ minHeight: 500, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.45)' }}>Selecione um colaborador.</div>}
        </main>
      </div>
    </div>
  </div>;
}
