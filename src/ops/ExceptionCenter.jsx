import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarCheck, Check, Clock3, FileWarning, RefreshCw, ShieldAlert, Users, X, Zap } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
const date = (value) => value ? new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short' }).format(new Date(value)) : '—';
const ADMIN = new Set(['SUPER_ADMIN', 'COMPANY_ADMIN', 'RH']);

function Button({ children, icon: Icon, onClick, variant = 'secondary' }) { return <button type="button" onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 11px', borderRadius: 9, border: variant === 'primary' ? '1px solid #3b7dff' : '1px solid rgba(255,255,255,.1)', background: variant === 'primary' ? 'rgba(55,124,255,.16)' : 'rgba(255,255,255,.045)', color: '#fff', fontSize: 9 }}>{Icon && <Icon size={14} />}{children}</button>; }

export default function ExceptionCenter({ profile, onClose }) {
  const [data, setData] = useState({ alerts: [], vacations: [], absences: [], overtime: [], documents: [], tasks: [], integrations: [], payroll: [], onboarding: [], employees: [] });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('ALL');
  const canManage = ADMIN.has(profile?.role);

  const load = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true); setNotice('');
    const companyId = profile.company_id;
    const sevenDays = new Date(Date.now() - 7 * 86400000).toISOString();
    const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10);
    const [alerts, vacations, absences, overtime, documents, tasks, integrations, payroll, onboarding, employees] = await Promise.all([
      supabase.from('hr_alerts').select('id,title,message,severity,status,employee_id,created_at').eq('company_id', companyId).in('status', ['OPEN','ACKNOWLEDGED']).order('created_at',{ascending:false}).limit(300),
      supabase.from('vacation_requests').select('id,employee_id,start_date,end_date,days,created_at').eq('company_id',companyId).eq('status','PENDING').order('created_at',{ascending:true}).limit(300),
      supabase.from('absences').select('id,employee_id,start_date,end_date,reason,created_at').eq('company_id',companyId).eq('status','PENDING').order('created_at',{ascending:true}).limit(300),
      supabase.from('overtime_records').select('id,employee_id,minutes,reason,created_at').eq('company_id',companyId).eq('status','PENDING').order('created_at',{ascending:true}).limit(300),
      supabase.from('employee_documents').select('id,employee_id,title,expires_at,status').eq('company_id',companyId).not('expires_at','is',null).lte('expires_at',thirtyDays).order('expires_at',{ascending:true}).limit(300),
      supabase.from('hr_tasks').select('id,title,priority,status,due_at').eq('company_id',companyId).not('status','in','(DONE,CANCELLED)').lte('due_at',thirtyDays).order('due_at',{ascending:true}).limit(300),
      supabase.from('integration_jobs').select('id,provider,operation,status,last_error,created_at').eq('company_id',companyId).in('status',['FAILED','ERROR']).gte('created_at',sevenDays).order('created_at',{ascending:false}).limit(300),
      supabase.from('payroll_runs').select('id,period_year,period_month,status,updated_at').eq('company_id',companyId).in('status',['DRAFT','CALCULATING','READY']).order('period_year',{ascending:false}).order('period_month',{ascending:false}).limit(24),
      supabase.from('employee_invitations').select('id,employee_id,status,expires_at,last_error').eq('company_id',companyId).eq('status','PENDING').lte('expires_at',thirtyDays).limit(300),
      supabase.from('employees').select('id,full_name,status').eq('company_id',companyId).limit(2000),
    ]);
    const results = { alerts, vacations, absences, overtime, documents, tasks, integrations, payroll, onboarding, employees };
    const firstError = Object.values(results).find((result) => result.error)?.error;
    if (firstError) setNotice(firstError.message || 'Alguns sinais não puderam ser carregados.');
    setData(Object.fromEntries(Object.entries(results).map(([key,result]) => [key, result.data || []])));
    setLoading(false);
  }, [profile?.company_id]);
  useEffect(() => { load(); }, [load]);

  const employeeMap = useMemo(() => new Map(data.employees.map((item) => [item.id, item.full_name])), [data.employees]);
  const items = useMemo(() => [
    ...data.alerts.map((item) => ({ id: `a-${item.id}`, kind:'ALERTA', tone:'danger', title:item.title, detail:`${item.message}${item.employee_id ? ` · ${employeeMap.get(item.employee_id) || 'Colaborador'}` : ''}`, date:item.created_at })),
    ...data.vacations.map((item) => ({ id:`v-${item.id}`, kind:'FÉRIAS', tone:'warning', title:'Pedido de férias pendente', detail:`${employeeMap.get(item.employee_id) || 'Colaborador'} · ${date(item.start_date)} → ${date(item.end_date)} · ${item.days} dias`, date:item.created_at })),
    ...data.absences.map((item) => ({ id:`a2-${item.id}`, kind:'AUSÊNCIA', tone:'warning', title:'Ausência pendente', detail:`${employeeMap.get(item.employee_id) || 'Colaborador'} · ${date(item.start_date)} → ${date(item.end_date)}`, date:item.created_at })),
    ...data.overtime.map((item) => ({ id:`o-${item.id}`, kind:'HORAS EXTRA', tone:'warning', title:'Horas extra aguardam decisão', detail:`${employeeMap.get(item.employee_id) || 'Colaborador'} · ${item.minutes} min${item.reason ? ` · ${item.reason}` : ''}`, date:item.created_at })),
    ...data.documents.map((item) => ({ id:`d-${item.id}`, kind:'DOCUMENTO', tone:new Date(item.expires_at)<new Date()?'danger':'warning', title:new Date(item.expires_at)<new Date()?'Documento expirado':'Documento a expirar', detail:`${employeeMap.get(item.employee_id) || 'Colaborador'} · ${item.title || 'Documento'} · validade ${date(item.expires_at)}`, date:item.expires_at })),
    ...data.tasks.map((item) => ({ id:`t-${item.id}`, kind:'TAREFA', tone:'neutral', title:'Tarefa próxima do prazo', detail:`${item.title} · ${item.priority} · ${item.due_at ? date(item.due_at) : 'sem prazo'}`, date:item.due_at })),
    ...data.integrations.map((item) => ({ id:`i-${item.id}`, kind:'INTEGRAÇÃO', tone:'danger', title:'Integração falhou', detail:`${item.provider} · ${item.operation} · ${item.last_error || item.status}`, date:item.created_at })),
    ...data.payroll.map((item) => ({ id:`p-${item.id}`, kind:'FOLHA', tone:'warning', title:'Período de folha em aberto', detail:`${String(item.period_month).padStart(2,'0')}/${item.period_year} · ${item.status}`, date:item.updated_at })),
    ...data.onboarding.map((item) => ({ id:`n-${item.id}`, kind:'ACESSO', tone:'warning', title:'Convite de colaborador pendente', detail:`${employeeMap.get(item.employee_id) || 'Colaborador'} · expira ${date(item.expires_at)}${item.last_error ? ` · ${item.last_error}` : ''}`, date:item.expires_at })),
  ], [data, employeeMap]);
  const filtered = filter === 'ALL' ? items : items.filter((item) => item.kind === filter);
  const counts = useMemo(() => items.reduce((acc,item) => ({ ...acc, [item.kind]:(acc[item.kind]||0)+1 }), {}), [items]);

  if (!canManage) return null;
  return <div style={{ position:'fixed', inset:0, zIndex:180, overflow:'auto', background:'#07101f', color:'#fff', padding:24 }}>
    <div style={{ maxWidth:1320, margin:'0 auto' }}>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:15, marginBottom:16 }}><div><div style={{ color:'#73a7ff', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'.12em' }}>Operations Intelligence</div><h1 style={{ margin:'5px 0', fontSize:28 }}>Centro de exceções</h1><p style={{ margin:0, color:'rgba(255,255,255,.5)', fontSize:11 }}>Uma fila única para tudo o que exige atenção humana.</p></div><div style={{ display:'flex', gap:7 }}><Button icon={RefreshCw} onClick={load}>Atualizar</Button><Button onClick={onClose} icon={X}>Fechar</Button></div></header>
      {notice && <div style={{ marginBottom:12, padding:10, borderRadius:10, border:'1px solid rgba(239,103,123,.24)', background:'rgba(239,103,123,.07)', color:'#ff9baa', fontSize:9 }}>{notice}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,minmax(0,1fr))', gap:8, marginBottom:13 }}>{[['Tudo',items.length,ShieldAlert,'ALL'],['Alertas',counts.ALERTA||0,AlertTriangle,'ALERTA'],['Férias',counts.FÉRIAS||0,CalendarCheck,'FÉRIAS'],['Horas extra',counts['HORAS EXTRA']||0,Clock3,'HORAS EXTRA'],['Documentos',counts.DOCUMENTO||0,FileWarning,'DOCUMENTO'],['Integrações',counts.INTEGRAÇÃO||0,Zap,'INTEGRAÇÃO']].map(([label,value,Icon,key]) => <button key={label} type="button" onClick={() => setFilter(key)} style={{ textAlign:'left', padding:11, borderRadius:12, border:filter===key?'1px solid rgba(74,137,255,.5)':'1px solid rgba(255,255,255,.08)', background:filter===key?'rgba(59,126,255,.12)':'rgba(255,255,255,.03)', color:'#fff' }}><Icon size={15}/><span style={{ display:'block', marginTop:6, color:'rgba(255,255,255,.5)', fontSize:8 }}>{label}</span><strong style={{ display:'block', marginTop:4, fontSize:21 }}>{value}</strong></button>)}</div>
      {loading ? <div style={{ minHeight:450, display:'grid', placeItems:'center', color:'rgba(255,255,255,.5)' }}>A consolidar exceções…</div> : <div style={{ display:'grid', gap:7 }}>{filtered.slice(0,250).map((item) => <div key={item.id} style={{ display:'grid', gridTemplateColumns:'36px 1fr auto', gap:10, alignItems:'center', padding:13, borderRadius:12, border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.03)' }}><div style={{ width:36,height:36,borderRadius:10,display:'grid',placeItems:'center',background:item.tone==='danger'?'rgba(236,94,113,.1)':'rgba(245,174,55,.1)',color:item.tone==='danger'?'#f0889b':'#e9ba63' }}><AlertTriangle size={16}/></div><div style={{ minWidth:0 }}><strong style={{ display:'block',fontSize:10 }}>{item.title}</strong><span style={{ display:'block',marginTop:4,color:'rgba(255,255,255,.52)',fontSize:9 }}>{item.detail}</span></div><span style={{ color:'rgba(255,255,255,.4)',fontSize:8 }}>{date(item.date)}</span></div>)}{filtered.length===0 && <div style={{ padding:60,textAlign:'center',border:'1px dashed rgba(255,255,255,.12)',borderRadius:12,color:'rgba(255,255,255,.45)' }}><Check size={22}/><p style={{ margin:'8px 0 0' }}>Nenhuma exceção nesta categoria.</p></div>}</div>}
    </div>
  </div>;
}
