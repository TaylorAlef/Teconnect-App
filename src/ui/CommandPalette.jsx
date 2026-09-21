import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, Command, FileText, Search, UserPlus, Users, X, Zap } from 'lucide-react';
import './nextgen.css';

const COMMANDS = [
  { id: 'overview', label: 'Abrir visão geral', hint: 'Painel executivo', icon: Zap, keywords: 'dashboard início painel' },
  { id: 'people', label: 'Abrir Pessoas', hint: 'Colaboradores', icon: Users, keywords: 'pessoas colaboradores funcionários cadastro' },
  { id: 'attendance', label: 'Abrir Ponto & Geofence', hint: 'Assiduidade e marcações', icon: Clock3, keywords: 'ponto picagem gps geofence assiduidade' },
  { id: 'tasks', label: 'Abrir Tarefas RH', hint: 'Pendentes, em curso e concluídas', icon: CheckCircle2, keywords: 'tarefas kanban pendentes rh' },
  { id: 'alerts', label: 'Abrir Alertas', hint: 'Anomalias e risco operacional', icon: Zap, keywords: 'alertas risco anomalias' },
  { id: 'payroll', label: 'Abrir Folha', hint: 'Processamento e períodos', icon: FileText, keywords: 'folha payroll salários' },
  { id: 'shifts', label: 'Abrir Turnos', hint: 'Escalas e jornadas', icon: CalendarClock, keywords: 'turnos escalas jornada' },
  { id: 'integrations', label: 'Abrir Integrações', hint: 'ERP em background', icon: Zap, keywords: 'sap phc primavera oracle erp integração' },
  { id: 'employee', label: 'Iniciar admissão de colaborador', hint: 'Abrir Pessoas para criar o registo', icon: UserPlus, keywords: 'cadastrar colaborador admissão novo funcionário' },
  { id: 'vacations', label: 'Rever aprovações de férias', hint: 'Abrir o centro de decisões', icon: CheckCircle2, keywords: 'aprovar férias aprovação férias joão' },
  { id: 'timesheet', label: 'Abrir espelho de ponto', hint: 'Ir para o módulo de ponto', icon: FileText, keywords: 'gerar espelho ponto março relatório' },
];

function runCommand(command, { onNavigate, onOpenAttendance, onOpenPanel }) {
  if (command.id === 'attendance') return onOpenAttendance?.();
  if (command.id === 'employee') return onNavigate?.('people');
  if (command.id === 'vacations') return onOpenPanel?.('approvals');
  if (command.id === 'timesheet') return onNavigate?.('attendance');
  if (command.id && ['overview','people','recruitment','onboarding','attendance','vacations','documents','development','tasks','alerts','payroll','integrations','notifications'].includes(command.id)) return onNavigate?.(command.id);
  return false;
}


export default function CommandPalette({ onNavigate, onOpenAttendance, onOpenPanel }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return COMMANDS;
    return COMMANDS.filter((item) => `${item.label} ${item.hint} ${item.keywords}`.toLowerCase().includes(value));
  }, [query]);

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
        runCommand(results[selected], { onNavigate, onOpenAttendance, onOpenPanel });
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
                onClick={() => { runCommand(item, { onNavigate, onOpenAttendance, onOpenPanel }); setOpen(false); setQuery(''); }}
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
