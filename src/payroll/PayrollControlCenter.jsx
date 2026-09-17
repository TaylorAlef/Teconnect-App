import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileText, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import '../teconnect.css';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const monthLabel = (year, month) => new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
const minutes = (value = 0) => `${Math.floor(Number(value || 0) / 60)}h ${Number(value || 0) % 60}m`;

export default function PayrollControlCenter({ profile, onToast }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [creating, setCreating] = useState(false);

  const period = useMemo(() => monthLabel(year, month), [year, month]);

  const load = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc('get_payroll_readiness', { p_year: year, p_month: month });
      if (error) throw error;
      setData(result || null);
    } catch (error) {
      console.error(error);
      onToast?.('Não foi possível carregar o estado da folha.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) load(); }, [open, year, month]);

  const prepare = async () => {
    setPreparing(true);
    try {
      const { data: result, error } = await supabase.rpc('prepare_payroll_period', { p_year: year, p_month: month });
      if (error) throw error;
      setData(result || null);
      onToast?.(`Assiduidade de ${period} recalculada.`);
    } catch (error) {
      console.error(error);
      onToast?.(error?.message || 'Não foi possível preparar o período.', 'error');
    } finally {
      setPreparing(false);
    }
  };

  const createDraft = async () => {
    setCreating(true);
    try {
      const { data: result, error } = await supabase.rpc('create_payroll_draft', { p_year: year, p_month: month });
      if (error) throw error;
      setData((current) => ({ ...(current || {}), payroll_run: result ? { id: result.id, status: result.status, employee_count: result.employee_count, gross_cents: result.gross_cents, net_cents: result.net_cents, updated_at: result.updated_at } : null }));
      onToast?.('Rascunho de folha criado.');
    } catch (error) {
      console.error(error);
      const message = error?.message === 'PAYROLL_NOT_READY' ? 'O período ainda tem pendências. Resolva-as antes de criar o rascunho.' : (error?.message || 'Não foi possível criar o rascunho.');
      onToast?.(message, 'error');
    } finally {
      setCreating(false);
    }
  };

  return <>
    <button type="button" className="tc-btn ghost tc-billing-trigger" onClick={() => setOpen(true)} title="Preparar fechamento e folha">
      <FileText size={16} /> Fecho & folha
    </button>

    {open && <div style={{ position: 'fixed', inset: 0, zIndex: 116, background: 'rgba(2,6,23,.78)', backdropFilter: 'blur(12px)', overflow: 'auto', padding: '28px 20px' }}>
      <div className="tc-card" style={{ width: 'min(1080px,100%)', margin: '0 auto', padding: 24 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18 }}>
          <div><div className="tc-eyebrow"><ClipboardCheck size={14} /> Fecho operacional</div><h2 style={{ margin: '8px 0 5px' }}>Preparação de folha</h2><p className="tc-muted" style={{ margin: 0, lineHeight: 1.55 }}>Feche a assiduidade do período, identifique pendências e gere um rascunho de folha. Os valores salariais ficam separados do controlo de ponto.</p></div>
          <button type="button" className="tc-btn" onClick={() => setOpen(false)}><X size={16} /></button>
        </header>

        <div className="tc-card" style={{ marginTop: 18, padding: 15, display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
          <label className="tc-form" style={{ minWidth: 150 }}>Ano<input type="number" min="2020" max="2100" value={year} onChange={(e) => setYear(Number(e.target.value))} /></label>
          <label className="tc-form" style={{ minWidth: 170 }}>Mês<select value={month} onChange={(e) => setMonth(Number(e.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{monthLabel(year, index + 1)}</option>)}</select></label>
          <button type="button" className="tc-btn" onClick={() => load()} disabled={loading}>{loading ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />} Atualizar</button>
          <button type="button" className="tc-btn primary" onClick={prepare} disabled={preparing}>{preparing ? <Loader2 className="spin" size={15} /> : <ShieldCheck size={15} />} Recalcular assiduidade</button>
        </div>

        {!data ? <div className="tc-card" style={{ marginTop: 16, padding: 22, color: 'rgba(255,255,255,.58)' }}>A carregar o período…</div> : <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginTop: 16 }}>
            <Kpi label="Colaboradores ativos" value={data.active_employees} />
            <Kpi label="Dias de assiduidade" value={data.attendance_days} />
            <Kpi label="Horas trabalhadas" value={minutes(data.worked_minutes)} />
            <Kpi label="Horas extra" value={minutes(data.overtime_minutes)} />
          </section>

          <section className="tc-card" style={{ marginTop: 16, padding: 18 }}>
            <div className="tc-section-head"><div><h2>Pendências do período</h2><span>{data.pending_approvals} decisões ainda abertas</span></div><div className={`tc-badge ${data.pending_approvals === 0 && data.incomplete_days === 0 ? 'low' : 'high'}`}>{data.ready_for_payroll ? 'Pronto para folha' : 'Requer revisão'}</div></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 10, marginTop: 14 }}>
              <Issue label="Horas extra" value={data.pending_overtime} />
              <Issue label="Férias" value={data.pending_vacations} />
              <Issue label="Ausências" value={data.pending_absences} />
              <Issue label="Ajustes de ponto" value={data.pending_adjustments} />
              <Issue label="Dias sem saída" value={data.incomplete_days} />
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16, marginTop: 16 }}>
            <div className="tc-card" style={{ padding: 18 }}>
              <div className="tc-section-head"><div><h2>Consolidação operacional</h2><span>{period}</span></div><CheckCircle2 size={18} className={data.ready_for_payroll ? 'tc-ok' : 'tc-muted'} /></div>
              <div className="tc-list" style={{ marginTop: 12 }}>
                <Row label="Horas programadas" value={minutes(data.scheduled_minutes)} />
                <Row label="Horas trabalhadas" value={minutes(data.worked_minutes)} />
                <Row label="Horas extra" value={minutes(data.overtime_minutes)} />
                <Row label="Horas noturnas" value={minutes(data.night_minutes)} />
                <Row label="Minutos de atraso" value={data.late_minutes} />
              </div>
            </div>
            <div className="tc-card" style={{ padding: 18 }}>
              <div className="tc-section-head"><div><h2>Folha</h2><span>estado do processamento</span></div><FileText size={18} /></div>
              {data.payroll_run ? <div style={{ marginTop: 14 }}><div className="tc-badge low">{data.payroll_run.status}</div><div className="tc-muted" style={{ marginTop: 10 }}>{data.payroll_run.employee_count} colaboradores no rascunho</div><div style={{ marginTop: 5, fontSize: 12 }}>Atualizado {new Date(data.payroll_run.updated_at).toLocaleString('pt-PT')}</div></div> : <><div className="tc-error" style={{ marginTop: 14 }}><AlertTriangle size={16} /> Nenhum processamento criado para {period}.</div><button type="button" className="tc-btn primary" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={createDraft} disabled={creating || !data.ready_for_payroll}>{creating ? <Loader2 className="spin" size={15} /> : <FileText size={15} />} Criar rascunho</button></>}
              <div className="tc-geofence" style={{ marginTop: 14 }}><ShieldCheck size={16} /><span>Este módulo prepara a informação operacional. Não presume cálculo fiscal ou legal sem dados de remuneração configurados.</span></div>
            </div>
          </section>
        </>}

        <footer style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.08)', fontSize: 12 }} className="tc-muted">Empresa: {profile?.company_name || 'Organização'} · período: {period}</footer>
      </div>
    </div>}
  </>;
}

function Kpi({ label, value }) { return <div className="tc-card" style={{ padding: 14 }}><div className="tc-muted" style={{ fontSize: 12 }}>{label}</div><strong style={{ display: 'block', marginTop: 6, fontSize: 21 }}>{value}</strong></div>; }
function Issue({ label, value }) { const n = Number(value || 0); return <div className="tc-card" style={{ padding: 13 }}><div className="tc-muted" style={{ fontSize: 11 }}>{label}</div><strong style={{ display: 'block', marginTop: 5, color: n ? '#fcd34d' : '#86efac' }}>{n}</strong></div>; }
function Row({ label, value }) { return <div className="tc-row"><span className="tc-muted">{label}</span><strong>{value}</strong></div>; }
