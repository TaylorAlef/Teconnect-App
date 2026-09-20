import { useEffect, useState } from 'react';
import { Download, History, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import '../teconnect.css';
import { downloadTextFile, rowsToCsv } from '../lib/csv.js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

const formatAction = (value = '') => value.replaceAll('_', ' ').replace(/\b\w/g, (x) => x.toUpperCase());
const formatDateTime = (value) => new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));

export default function AuditCenter({ profile, onToast }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('list_company_audit_logs', { p_limit: 100, p_before: null });
      if (error) throw error;
      setRows(data || []);
    } catch (error) {
      console.error(error);
      onToast?.('Não foi possível carregar a auditoria da empresa.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) load(); }, [open]);

  const exportCsv = () => {
    const headers = ['Data','Ação','Entidade','ID','Utilizador'];
    const data = rows.map((row) => [
      row.created_at,
      row.action,
      row.entity,
      row.entity_id,
      row.actor_name || row.actor_id || 'Sistema',
    ]);
    downloadTextFile(
      `teconnect-auditoria-${new Date().toISOString().slice(0,10)}.csv`,
      rowsToCsv(headers, data),
      'text/csv;charset=utf-8',
    );
  };

  return <>
    <button type="button" className="tc-btn ghost tc-billing-trigger" onClick={() => setOpen(true)} title="Abrir trilho de auditoria">
      <History size={16} /> Auditoria
    </button>

    {open && <div style={{ position:'fixed', inset:0, zIndex:117, background:'rgba(2,6,23,.80)', backdropFilter:'blur(12px)', overflow:'auto', padding:'28px 20px' }}>
      <div className="tc-card" style={{ width:'min(1180px,100%)', margin:'0 auto', padding:24 }}>
        <header style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:18 }}>
          <div><div className="tc-eyebrow"><ShieldCheck size={14}/> Controlo e auditoria</div><h2 style={{ margin:'8px 0 5px' }}>Trilho de auditoria</h2><p className="tc-muted" style={{ margin:0, lineHeight:1.55 }}>Registos operacionais da empresa, com ator, entidade, alterações e data. O acesso é isolado pelo tenant e protegido por perfil.</p></div>
          <div style={{ display:'flex', gap:8 }}><button type="button" className="tc-btn" onClick={exportCsv} disabled={!rows.length}><Download size={15}/> Exportar CSV</button><button type="button" className="tc-btn" onClick={() => setOpen(false)}><X size={16}/></button></div>
        </header>

        <div className="tc-geofence" style={{ marginTop:18, marginBottom:14 }}><History size={16}/><span>{rows.length} eventos carregados · empresa <strong>{profile?.company_name || 'Organização'}</strong></span><button type="button" className="tc-btn tc-small" style={{ marginLeft:'auto' }} onClick={load} disabled={loading}>{loading ? <Loader2 size={13} className="spin"/> : <RefreshCw size={13}/>} Atualizar</button></div>

        {loading && !rows.length ? <div className="tc-card" style={{ padding:22, display:'flex', alignItems:'center', gap:9 }}><Loader2 className="spin" size={17}/> A carregar eventos…</div> : rows.length === 0 ? <div className="tc-empty">Ainda não existem eventos de auditoria disponíveis para esta empresa.</div> : <div className="tc-card" style={{ overflow:'hidden' }}>
          <div className="tc-table-wrap"><table className="tc-table"><thead><tr><th>Data</th><th>Ação</th><th>Entidade</th><th>Utilizador</th><th></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}>
            <td>{formatDateTime(row.created_at)}</td>
            <td><span className="tc-badge low">{formatAction(row.action)}</span></td>
            <td>{row.entity || '—'}<div className="tc-muted" style={{ fontSize:11 }}>{row.entity_id || '—'}</div></td>
            <td>{row.actor_name || 'Sistema'}</td>
            <td><button type="button" className="tc-btn tc-small" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>{expanded === row.id ? 'Fechar' : 'Detalhes'}</button></td>
          </tr>)}</tbody></table></div>
          {expanded && (() => { const row = rows.find((item) => item.id === expanded); if (!row) return null; return <div style={{ padding:18, borderTop:'1px solid rgba(255,255,255,.08)' }}><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}><JsonBox title="Antes" value={row.old_data}/><JsonBox title="Depois" value={row.new_data}/></div></div>; })()}
        </div>}

        <footer className="tc-muted" style={{ marginTop:18, paddingTop:14, borderTop:'1px solid rgba(255,255,255,.08)', fontSize:12 }}>O trilho é para acompanhamento e responsabilização operacional; não representa, por si só, uma certificação legal.</footer>
      </div>
    </div>}
  </>;
}

function JsonBox({ title, value }) {
  return <div className="tc-card" style={{ padding:14, overflow:'auto' }}><strong style={{ fontSize:12 }}>{title}</strong><pre style={{ margin:'10px 0 0', whiteSpace:'pre-wrap', wordBreak:'break-word', color:'rgba(255,255,255,.65)', fontSize:11 }}>{value ? JSON.stringify(value, null, 2) : 'Sem alteração de dados'}</pre></div>;
}
