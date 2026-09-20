import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, CalendarCheck, Clock3, Download, RefreshCw, TrendingUp, Users, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { downloadTextFile, rowsToCsv } from '../lib/csv.js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
const ADMIN = new Set(['SUPER_ADMIN','COMPANY_ADMIN','RH']);
const dayKey = (value) => new Date(value).toISOString().slice(0,10);
const date = (value) => value ? new Intl.DateTimeFormat('pt-PT', { month:'short', year:'numeric' }).format(new Date(value)) : '—';
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;

function Card({ title, value, note, icon: Icon }) { return <div style={{ border:'1px solid rgba(255,255,255,.09)', borderRadius:14, background:'rgba(255,255,255,.035)', padding:14 }}><div style={{ display:'flex', justifyContent:'space-between', color:'rgba(255,255,255,.5)', fontSize:9 }}><span>{title}</span><Icon size={15}/></div><strong style={{ display:'block', marginTop:13, fontSize:23 }}>{value}</strong><small style={{ display:'block', marginTop:4, color:'rgba(255,255,255,.38)', fontSize:8 }}>{note}</small></div>; }

function Sparkline({ values = [] }) { const max = Math.max(1,...values); const min = Math.min(0,...values); const points = values.map((value,index) => { const x = values.length===1?0.5:index/(values.length-1); const y = (value-min)/(max-min||1); return `${(x*100).toFixed(2)},${(100-y*82-9).toFixed(2)}`; }).join(' '); return <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width:'100%',height:160 }}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" /><line x1="0" y1="91" x2="100" y2="91" stroke="currentColor" opacity=".12"/></svg>; }

export default function PeopleAnalyticsCenter({ profile, onClose }) {
  const canManage = ADMIN.has(profile?.role);
  const [days, setDays] = useState(90);
  const [employees,setEmployees] = useState([]); const [attendance,setAttendance] = useState([]); const [vacations,setVacations] = useState([]); const [absences,setAbsences] = useState([]); const [overtime,setOvertime] = useState([]); const [jobs,setJobs] = useState([]); const [candidates,setCandidates] = useState([]); const [payroll,setPayroll] = useState([]); const [loading,setLoading] = useState(true); const [message,setMessage] = useState('');

  const load = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true); setMessage('');
    const start = new Date(Date.now() - days*86400000).toISOString().slice(0,10);
    const [e,a,v,ab,o,j,c,p] = await Promise.all([
      supabase.from('employees').select('id,full_name,status,hire_date').eq('company_id',profile.company_id).limit(3000),
      supabase.from('attendance_days').select('work_date,employee_id,worked_minutes,overtime_minutes,late_minutes,early_leave_minutes,status').eq('company_id',profile.company_id).gte('work_date',start).order('work_date'),
      supabase.from('vacation_requests').select('employee_id,days,status,created_at').eq('company_id',profile.company_id).gte('created_at',start).limit(3000),
      supabase.from('absences').select('employee_id,start_date,end_date,status,created_at').eq('company_id',profile.company_id).gte('created_at',start).limit(3000),
      supabase.from('overtime_records').select('employee_id,minutes,status,created_at').eq('company_id',profile.company_id).gte('created_at',start).limit(3000),
      supabase.from('recruitment_jobs').select('id,title,status,opened_at,closed_at,created_at').eq('company_id',profile.company_id).gte('created_at',start).limit(500),
      supabase.from('recruitment_candidates').select('job_id,stage,created_at').eq('company_id',profile.company_id).gte('created_at',start).limit(3000),
      supabase.from('payroll_runs').select('period_year,period_month,status,gross_cents,net_cents,employee_count,updated_at').eq('company_id',profile.company_id).order('period_year',{ascending:false}).order('period_month',{ascending:false}).limit(12),
    ]);
    const firstError = [e,a,v,ab,o,j,c,p].find((result)=>result.error)?.error;
    if(firstError) setMessage(firstError.message || 'Não foi possível carregar os indicadores.');
    setEmployees(e.data||[]);setAttendance(a.data||[]);setVacations(v.data||[]);setAbsences(ab.data||[]);setOvertime(o.data||[]);setJobs(j.data||[]);setCandidates(c.data||[]);setPayroll(p.data||[]);setLoading(false);
  }, [profile?.company_id,days]);
  useEffect(()=>{load();},[load]);

  const active = employees.filter((e)=>e.status==='ACTIVE');
  const present = attendance.filter((row)=>!['ABSENT','NOT_SCHEDULED'].includes(row.status));
  const late = attendance.filter((row)=>Number(row.late_minutes||0)>0);
  const extraMinutes = overtime.filter((row)=>row.status!=='REJECTED').reduce((sum,row)=>sum+Number(row.minutes||0),0);
  const approvedLeave = vacations.filter((row)=>row.status==='APPROVED').reduce((sum,row)=>sum+Number(row.days||0),0);
  const attendanceByDay = useMemo(()=>{const map=new Map();attendance.forEach((row)=>{const k=dayKey(row.work_date);const item=map.get(k)||{present:0,late:0,extra:0};item.present+=present.includes(row)?1:0;item.late+=Number(row.late_minutes||0)>0?1:0;item.extra+=Number(row.overtime_minutes||0);map.set(k,item);});return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]));},[attendance,present]);
  const headcountByMonth = useMemo(()=>{const buckets=new Map();employees.forEach((e)=>{if(e.status!=='ACTIVE')return;const k=new Date(e.hire_date||Date.now());const key=`${k.getUTCFullYear()}-${String(k.getUTCMonth()+1).padStart(2,'0')}`;buckets.set(key,(buckets.get(key)||0)+1);});return [...buckets.entries()].slice(-12);},[employees]);
  const recruitment = useMemo(()=>{const map=new Map();candidates.forEach((c)=>map.set(c.stage,(map.get(c.stage)||0)+1));return [...map.entries()].sort((a,b)=>b[1]-a[1]);},[candidates]);
  const labels = attendanceByDay.filter((_,i)=>i%Math.max(1,Math.ceil(attendanceByDay.length/7))===0).map(([key])=>date(key));
  const attendanceSeries = attendanceByDay.map(([,value])=>value.present);

  const downloadCsv = () => {
    const headers = ['Indicador','Valor'];
    const data = [
      ['Colaboradores ativos', active.length],
      ['Presença média', attendance.length ? ((present.length / attendance.length) * 100).toFixed(1) + '%' : '0%'],
      ['Registos com atraso', late.length],
      ['Horas extra', `${Math.floor(extraMinutes / 60)}h ${extraMinutes % 60}m`],
      ['Férias aprovadas (dias)', approvedLeave],
      ['Vagas', jobs.length],
      ['Candidatos', candidates.length],
    ];
    downloadTextFile(`te-connect-people-analytics-${new Date().toISOString().slice(0,10)}.csv`, rowsToCsv(headers, data), 'text/csv;charset=utf-8');
  };

  if(!canManage) return null;
  return <div style={{ position:'fixed',inset:0,zIndex:185,overflow:'auto',background:'#07101f',color:'#fff',padding:24 }}><div style={{maxWidth:1400,margin:'0 auto'}}>
    <header style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:12,marginBottom:16}}><div><div style={{color:'#71a5ff',fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'.12em'}}>People Intelligence</div><h1 style={{margin:'5px 0',fontSize:28}}>Analytics RH</h1><p style={{margin:0,color:'rgba(255,255,255,.5)',fontSize:11}}>Tendências operacionais para apoiar decisões de pessoas.</p></div><div style={{display:'flex',gap:7}}><select value={days} onChange={(e)=>setDays(Number(e.target.value))} style={{border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.045)',color:'#fff',borderRadius:9,padding:'9px 10px',fontSize:9}}><option value="30">30 dias</option><option value="90">90 dias</option><option value="180">180 dias</option></select><button onClick={downloadCsv} style={{border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.045)',color:'#fff',borderRadius:9,padding:'9px 11px',display:'inline-flex',gap:7,alignItems:'center',fontSize:9}}><Download size={14}/> Exportar CSV</button><button onClick={load} style={{border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.045)',color:'#fff',borderRadius:9,padding:'9px 11px',display:'inline-flex',gap:7,alignItems:'center',fontSize:9}}><RefreshCw size={14}/> Atualizar</button><button onClick={onClose} style={{border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.045)',color:'#fff',borderRadius:9,padding:'9px 11px',display:'inline-flex',gap:7,alignItems:'center',fontSize:9}}><X size={14}/> Fechar</button></div></header>
    {message&&<div style={{marginBottom:12,padding:10,borderRadius:10,border:'1px solid rgba(239,103,123,.23)',background:'rgba(239,103,123,.07)',color:'#ff9baa',fontSize:9}}>{message}</div>}
    {loading?<div style={{minHeight:500,display:'grid',placeItems:'center',color:'rgba(255,255,255,.45)'}}>A calcular indicadores…</div>:<>
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,minmax(0,1fr))',gap:9,marginBottom:13}}><Card title="Ativos" value={active.length} note="headcount atual" icon={Users}/><Card title="Presença" value={pct(attendance.length?(present.length/attendance.length)*100:0)} note="registos do período" icon={Activity}/><Card title="Atrasos" value={late.length} note="dias com atraso" icon={Clock3}/><Card title="Horas extra" value={`${Math.floor(extraMinutes/60)}h`} note={`${extraMinutes%60} min além`} icon={TrendingUp}/><Card title="Férias" value={`${approvedLeave} d`} note="dias aprovados" icon={CalendarCheck}/><Card title="Recrutamento" value={candidates.length} note="candidaturas" icon={BarChart3}/></div>
      <div style={{display:'grid',gridTemplateColumns:'1.25fr .75fr',gap:12,marginBottom:12}}><section style={{border:'1px solid rgba(255,255,255,.09)',borderRadius:15,padding:17,background:'rgba(255,255,255,.03)'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><div><h3 style={{margin:0,fontSize:13}}>Presença por dia</h3><small style={{color:'rgba(255,255,255,.4)',fontSize:8}}>volume de colaboradores com registo</small></div><Activity size={16}/></div>{attendanceSeries.length?<Sparkline values={attendanceSeries}/>:<div style={{height:160,display:'grid',placeItems:'center',color:'rgba(255,255,255,.4)',fontSize:9}}>Ainda não existem dados suficientes.</div>}<div style={{display:'flex',justifyContent:'space-between',color:'rgba(255,255,255,.35)',fontSize:8}}>{labels.map((label)=><span key={label}>{label}</span>)}</div></section><section style={{border:'1px solid rgba(255,255,255,.09)',borderRadius:15,padding:17,background:'rgba(255,255,255,.03)'}}><h3 style={{margin:0,fontSize:13}}>Pipeline de recrutamento</h3>{recruitment.map(([stage,count])=><div key={stage} style={{marginTop:12}}><div style={{display:'flex',justifyContent:'space-between',fontSize:9}}><span>{stage}</span><strong>{count}</strong></div><div style={{height:7,borderRadius:99,background:'rgba(255,255,255,.08)',marginTop:5,overflow:'hidden'}}><span style={{display:'block',height:'100%',width:`${Math.min(100,(count/Math.max(1,candidates.length))*100)}%`,background:'#4e8cff'}}/></div></div>)}{!recruitment.length&&<div style={{padding:'35px 0',color:'rgba(255,255,255,.4)',fontSize:9}}>Sem candidaturas no período.</div>}</section></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><section style={{border:'1px solid rgba(255,255,255,.09)',borderRadius:15,padding:17,background:'rgba(255,255,255,.03)'}}><div style={{display:'flex',justifyContent:'space-between'}}><div><h3 style={{margin:0,fontSize:13}}>Folha</h3><small style={{color:'rgba(255,255,255,.4)',fontSize:8}}>últimos períodos</small></div><BarChart3 size={16}/></div>{payroll.slice(0,6).map((run)=><div key={`${run.period_year}-${run.period_month}`} style={{display:'grid',gridTemplateColumns:'80px 1fr auto',gap:8,padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,.06)',fontSize:9}}><strong>{String(run.period_month).padStart(2,'0')}/{run.period_year}</strong><span>{run.employee_count||0} colaboradores</span><span>{run.status}</span></div>)}{!payroll.length&&<div style={{padding:35,color:'rgba(255,255,255,.4)',fontSize:9}}>Sem períodos registados.</div>}</section><section style={{border:'1px solid rgba(255,255,255,.09)',borderRadius:15,padding:17,background:'rgba(255,255,255,.03)'}}><h3 style={{margin:0,fontSize:13}}>Indicadores de operação</h3>{[['Faltas / ausências',absences.length],['Pedidos de férias',vacations.length],['Horas extra solicitadas',overtime.length],['Vagas abertas',jobs.filter((j)=>j.status==='OPEN').length]].map(([label,value])=><div key={label} style={{display:'flex',justifyContent:'space-between',padding:'11px 0',borderBottom:'1px solid rgba(255,255,255,.06)',fontSize:9}}><span>{label}</span><strong>{value}</strong></div>)}<div style={{marginTop:12,padding:10,borderRadius:10,background:'rgba(255,255,255,.03)',color:'rgba(255,255,255,.45)',fontSize:8}}>Os indicadores são calculados a partir dos dados do tenant e respeitam o isolamento de acesso do RH.</div></section></div>
    </>}</div></div>;
}
