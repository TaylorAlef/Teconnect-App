import { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CalendarDays, CheckCircle2, Clock3, LogOut, MapPin, Pause, Play, RefreshCw, ShieldCheck, TimerReset, UserRound, WifiOff, XCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { getNativeCurrentPosition } from '../lib/native-geofence';
import { haversineDistanceMeters } from '../lib/geofence';
import '../teconnect.css';
import './employee.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
);

const EVENT_LABEL = { CLOCK_IN: 'Entrada', BREAK_START: 'Pausa', BREAK_END: 'Retomar', CLOCK_OUT: 'Saída' };
const STATE_COPY = {
  OFF: ['Fora de serviço', 'Pronto para iniciar a jornada.'],
  WORKING: ['Em serviço', 'A jornada está ativa.'],
  ON_BREAK: ['Em pausa', 'A pausa está a decorrer.'],
  UNAVAILABLE: ['Ponto indisponível', 'A conta ainda não está ligada a um colaborador ativo.'],
};

const fmtMinutes = (value) => {
  const n = Math.max(0, Number(value || 0));
  return Math.floor(n / 60) + 'h ' + String(n % 60).padStart(2, '0') + 'm';
};
const fmtTime = (value) => {
  if (!value) return '—';
  try { return new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' }).format(new Date(value)); } catch { return '—'; }
};
const fmtDate = (value) => value ? new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', timeZone: 'Europe/Lisbon' }).format(new Date(value + 'T12:00:00')) : '—';
const monthBounds = (value) => {
  const parts = value.split('-').map(Number);
  const year = parts[0], month = parts[1];
  const start = value + '-01';
  const next = new Date(Date.UTC(year, month, 1));
  return { start, endExclusive: next.getUTCFullYear() + '-' + String(next.getUTCMonth() + 1).padStart(2, '0') + '-01' };
};

export default function EmployeeMobileWorkspace({ profile }) {
  const [tab, setTab] = useState('home');
  const [clock, setClock] = useState(null);
  const [locations, setLocations] = useState([]);
  const [days, setDays] = useState([]);
  const [entries, setEntries] = useState([]);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  });
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [gps, setGps] = useState({ loading: false, location: null, distance: null, radius: null, accuracy: null });
  const [nowMs, setNowMs] = useState(Date.now());

  const notify = (text, kind = 'ok') => {
    setNotice({ text, kind });
    window.clearTimeout(window.__teconnectEmployeeNotice);
    window.__teconnectEmployeeNotice = window.setTimeout(() => setNotice(null), 4200);
  };

  const loadClock = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [clockResult, locationsResult] = await Promise.all([
        supabase.rpc('get_my_clock_state'),
        supabase.from('work_locations')
          .select('id,name,address,latitude,longitude,gps_radius_m,active')
          .eq('company_id', profile.company_id)
          .eq('active', true)
          .order('name'),
      ]);
      if (clockResult.error) throw clockResult.error;
      if (locationsResult.error) throw locationsResult.error;
      setClock(clockResult.data || null);
      setLocations(locationsResult.data || []);
    } catch (error) {
      console.error(error);
      notify(error?.message || 'Não foi possível atualizar o ponto.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPeriod = async () => {
    if (!clock?.employee?.id) return;
    const bounds = monthBounds(period);
    const [dayResult, entryResult] = await Promise.all([
      supabase.from('attendance_days')
        .select('work_date,scheduled_minutes,worked_minutes,normal_minutes,overtime_minutes,late_minutes,early_leave_minutes,night_minutes,status,first_clock_in,last_clock_out')
        .eq('company_id', profile.company_id)
        .eq('employee_id', clock.employee.id)
        .gte('work_date', bounds.start)
        .lt('work_date', bounds.endExclusive)
        .order('work_date', { ascending: false }),
      supabase.from('time_entries')
        .select('id,event_type,occurred_at,gps_accuracy,validation_status')
        .eq('company_id', profile.company_id)
        .eq('employee_id', clock.employee.id)
        .eq('validation_status', 'VALID')
        .order('occurred_at', { ascending: false })
        .limit(500),
    ]);
    if (dayResult.error) throw dayResult.error;
    if (entryResult.error) throw entryResult.error;
    setDays(dayResult.data || []);
    const periodEntries = (entryResult.data || []).filter((entry) => {
      const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit' }).format(new Date(entry.occurred_at));
      return key === period;
    });
    setEntries(periodEntries);
  };

  useEffect(() => {
    let mounted = true;
    loadClock().catch(() => {});
    const timer = window.setInterval(() => mounted && loadClock(true).catch(() => {}), 15000);
    const tick = window.setInterval(() => mounted && setNowMs(Date.now()), 1000);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.clearInterval(tick);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [profile?.company_id]);

  useEffect(() => {
    if (tab === 'period') loadPeriod().catch((error) => notify(error?.message || 'Não foi possível carregar o período.', 'error'));
  }, [tab, period, clock?.employee?.id]);

  const state = clock?.state || 'UNAVAILABLE';
  const copy = STATE_COPY[state] || STATE_COPY.OFF;
  const attendance = clock?.attendance || null;
  const shift = Array.isArray(clock?.shift) ? clock.shift[0] : clock?.shift;
  const lastEvent = clock?.last_event || null;
  const sessionMinutes = state === 'WORKING' && lastEvent?.occurred_at
    ? Math.max(0, Math.floor((nowMs - new Date(lastEvent.occurred_at).getTime()) / 60000))
    : 0;

  const totals = useMemo(() => days.reduce((acc, day) => ({
    worked: acc.worked + Number(day.worked_minutes || 0),
    overtime: acc.overtime + Number(day.overtime_minutes || 0),
    late: acc.late + Number(day.late_minutes || 0),
    night: acc.night + Number(day.night_minutes || 0),
    days: acc.days + (['PRESENT', 'LATE', 'OPEN'].includes(day.status) ? 1 : 0),
  }), { worked: 0, overtime: 0, late: 0, night: 0, days: 0 }), [days]);

  const locate = async () => {
    if (!locations.length) {
      notify('A empresa ainda não tem locais com GPS configurado.', 'error');
      return null;
    }
    setGps((old) => ({ ...old, loading: true }));
    try {
      const position = await getNativeCurrentPosition({ maximumAge: 0, timeout: 15000 });
      const candidates = locations
        .filter((item) => item.latitude != null && item.longitude != null)
        .map((item) => {
          const distance = haversineDistanceMeters(position.coords.latitude, position.coords.longitude, Number(item.latitude), Number(item.longitude));
          return { item, distance, radius: Number(item.gps_radius_m || 200) };
        })
        .sort((a, b) => a.distance - b.distance);
      const nearest = candidates[0];
      if (!nearest) throw new Error('Nenhum local autorizado possui coordenadas GPS.');
      const result = {
        loading: false,
        location: nearest.item,
        distance: nearest.distance,
        radius: nearest.radius,
        accuracy: position.coords.accuracy,
        position,
      };
      setGps(result);
      return result;
    } catch (error) {
      console.error(error);
      setGps({ loading: false, location: null, distance: null, radius: null, accuracy: null });
      const code = String(error?.message || '');
      notify(code.includes('PERMISSION_LOCATION_DENIED') ? 'Permita a localização do telefone para marcar o ponto.' : 'Não foi possível obter o GPS. Ative a localização e tente novamente.', 'error');
      return null;
    }
  };

  const punch = async (eventType) => {
    if (busy || !online) {
      if (!online) notify('Sem internet. A marcação só é concluída após confirmação do servidor.', 'error');
      return;
    }
    setBusy(eventType);
    try {
      const resolved = await locate();
      if (!resolved) return;
      if (resolved.distance >= resolved.radius) {
        notify('Está fora do local autorizado. Distância: ' + Math.round(resolved.distance) + ' m. Raio: ' + resolved.radius + ' m.', 'error');
        return;
      }
      const result = await supabase.rpc('register_time_entry', {
        p_event_type: eventType,
        p_work_location_id: resolved.location.id,
        p_latitude: resolved.position.coords.latitude,
        p_longitude: resolved.position.coords.longitude,
        p_gps_accuracy: resolved.position.coords.accuracy,
        p_device: Capacitor.getPlatform() + ' · ' + navigator.userAgent.slice(0, 120),
      });
      if (result.error) {
        const map = {
          ENTRADA_JA_ABERTA: 'A jornada já está aberta.',
          NAO_EXISTE_ENTRADA_ABERTA: 'É necessário estar em jornada para iniciar a pausa.',
          NAO_EXISTE_PAUSA_ABERTA: 'Não existe uma pausa aberta para terminar.',
          PAUSA_ABERTA: 'Termine a pausa antes de sair.',
          EMPLOYEE_NOT_FOUND: 'A conta ainda não está ligada a um colaborador ativo.',
          GEOLOCALIZACAO_OBRIGATORIA: 'A localização é obrigatória para marcar o ponto.',
        };
        throw new Error(map[result.error.message] || result.error.message || 'Não foi possível registar a marcação.');
      }
      notify((EVENT_LABEL[result.data?.event_type] || 'Marcação') + ' registada.');
      await loadClock(true);
      if (tab === 'period') await loadPeriod();
    } catch (error) {
      console.error(error);
      notify(error?.message || 'Não foi possível registar a marcação.', 'error');
    } finally {
      setBusy('');
    }
  };

  if (loading && !clock) return <div className="te-employee-app te-employee-loading"><RefreshCw className="spin" size={22} /><span>A preparar o seu ponto…</span></div>;

  const dateLabel = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'Europe/Lisbon' }).format(new Date());
  const monthLabel = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(new Date(period + '-01T12:00:00'));

  return <div className="te-employee-app">
    <header className="te-employee-topbar">
      <div className="te-employee-brand"><div className="te-employee-mark">T</div><div><strong>Te-connect</strong><span>Espaço do colaborador</span></div></div>
      <div className="te-employee-actions"><span className={online ? 'te-online-dot' : 'te-offline-chip'}>{online ? 'Online' : 'Offline'}</span><button type="button" className="te-icon-btn" onClick={() => setTab('account')} aria-label="Conta"><UserRound size={18} /></button></div>
    </header>

    <main className="te-employee-main">
      {tab === 'home' && <div className="te-employee-stack">
        <section className="te-employee-hero">
          <div><span>Hoje · {dateLabel}</span><h1>{clock?.employee?.name || profile.full_name || 'Colaborador'}</h1><p>{copy[1]}</p></div>
          <button type="button" className="te-icon-btn subtle" onClick={() => loadClock()} aria-label="Atualizar"><RefreshCw size={17} /></button>
        </section>

        <section className={'te-employee-status ' + state.toLowerCase()}>
          <div className="te-status-line"><div><span>Estado atual</span><strong>{copy[0]}</strong></div><ShieldCheck size={21} /></div>
          <div className="te-clock-large">{new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Lisbon' }).format(new Date(nowMs))}</div>
          <div className="te-status-foot"><span>{state === 'WORKING' ? 'Sessão atual ' + fmtMinutes(sessionMinutes) : state === 'ON_BREAK' ? 'Pausa desde ' + fmtTime(lastEvent?.occurred_at) : 'GPS obrigatório em cada marcação'}</span><span>{online ? 'Servidor acessível' : 'Sem ligação'}</span></div>
        </section>

        {clock?.employee ? <section className="te-employee-punch">
          <div className="te-card-head"><div><span className="te-overline">Marcação de ponto</span><h2>Registar presença</h2></div><span className="te-gps-chip"><MapPin size={14} /> GPS</span></div>
          <div className="te-punch-grid">
            <button type="button" className="te-punch-btn primary" disabled={!!busy || state !== 'OFF'} onClick={() => punch('CLOCK_IN')}><CheckCircle2 size={22} /><strong>Entrada</strong><span>Iniciar jornada</span></button>
            <button type="button" className="te-punch-btn pause" disabled={!!busy || state !== 'WORKING'} onClick={() => punch('BREAK_START')}><Pause size={22} /><strong>Pausa</strong><span>Iniciar pausa</span></button>
            <button type="button" className="te-punch-btn resume" disabled={!!busy || state !== 'ON_BREAK'} onClick={() => punch('BREAK_END')}><Play size={22} /><strong>Retomar</strong><span>Voltar à jornada</span></button>
            <button type="button" className="te-punch-btn exit" disabled={!!busy || state !== 'WORKING'} onClick={() => punch('CLOCK_OUT')}><TimerReset size={22} /><strong>Saída</strong><span>Terminar jornada</span></button>
          </div>
          <button type="button" className="te-location-card" onClick={locate} disabled={gps.loading}>
            <span className="te-location-icon"><MapPin size={18} /></span>
            <span><strong>{gps.location?.name || 'Validar localização'}</strong><small>{gps.location ? Math.round(gps.distance) + ' m · raio ' + gps.radius + ' m · precisão ±' + Math.round(gps.accuracy || 0) + ' m' : 'O GPS é validado no momento da marcação'}</small></span>
            <RefreshCw size={16} className={gps.loading ? 'spin' : ''} />
          </button>
          {gps.distance != null && <div className={'te-gps-result ' + (gps.distance < gps.radius ? 'ok' : 'bad')}>{gps.distance < gps.radius ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {gps.distance < gps.radius ? 'Dentro da área autorizada.' : 'Fora da área autorizada.'}</div>}
        </section> : <section className="te-card te-empty-card"><XCircle size={24} /><h2>Ponto ainda não disponível</h2><p>A conta precisa estar ligada a um colaborador ativo para permitir a marcação.</p></section>}

        {clock?.employee && <section className="te-employee-metrics">
          <div><span>Hoje trabalhado</span><strong>{fmtMinutes(Number(attendance?.worked_minutes || 0) + sessionMinutes)}</strong></div>
          <div><span>Horas extra</span><strong>{fmtMinutes(attendance?.overtime_minutes)}</strong></div>
          <div><span>Atraso</span><strong>{Number(attendance?.late_minutes || 0)} min</strong></div>
          <div><span>Noturno</span><strong>{Number(attendance?.night_minutes || 0)} min</strong></div>
        </section>}

        {clock?.employee && <section className="te-card te-employee-shift">
          <div className="te-card-head"><div><span className="te-overline">Horário</span><h2>{shift?.name || 'Sem turno atribuído'}</h2></div><Clock3 size={18} /></div>
          <div className="te-info-grid"><span>Turno<strong>{shift ? String(shift.start_time).slice(0,5) + ' – ' + String(shift.end_time).slice(0,5) : '—'}</strong></span><span>Pausa<strong>{shift?.break_minutes != null ? shift.break_minutes + ' min' : '—'}</strong></span><span>Última marcação<strong>{lastEvent ? (EVENT_LABEL[lastEvent.event_type] || lastEvent.event_type) + ' · ' + fmtTime(lastEvent.occurred_at) : 'Nenhuma'}</strong></span></div>
        </section>}
      </div>}

      {tab === 'period' && <div className="te-employee-stack">
        <section className="te-employee-hero"><div><span>Histórico de assiduidade</span><h1>{monthLabel}</h1><p>Veja tudo o que já foi contabilizado no período.</p></div><input className="te-month-input" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></section>
        <section className="te-employee-metrics">
          <div><span>Total trabalhado</span><strong>{fmtMinutes(totals.worked + (period === new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit' }).format(new Date()) && state === 'WORKING' ? sessionMinutes : 0))}</strong></div>
          <div><span>Horas extra</span><strong>{fmtMinutes(totals.overtime)}</strong></div>
          <div><span>Atrasos</span><strong>{totals.late} min</strong></div>
          <div><span>Dias com presença</span><strong>{totals.days}</strong></div>
        </section>
        <section className="te-card te-period-card">
          <div className="te-card-head"><div><span className="te-overline">Resumo diário</span><h2>Período</h2></div><CalendarDays size={18} /></div>
          {days.length === 0 ? <div className="te-empty-inline">Não existem registos calculados neste período.</div> : days.map((day) => <div className="te-day-item" key={day.work_date}><div><strong>{fmtDate(day.work_date)}</strong><small>{String(day.status || '').replace('_', ' ')}</small></div><div><span>{fmtTime(day.first_clock_in)} → {fmtTime(day.last_clock_out)}</span><strong>{fmtMinutes(day.worked_minutes)}</strong></div><div><span>Extra</span><strong>{fmtMinutes(day.overtime_minutes)}</strong></div><div><span>Atraso</span><strong>{Number(day.late_minutes || 0)} min</strong></div></div>)}
        </section>
        <section className="te-card te-period-card">
          <div className="te-card-head"><div><span className="te-overline">Linha do tempo</span><h2>Marcações</h2></div><Clock3 size={18} /></div>
          {entries.slice(0, 12).map((entry) => <div className="te-entry-item" key={entry.id}><span className="te-entry-badge">{EVENT_LABEL[entry.event_type] || entry.event_type}</span><strong>{fmtTime(entry.occurred_at)}</strong><small>{entry.gps_accuracy ? 'GPS ±' + Math.round(entry.gps_accuracy) + ' m' : 'GPS validado'}</small></div>)}
          {entries.length === 0 && <div className="te-empty-inline">Ainda não existem marcações neste período.</div>}
        </section>
      </div>}

      {tab === 'account' && <div className="te-employee-stack">
        <section className="te-employee-hero"><div><span>A minha conta</span><h1>Perfil</h1><p>Acesso seguro ao espaço de colaborador.</p></div></section>
        <section className="te-card te-account-card"><div className="te-account-avatar">{String(clock?.employee?.name || profile.full_name || 'C').slice(0,1).toUpperCase()}</div><h2>{clock?.employee?.name || profile.full_name || 'Colaborador'}</h2><p>{clock?.employee?.code ? 'Código ' + clock.employee.code : 'Perfil colaborador'}</p><div className="te-account-line"><span>Empresa</span><strong>Conta empresarial ativa</strong></div><div className="te-account-line"><span>Plataforma</span><strong>Te-connect People OS</strong></div><button type="button" className="te-signout" onClick={() => supabase.auth.signOut()}><LogOut size={17} /> Terminar sessão</button></section>
      </div>}
    </main>

    <nav className="te-employee-tabbar"><button type="button" className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}><Clock3 size={20} /><span>Hoje</span></button><button type="button" className={tab === 'period' ? 'active' : ''} onClick={() => setTab('period')}><CalendarDays size={20} /><span>Período</span></button><button type="button" className={tab === 'account' ? 'active' : ''} onClick={() => setTab('account')}><UserRound size={20} /><span>Conta</span></button></nav>
    {notice && <div className={'te-employee-toast ' + (notice.kind === 'error' ? 'error' : '')}>{notice.text}</div>}
  </div>;
}
