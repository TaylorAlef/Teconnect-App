import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarCheck, Check, Clock3, RefreshCw, UserCheck, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
);

const formatDate = (value) => value ? new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
const formatMinutes = (value) => `${Math.floor(Number(value || 0) / 60)}h ${Number(value || 0) % 60}m`;

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

export default function ApprovalsCenter({ profile, onToast }) {
  const [tab, setTab] = useState('vacations');
  const [data, setData] = useState({ vacations: [], overtime: [], absences: [], employees: [], absenceTypes: [] });
  const [loading, setLoading] = useState(true);

  const employeeMap = useMemo(() => new Map(data.employees.map((item) => [item.id, item.full_name])), [data.employees]);
  const typeMap = useMemo(() => new Map(data.absenceTypes.map((item) => [item.id, item.name])), [data.absenceTypes]);

  const load = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const [vacations, overtime, absences, employees, absenceTypes] = await Promise.all([
      supabase.from('vacation_requests').select('id,employee_id,start_date,end_date,days,reason,status,created_at').eq('company_id', profile.company_id).eq('status', 'PENDING').order('created_at', { ascending: true }).limit(300),
      supabase.from('overtime_records').select('id,employee_id,minutes,reason,status,created_at').eq('company_id', profile.company_id).eq('status', 'PENDING').order('created_at', { ascending: true }).limit(300),
      supabase.from('absences').select('id,employee_id,absence_type_id,start_date,end_date,reason,status,document_url,created_at').eq('company_id', profile.company_id).eq('status', 'PENDING').order('created_at', { ascending: true }).limit(300),
      supabase.from('employees').select('id,full_name,employee_code').eq('company_id', profile.company_id).order('full_name').limit(2000),
      supabase.from('absence_types').select('id,name,requires_document,paid').eq('company_id', profile.company_id).eq('active', true).order('name'),
    ]);
    setData({
      vacations: vacations.data || [],
      overtime: overtime.data || [],
      absences: absences.data || [],
      employees: employees.data || [],
      absenceTypes: absenceTypes.data || [],
    });
    const firstError = [vacations, overtime, absences, employees, absenceTypes].find((result) => result.error)?.error;
    if (firstError) onToast?.(firstError.message, 'error');
    setLoading(false);
  }, [profile?.company_id, onToast]);

  useEffect(() => { load(); }, [load]);

  const act = async (message, fn) => {
    try {
      await fn();
      onToast?.(message, 'ok');
      await load();
    } catch (error) {
      onToast?.(error.message || 'Operação não concluída.', 'error');
    }
  };

  const approveVacation = (item, approve) => act(approve ? 'Férias aprovadas.' : 'Pedido de férias rejeitado.', () => rpc('approve_vacation_request', { p_request_id: item.id, p_approve: approve }));
  const approveOvertime = (item, approve) => act(approve ? 'Horas extra aprovadas.' : 'Horas extra rejeitadas.', () => rpc('approve_overtime_record', { p_record_id: item.id, p_approve: approve }));
  const approveAbsence = (item, approve) => act(approve ? 'Ausência aprovada.' : 'Ausência rejeitada.', () => rpc('approve_absence_app', { p_absence_id: item.id, p_approve: approve }));

  const commonButton = { border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: '8px 10px', background: 'rgba(255,255,255,.045)', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' };
  const count = data.vacations.length + data.overtime.length + data.absences.length;

  return (
    <section style={{ maxWidth: 1180, margin: '0 auto', color: 'var(--tc-text, #fff)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <div style={{ color: '#70a8ff', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em' }}>People Operations</div>
          <h2 style={{ margin: '6px 0', fontSize: 28 }}>Centro de aprovações</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,.58)', fontSize: 12 }}>Uma fila única para decisões de férias, ausências e horas extra.</p>
        </div>
        <button type="button" onClick={load} style={commonButton}><RefreshCw size={15} /> Atualizar</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 14 }}>
        {[
          ['Pendentes', count, AlertCircle],
          ['Férias', data.vacations.length, CalendarCheck],
          ['Horas extra', data.overtime.length, Clock3],
          ['Ausências', data.absences.length, UserCheck],
        ].map(([label, value, Icon]) => <div key={label} style={{ border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.035)', borderRadius: 14, padding: 14 }}><Icon size={16} /><div style={{ fontSize: 10, opacity: .62, marginTop: 7 }}>{label}</div><strong style={{ display: 'block', marginTop: 5, fontSize: 24 }}>{value}</strong></div>)}
      </div>

      <div style={{ display: 'flex', gap: 7, marginBottom: 12, borderBottom: '1px solid rgba(255,255,255,.08)', paddingBottom: 10 }}>
        {[['vacations','Férias',CalendarCheck],['overtime','Horas extra',Clock3],['absences','Ausências',UserCheck]].map(([value,label,Icon]) => <button key={value} type="button" onClick={() => setTab(value)} style={{ ...commonButton, background: tab === value ? 'rgba(64,130,255,.18)' : 'rgba(255,255,255,.03)', borderColor: tab === value ? 'rgba(64,130,255,.45)' : 'rgba(255,255,255,.08)' }}><Icon size={14} /> {label}</button>)}
      </div>

      {loading ? <div style={{ padding: 60, textAlign: 'center', opacity: .65 }}>A carregar fila de decisões…</div> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {tab === 'vacations' && data.vacations.map((item) => <ApprovalRow key={item.id} title={employeeMap.get(item.employee_id) || 'Colaborador'} subtitle={`${formatDate(item.start_date)} → ${formatDate(item.end_date)} · ${item.days} dias${item.reason ? ` · ${item.reason}` : ''}`} approve={() => approveVacation(item, true)} reject={() => approveVacation(item, false)} />)}
          {tab === 'overtime' && data.overtime.map((item) => <ApprovalRow key={item.id} title={employeeMap.get(item.employee_id) || 'Colaborador'} subtitle={`${formatMinutes(item.minutes)} · ${item.reason || 'Sem justificação'} · ${formatDate(item.created_at)}`} approve={() => approveOvertime(item, true)} reject={() => approveOvertime(item, false)} />)}
          {tab === 'absences' && data.absences.map((item) => <ApprovalRow key={item.id} title={employeeMap.get(item.employee_id) || 'Colaborador'} subtitle={`${typeMap.get(item.absence_type_id) || 'Ausência'} · ${formatDate(item.start_date)} → ${formatDate(item.end_date)}${item.reason ? ` · ${item.reason}` : ''}${item.document_url ? ' · documento anexado' : ''}`} approve={() => approveAbsence(item, true)} reject={() => approveAbsence(item, false)} />)}
          {((tab === 'vacations' && data.vacations.length === 0) || (tab === 'overtime' && data.overtime.length === 0) || (tab === 'absences' && data.absences.length === 0)) && <div style={{ padding: 60, textAlign: 'center', border: '1px dashed rgba(255,255,255,.12)', borderRadius: 14, color: 'rgba(255,255,255,.5)' }}>Nenhuma decisão pendente nesta fila.</div>}
        </div>
      )}
    </section>
  );
}

function ApprovalRow({ title, subtitle, approve, reject }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 15, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.035)', borderRadius: 13 }}>
    <div style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: 12 }}>{title}</strong><span style={{ display: 'block', marginTop: 5, fontSize: 10, color: 'rgba(255,255,255,.56)' }}>{subtitle}</span></div>
    <div style={{ display: 'flex', gap: 7, flex: '0 0 auto' }}>
      <button type="button" onClick={reject} style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 9, border: '1px solid rgba(239,102,123,.25)', background: 'rgba(239,102,123,.08)', color: '#f08aa0', cursor: 'pointer' }} aria-label="Rejeitar"><X size={15} /></button>
      <button type="button" onClick={approve} style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 9, border: '1px solid rgba(42,201,133,.25)', background: 'rgba(42,201,133,.08)', color: '#51d89f', cursor: 'pointer' }} aria-label="Aprovar"><Check size={15} /></button>
    </div>
  </div>;
}
