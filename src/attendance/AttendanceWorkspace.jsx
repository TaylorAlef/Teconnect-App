import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Clock3, LocateFixed, LogOut, MapPin, Pause, Play, RefreshCw, ShieldCheck, UserCheck } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { explainGeofenceError, isInsideGeofence } from '../lib/geofence';
import { getNativeCurrentPosition } from '../lib/native-geofence';
import '../teconnect.css';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
const roleCanMonitor = new Set(['SUPER_ADMIN', 'COMPANY_ADMIN', 'RH', 'GESTOR', 'SUPERVISOR']);
const statusLabel = { WORKING: 'Em serviço', ON_BREAK: 'Em pausa', OFF: 'Fora', UNAVAILABLE: 'Sem vínculo', NOT_STARTED: 'Não iniciou', PRESENT: 'Presente', BREAK: 'Pausa' };
const eventLabel = { CLOCK_IN: 'Entrada', CLOCK_OUT: 'Saída', BREAK_START: 'Início de pausa', BREAK_END: 'Fim de pausa' };
const extraError = (error) => {
  const message = error?.message || '';
  const map = {
    ENTRADA_JA_ABERTA: 'Já existe uma entrada aberta para esta jornada.',
    NAO_EXISTE_ENTRADA_ABERTA: 'É necessário ter uma entrada aberta antes desta marcação.',
    NAO_EXISTE_PAUSA_ABERTA: 'Não existe uma pausa aberta para terminar.',
    PAUSA_ABERTA: 'Termine a pausa antes de registar a saída.',
    EMPLOYEE_NOT_FOUND: 'Esta conta ainda não está associada a um colaborador. O RH precisa concluir o vínculo da conta.',
    LOCAL_SEM_COORDENADAS: 'Este local ainda não tem coordenadas GPS. Configure-as no cadastro do local.',
    WORK_LOCATION_NOT_FOUND: 'O local escolhido não está disponível para esta empresa.',
    PERMISSION_LOCATION_DENIED: 'Permita a localização do dispositivo para registar o ponto.',
    GEOLOCALIZACAO_NAO_DISPONIVEL: 'A localização do dispositivo não está disponível.',
  };
  return map[message] || explainGeofenceError(error);
};

export default function AttendanceWorkspace({ profile, locations: initialLocations = [], anomalies = [], notify, onReload }) {
  const [locations, setLocations] = useState(initialLocations);
  const [selected, setSelected] = useState(initialLocations[0]?.id || '');
  const [clock, setClock] = useState(null);
  const [live, setLive] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [last, setLast] = useState(null);
  const location = useMemo(() => locations.find((item) => item.id === selected) || locations[0], [locations, selected]);
  const canMonitor = roleCanMonitor.has(profile?.role);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const locationQuery = supabase.from('work_locations').select('id,name,address,latitude,longitude,gps_radius_m,active').eq('company_id', profile.company_id).eq('active', true).order('name');
      const jobs = [supabase.rpc('get_my_clock_state'), locationQuery];
      if (canMonitor) jobs.push(supabase.rpc('get_company_attendance_live'));
      const results = await Promise.all(jobs);
      if (results[0].error) throw results[0].error;
      if (results[1].error) throw results[1].error;
      const nextLocations = results[1].data || [];
      setLocations(nextLocations);
      setSelected((current) => nextLocations.some((item) => item.id === current) ? current : (nextLocations[0]?.id || ''));
      setClock(results[0].data || null);
      if (canMonitor) {
        if (results[2].error) throw results[2].error;
        setLive(results[2].data || []);
      }
    } catch (error) {
      console.error(error);
      if (!silent) notify(extraError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setLocations(initialLocations); if (!selected && initialLocations[0]) setSelected(initialLocations[0].id); }, [initialLocations]);
  useEffect(() => { if (profile?.company_id) { load(); const timer = window.setInterval(() => load(true), 15000); return () => window.clearInterval(timer); } return undefined; }, [profile?.company_id, canMonitor]);

  const punch = async (eventType) => {
    if (!location) { notify('Cadastre um local ativo com coordenadas GPS antes de marcar o ponto.', 'error'); return; }
    if (location.latitude == null || location.longitude == null) { notify('O local escolhido não tem coordenadas GPS. Configure latitude e longitude antes de marcar.', 'error'); return; }
    setBusy(true); setLast(null);
    try {
      notify('A validar localização GPS…');
      const position = await getNativeCurrentPosition({ maximumAge: 0 });
      const validation = isInsideGeofence(position, location);
      if (!validation.ok) {
        setLast({ ok: false, distance: validation.distance, radius: validation.radius });
        notify(`Marcação bloqueada: ${Math.round(validation.distance || 0)} m do local; raio autorizado ${validation.radius} m.`, 'error');
        return;
      }
      const { latitude, longitude, accuracy } = position.coords;
      const { data, error } = await supabase.rpc('register_time_entry', { p_event_type: eventType, p_work_location_id: location.id, p_latitude: latitude, p_longitude: longitude, p_gps_accuracy: accuracy, p_device: navigator.userAgent.slice(0, 160) });
      if (error) throw error;
      setLast({ ok: true, distance: data?.distance_m, radius: data?.radius_m, eventType: data?.event_type, accuracy });
      notify(`${eventLabel[data?.event_type] || 'Marcação'} registada e validada pelo servidor.`);
      await load(true); onReload?.();
    } catch (error) { console.error(error); notify(extraError(error), 'error'); } finally { setBusy(false); }
  };

  const currentState = clock?.state || 'UNAVAILABLE';
  const attendance = clock?.attendance || null;
  const shift = Array.isArray(clock?.shift) ? clock.shift[0] : clock?.shift;
  const livePresent = live.filter((row) => row.presence_status === 'PRESENT').length;
  const liveBreak = live.filter((row) => row.presence_status === 'BREAK').length;
  const livePending = live.filter((row) => row.presence_status === 'NOT_STARTED').length;
  const now = new Date();
  if (loading) return <div className="tc-card tc-loading"><RefreshCw className="spin" size={18} /> A carregar o ponto seguro…</div>;

  return <>
    <section className="tc-hero"><div><div className="tc-eyebrow"><LocateFixed size={13} /> Ponto & Geofence</div><h1>Assiduidade operacional</h1><p>O colaborador marca no dispositivo, o GPS é validado no cliente e o servidor confirma a zona autorizada antes de gravar.</p></div><div className="tc-actions"><button className="tc-btn" onClick={() => load()} disabled={loading}><RefreshCw size={15} /> Atualizar</button></div></section>

    {clock?.employee && <section className="tc-two tc-section">
      <div className="tc-card tc-clock-card" style={{ minHeight: 320 }}>
        <div className="tc-section-head"><div><span className="tc-muted">O meu ponto</span><h2 style={{ marginTop: 5 }}>{clock.employee.name}</h2><span className="tc-muted">Código {clock.employee.code}</span></div><span className={`tc-badge ${currentState === 'WORKING' ? 'low' : currentState === 'ON_BREAK' ? 'medium' : 'high'}`}>{statusLabel[currentState] || currentState}</span></div>
        <div className="tc-clock-value">{now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</div>
        <label className="tc-form">Local de trabalho<select value={location?.id || ''} onChange={(e) => setSelected(e.target.value)}>{locations.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.gps_radius_m} m</option>)}</select></label>
        <div className="tc-actions" style={{ marginTop: 16, flexWrap: 'wrap' }}>
          <button className="tc-btn primary" disabled={busy || currentState === 'WORKING' || currentState === 'ON_BREAK'} onClick={() => punch('CLOCK_IN')}><UserCheck size={16} /> Entrada</button>
          <button className="tc-btn" disabled={busy || currentState !== 'WORKING'} onClick={() => punch('BREAK_START')}><Pause size={16} /> Iniciar pausa</button>
          <button className="tc-btn" disabled={busy || currentState !== 'ON_BREAK'} onClick={() => punch('BREAK_END')}><Play size={16} /> Terminar pausa</button>
          <button className="tc-btn" disabled={busy || currentState !== 'WORKING'} onClick={() => punch('CLOCK_OUT')}><LogOut size={16} /> Saída</button>
        </div>
        {last && <div className="tc-geofence" style={{ marginTop: 15 }}><CheckCircle2 className={last.ok ? 'tc-ok' : 'tc-no'} size={17} /> {last.ok ? `${eventLabel[last.eventType] || 'Marcação'} validada a ${Math.round(Number(last.distance || 0))} m do local (raio ${last.radius} m).` : `Fora do raio: ${Math.round(last.distance || 0)} m / ${last.radius} m.`}</div>}
      </div>
      <div className="tc-card tc-card-pad"><div className="tc-section-head"><div><h2>Resumo de hoje</h2><span>{attendance?.work_date || 'Ainda sem dia calculado'}</span></div><ShieldCheck size={18} className="tc-ok" /></div><div className="tc-grid-6" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginTop: 12 }}><Mini label="Horário" value={shift ? `${String(shift.start_time).slice(0,5)}–${String(shift.end_time).slice(0,5)}` : '—'} /><Mini label="Trabalhado" value={fmtMinutes(attendance?.worked_minutes)} /><Mini label="Atraso" value={fmtMinutes(attendance?.late_minutes)} /><Mini label="Extra" value={fmtMinutes(attendance?.overtime_minutes)} /></div><div className="tc-geofence" style={{ marginTop: 14 }}><MapPin size={16} /><span>{location ? `${location.name} · raio ${location.gps_radius_m} m` : 'Sem local configurado'}</span></div></div>
    </section>}

    {!clock?.employee && <section className="tc-card tc-card-pad tc-section"><div className="tc-error"><AlertTriangle size={17} /> Esta conta não está associada a um colaborador. O painel RH continua disponível, mas a marcação pessoal só fica ativa após o vínculo da conta ao cadastro do colaborador.</div></section>}

    {canMonitor && <section className="tc-section"><div className="tc-section-head"><div><h2>Presença em tempo real</h2><span>{livePresent} presentes · {liveBreak} em pausa · {livePending} por iniciar</span></div><span className="tc-pill"><span className="tc-dot" /> atualização a cada 15s</span></div><div className="tc-card tc-card-pad"><table className="tc-table"><thead><tr><th>Colaborador</th><th>Estado</th><th>Última marcação</th><th>Local</th><th>Hoje</th><th>Atraso</th><th>Extra</th></tr></thead><tbody>{live.map((row) => <tr key={row.employee_id}><td><strong>{row.full_name}</strong><div className="tc-muted">{row.employee_code}</div></td><td><span className={`tc-badge ${row.presence_status === 'PRESENT' ? 'low' : row.presence_status === 'BREAK' ? 'medium' : row.presence_status === 'OFF' ? 'high' : 'low'}`}>{statusLabel[row.presence_status] || row.presence_status}</span></td><td>{row.last_event_at ? `${eventLabel[row.last_event_type] || row.last_event_type} · ${new Date(row.last_event_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}` : 'Sem marcação'}</td><td>{row.last_location_name || '—'}</td><td>{fmtMinutes(row.worked_minutes)}</td><td>{fmtMinutes(row.late_minutes)}</td><td>{fmtMinutes(row.overtime_minutes)}</td></tr>)}</tbody></table>{live.length === 0 && <div className="tc-empty">Nenhum colaborador ativo neste tenant.</div>}</div></section>}

    <section className="tc-section"><div className="tc-section-head"><div><h2>Locais autorizados</h2><span>{locations.length} locais ativos</span></div></div><div className="tc-card tc-card-pad">{locations.map((item) => <div className="tc-row" key={item.id}><div className="tc-row-main"><div className="tc-row-title">{item.name}</div><div className="tc-row-sub">{item.address || 'Morada não definida'} · geofence {item.gps_radius_m} m{item.latitude == null || item.longitude == null ? ' · coordenadas pendentes' : ''}</div></div><MapPin size={16} className={item.latitude != null && item.longitude != null ? 'tc-ok' : 'tc-muted'} /></div>)}{locations.length === 0 && <div className="tc-empty">Sem instalações. Configure um local no onboarding ou no cadastro operacional.</div>}</div></section>

    <section className="tc-section"><div className="tc-section-head"><div><h2>Indicadores recentes</h2><span>atrasos, saídas antecipadas, horas extra e noite</span></div></div><div className="tc-list">{anomalies.slice(0,12).map((a) => <div className="tc-row" key={a.id}><div><div className="tc-row-title">{a.work_date}</div><div className="tc-row-sub">{fmtMinutes(a.worked_minutes)} trabalhado · {fmtMinutes(a.overtime_minutes)} extra · {a.late_minutes || 0} min atraso · {a.early_leave_minutes || 0} min saída antecipada · {a.night_minutes || 0} min noite</div></div><span className={`tc-badge ${(a.late_minutes || a.early_leave_minutes) ? 'high' : 'medium'}`}>{a.status}</span></div>)}{anomalies.length===0 && <div className="tc-empty">Ainda não existem indicadores de assiduidade calculados.</div>}</div></section>
  </>;
}
function Mini({ label, value }) { return <div className="tc-kpi"><div className="tc-kpi-top"><span>{label}</span><Clock3 size={14} /></div><div className="tc-kpi-value" style={{ fontSize: 19 }}>{value}</div></div>; }
function fmtMinutes(value) { const n = Number(value || 0); return `${Math.floor(n / 60)}h ${n % 60}m`; }
