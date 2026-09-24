import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Award, BarChart3, CalendarClock, CheckCircle2, Clock3, Command, CreditCard, FileText, KeyRound, LockKeyhole, LogOut, Search, Settings2, Shield, UserPlus, UsersRound, X, Zap } from 'lucide-react';
import './nextgen.css';

const COMMANDS = [
  { id: 'overview', label: 'Abrir visão geral', hint: 'Painel executivo', icon: Zap, keywords: 'dashboard início painel command center' },
  { id: 'people360', label: 'Abrir People 360', hint: 'Colaboradores e perfis', icon: UsersRound, keywords: 'pessoas colaboradores funcionários cadastro perfil' },
  { id: 'attendance', label: 'Abrir Ponto & Geofence', hint: 'Assiduidade e marcações', icon: Clock3, keywords: 'ponto picagem gps geofence assiduidade' },
  { id: 'approvals', label: 'Abrir Aprovações', hint: 'Férias, horas extra e ausências pendentes', icon: CheckCircle2, keywords: 'aprovações aprovar férias horas extra ausências pendentes' },
  { id: 'exceptions', label: 'Abrir Centro de Exceções', hint: 'Anomalias e risco operacional', icon: Zap, keywords: 'alertas exceções risco anomalias' },
  { id: 'payroll', label: 'Abrir Folha', hint: 'Processamento e períodos', icon: FileText, keywords: 'folha payroll salários' },
  { id: 'analytics', label: 'Abrir Analytics', hint: 'Indicadores de pessoas', icon: BarChart3, keywords: 'analytics indicadores relatórios tendência' },
  { id: 'performance', label: 'Abrir Desempenho', hint: 'Objetivos e PDI', icon: Award, keywords: 'desempenho performance objetivos pdi' },
  { id: 'integrations', label: 'Abrir Integrações', hint: 'Chaves e webhooks', icon: Zap, keywords: 'sap phc primavera oracle erp integração api webhook' },
  { id: 'employee-access', label: 'Gerir acessos', hint: 'Convites de colaboradores', icon: UserPlus, keywords: 'convidar colaborador acesso convite ativar conta' },
  { id: 'employee-import', label: 'Importar colaboradores', hint: 'Equipa por CSV', icon: UsersRound, keywords: 'importar csv colaboradores admissão' },
  { id: 'lifecycle', label: 'Abrir Offboarding', hint: 'Saídas e checklist', icon: LogOut, keywords: 'offboarding saída desligamento checklist' },
  { id: 'billing', label: 'Abrir Faturação', hint: 'Plano e subscrição', icon: CreditCard, keywords: 'faturação billing plano subscrição pagamento' },
  { id: 'security', label: 'Abrir Segurança', hint: 'MFA e proteção da conta', icon: LockKeyhole, keywords: 'segurança mfa autenticação' },
  { id: 'roles', label: 'Abrir Papéis', hint: 'Funções e acessos', icon: Shield, keywords: 'papéis funções permissões roles' },
  { id: 'setup', label: 'Abrir Setup', hint: 'Estrutura da empresa', icon: Settings2, keywords: 'setup configuração departamentos locais turnos' },
  { id: 'rules', label: 'Abrir Regras', hint: 'Horários, GPS e turnos', icon: KeyRound, keywords: 'regras horários gps turnos geofence' },
  { id: 'audit', label: 'Abrir Auditoria', hint: 'Rasto operacional', icon: Shield, keywords: 'auditoria histórico rasto log' },
  { id: 'self-service', label: 'Abrir Meu RH', hint: 'Self-service do colaborador', icon: UsersRound, keywords: 'self service meu rh perfil' },
  { id: 'requests', label: 'Solicitar', hint: 'Pedidos de férias, ausências e horas extra', icon: CalendarClock, keywords: 'solicitar pedido férias ausência horas extra' },
];

function runCommand(command, { onNavigate, onOpenAttendance }) {
  if (command.id === 'attendance') return onOpenAttendance?.();
  return onNavigate?.(command.id);
}


export default function CommandPalette({ onNavigate, onOpenAttendance, canOpen = () => true }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const allowed = COMMANDS.filter((item) => canOpen(item.id));
    const value = query.trim().toLowerCase();
    if (!value) return allowed;
    return allowed.filter((item) => `${item.label} ${item.hint} ${item.keywords}`.toLowerCase().includes(value));
  }, [query, canOpen]);

  useEffect(() => {
    const onExternalOpen = () => setOpen(true);
    window.addEventListener('teconnect:open-command-palette', onExternalOpen);
    return () => window.removeEventListener('teconnect:open-command-palette', onExternalOpen);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isShortcut) {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (!open) return;
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelected((value) => Math.min(value + 1, Math.max(results.length - 1, 0)));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelected((value) => Math.max(value - 1, 0));
      }
      if (event.key === 'Enter' && results[selected]) {
        event.preventDefault();
        runCommand(results[selected], { onNavigate, onOpenAttendance });
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, results, selected]);

  useEffect(() => {
    if (!open) return;
    setSelected(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  if (!open) return null;

  return (
    <div className="tc-command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="tc-command" role="dialog" aria-modal="true" aria-label="Comandos Teconnect">
        <div className="tc-command-search">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="O que pretende fazer?"
            aria-label="Pesquisar comandos"
          />
          <kbd><Command size={11} /> K</kbd>
          <button type="button" className="tc-command-close" onClick={() => setOpen(false)} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="tc-command-meta">Comandos rápidos <span>{results.length}</span></div>
        <div className="tc-command-list">
          {results.length === 0 && <div className="tc-command-empty">Nenhum comando corresponde à pesquisa.</div>}
          {results.map((item, index) => {
            const Icon = item.icon;
            const active = index === selected;
            return (
              <button
                type="button"
                key={item.id}
                className={`tc-command-item ${active ? 'active' : ''}`}
                onMouseEnter={() => setSelected(index)}
                onClick={() => { runCommand(item, { onNavigate, onOpenAttendance }); setOpen(false); setQuery(''); }}
              >
                <span className="tc-command-icon"><Icon size={16} /></span>
                <span className="tc-command-copy"><strong>{item.label}</strong><small>{item.hint}</small></span>
                <ArrowRight size={14} className="tc-command-arrow" />
              </button>
            );
          })}
        </div>
        <div className="tc-command-footer"><span>↑↓ navegar</span><span>Enter executar</span><span>Esc fechar</span></div>
      </section>
    </div>
  );
}
