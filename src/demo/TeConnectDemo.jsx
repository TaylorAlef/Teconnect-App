import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Filter,
  FolderOpen,
  Gauge,
  GraduationCap,
  KanbanSquare,
  Laptop,
  Lightbulb,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Moon,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';

const STORAGE_KEY = 'teconnect-demo-v1';
const ROLE_LABELS = {
  ADMIN: 'Administrador',
  HR: 'RH',
  MANAGER: 'Gestor',
  EMPLOYEE: 'Colaborador',
};

const MODULES = [
  ['dashboard', 'Dashboard', Gauge],
  ['employees', 'Colaboradores', Users],
  ['recruitment', 'Recrutamento', KanbanSquare],
  ['onboarding', 'Onboarding', UserCheck],
  ['attendance', 'Ponto e assiduidade', Clock3],
  ['shifts', 'Escalas e turnos', CalendarDays],
  ['leaves', 'Férias e ausências', CalendarDays],
  ['documents', 'Documentos', FolderOpen],
  ['performance', 'Desempenho e desenvolvimento', Target],
  ['intelligence', 'Intelligence Center', Sparkles],
  ['assistant', 'Te-connect Assist', MessageCircle],
  ['notifications', 'Notificações', Bell],
];

const seed = {
  role: 'ADMIN',
  theme: 'dark',
  activeModule: 'dashboard',
  lastSync: new Date().toISOString(),
  employees: [
    { id: 'E-001', name: 'Ana Martins', role: 'HR Business Partner', team: 'Pessoas', contract: 'Sem termo', status: 'ATIVO', email: 'ana.martins@te-connect.pt', phone: '+351 912 400 101', hire: '2023-02-14', vacation: 17, attendance: 98, performance: 92, photo: 'AM' },
    { id: 'E-002', name: 'Miguel Silva', role: 'Gestor de Operações', team: 'Operações', contract: 'Sem termo', status: 'ATIVO', email: 'miguel.silva@te-connect.pt', phone: '+351 913 210 220', hire: '2022-09-05', vacation: 11, attendance: 94, performance: 88, photo: 'MS' },
    { id: 'E-003', name: 'Sofia Costa', role: 'Talent Acquisition', team: 'Pessoas', contract: 'Sem termo', status: 'FÉRIAS', email: 'sofia.costa@te-connect.pt', phone: '+351 914 455 233', hire: '2024-01-22', vacation: 6, attendance: 97, performance: 91, photo: 'SC' },
    { id: 'E-004', name: 'Rui Ferreira', role: 'Software Engineer', team: 'Tecnologia', contract: 'Sem termo', status: 'ATIVO', email: 'rui.ferreira@te-connect.pt', phone: '+351 915 109 340', hire: '2021-06-18', vacation: 14, attendance: 90, performance: 85, photo: 'RF' },
    { id: 'E-005', name: 'Beatriz Lopes', role: 'People Operations', team: 'Pessoas', contract: 'Termo certo', status: 'PENDENTE', email: 'beatriz.lopes@te-connect.pt', phone: '+351 916 003 445', hire: '2026-07-01', vacation: 20, attendance: 100, performance: 83, photo: 'BL' },
    { id: 'E-006', name: 'João Almeida', role: 'Account Manager', team: 'Comercial', contract: 'Sem termo', status: 'AUSENTE', email: 'joao.almeida@te-connect.pt', phone: '+351 917 774 556', hire: '2020-11-30', vacation: 9, attendance: 87, performance: 79, photo: 'JA' },
    { id: 'E-007', name: 'Carolina Pinto', role: 'Product Designer', team: 'Produto', contract: 'Sem termo', status: 'ATIVO', email: 'carolina.pinto@te-connect.pt', phone: '+351 918 656 667', hire: '2025-03-11', vacation: 16, attendance: 95, performance: 94, photo: 'CP' },
    { id: 'E-008', name: 'Tiago Rocha', role: 'Analista Financeiro', team: 'Financeiro', contract: 'Sem termo', status: 'CONTRATO A TERMINAR', email: 'tiago.rocha@te-connect.pt', phone: '+351 919 881 778', hire: '2023-08-20', vacation: 4, attendance: 92, performance: 81, photo: 'TR' },
  ],
  candidates: [
    { id: 'C-001', name: 'Inês Duarte', role: 'People Data Analyst', stage: 'ENTREVISTA', score: 91, criteria: ['Experiência em RH analytics', 'Power BI', 'Comunicação'], updated: 'Hoje', owner: 'Sofia Costa' },
    { id: 'C-002', name: 'Pedro Matos', role: 'Account Manager', stage: 'TRIAGEM', score: 84, criteria: ['B2B SaaS', 'Negociação', 'Inglês'], updated: 'Ontem', owner: 'Ana Martins' },
    { id: 'C-003', name: 'Marta Reis', role: 'People Operations', stage: 'PROPOSTA', score: 96, criteria: ['Operações RH', 'Processos', 'Empatia'], updated: 'Hoje', owner: 'Ana Martins' },
    { id: 'C-004', name: 'Daniel Moura', role: 'Backend Engineer', stage: 'CANDIDATURA', score: 79, criteria: ['Node.js', 'PostgreSQL', 'APIs'], updated: 'Há 2 dias', owner: 'Miguel Silva' },
    { id: 'C-005', name: 'Sara Teixeira', role: 'Product Designer', stage: 'CONTRATADO', score: 93, criteria: ['Figma', 'Design systems', 'UX research'], updated: '12/09', owner: 'Carolina Pinto' },
    { id: 'C-006', name: 'Lucas Santos', role: 'Sales Development Rep', stage: 'REJEITADO', score: 68, criteria: ['Prospeção', 'CRM', 'Comunicação'], updated: '10/09', owner: 'João Almeida' },
  ],
  onboarding: [
    { id: 'E-005', employee: 'Beatriz Lopes', progress: 68, tasks: [
      { id: 'OB-1', title: 'Contrato assinado', owner: 'RH', done: true },
      { id: 'OB-2', title: 'Equipamentos entregues', owner: 'Gestor', done: true },
      { id: 'OB-3', title: 'E-mail e acessos', owner: 'IT', done: true },
      { id: 'OB-4', title: 'Formação inicial', owner: 'Gestor', done: false },
      { id: 'OB-5', title: 'Apresentação da equipa', owner: 'RH', done: false },
    ] },
    { id: 'E-007', employee: 'Carolina Pinto', progress: 100, tasks: [
      { id: 'OB-6', title: 'Contrato assinado', owner: 'RH', done: true },
      { id: 'OB-7', title: 'Equipamentos entregues', owner: 'IT', done: true },
      { id: 'OB-8', title: 'Integração com equipa', owner: 'Gestor', done: true },
      { id: 'OB-9', title: 'PDI inicial', owner: 'Gestor', done: true },
    ] },
  ],
  attendance: [
    { id: 'A-001', employee: 'Ana Martins', date: '17/09', entry: '08:57', break: '12:31', return: '13:27', exit: '17:43', late: 0, overtime: 18, state: 'Completo' },
    { id: 'A-002', employee: 'Miguel Silva', date: '17/09', entry: '09:14', break: '13:00', return: '14:04', exit: '18:31', late: 14, overtime: 26, state: 'Atraso' },
    { id: 'A-003', employee: 'Rui Ferreira', date: '17/09', entry: '08:49', break: '12:15', return: '13:15', exit: '17:39', late: 0, overtime: 9, state: 'Completo' },
    { id: 'A-004', employee: 'Carolina Pinto', date: '17/09', entry: '09:01', break: '12:46', return: '13:44', exit: '18:03', late: 1, overtime: 7, state: 'Completo' },
    { id: 'A-005', employee: 'Tiago Rocha', date: '17/09', entry: '09:22', break: '13:02', return: '14:00', exit: '', late: 22, overtime: 0, state: 'Em curso' },
  ],
  shifts: [
    { id: 'S-001', name: 'Horário escritório', team: 'Pessoas', days: 'Seg-Sex', start: '09:00', end: '18:00', break: '60 min', coverage: 100, published: true, conflicts: 0 },
    { id: 'S-002', name: 'Operações manhã', team: 'Operações', days: 'Seg-Sáb', start: '07:00', end: '15:00', break: '45 min', coverage: 96, published: true, conflicts: 1 },
    { id: 'S-003', name: 'Operações tarde', team: 'Operações', days: 'Seg-Sáb', start: '14:00', end: '22:00', break: '45 min', coverage: 88, published: false, conflicts: 2 },
    { id: 'S-004', name: 'Turno flexível', team: 'Produto', days: 'Seg-Sex', start: '10:00', end: '19:00', break: '60 min', coverage: 92, published: true, conflicts: 0 },
  ],
  leaves: [
    { id: 'L-001', employee: 'Sofia Costa', type: 'Férias', start: '16/09', end: '20/09', days: 5, status: 'APROVADO', coverage: 'OK' },
    { id: 'L-002', employee: 'João Almeida', type: 'Baixa', start: '17/09', end: '19/09', days: 3, status: 'REGISTADO', coverage: 'ATENÇÃO' },
    { id: 'L-003', employee: 'Ana Martins', type: 'Férias', start: '25/09', end: '30/09', days: 4, status: 'PENDENTE', coverage: 'OK' },
    { id: 'L-004', employee: 'Rui Ferreira', type: 'Ausência', start: '24/09', end: '24/09', days: 1, status: 'PENDENTE', coverage: 'RISCO' },
  ],
  documents: [
    { id: 'D-001', employee: 'Ana Martins', type: 'Contrato de trabalho', expiry: '31/12/2027', status: 'Válido', updated: '10/09/2026' },
    { id: 'D-002', employee: 'Tiago Rocha', type: 'Contrato de trabalho', expiry: '30/09/2026', status: 'A expirar', updated: '09/09/2026' },
    { id: 'D-003', employee: 'João Almeida', type: 'Certificado médico', expiry: '25/09/2026', status: 'A expirar', updated: '05/09/2026' },
    { id: 'D-004', employee: 'Beatriz Lopes', type: 'Política de segurança', expiry: '—', status: 'Em falta', updated: '01/09/2026' },
    { id: 'D-005', employee: 'Carolina Pinto', type: 'Declaração de confidencialidade', expiry: '31/12/2027', status: 'Válido', updated: '08/09/2026' },
  ],
  performance: [
    { id: 'P-001', employee: 'Ana Martins', goal: 'Reduzir tempo de contratação', progress: 82, target: '≤ 24 dias', period: 'Q3 2026', owner: 'Gestão RH' },
    { id: 'P-002', employee: 'Miguel Silva', goal: 'Melhorar cobertura de turnos', progress: 74, target: '≥ 95%', period: 'Q3 2026', owner: 'Operações' },
    { id: 'P-003', employee: 'Rui Ferreira', goal: 'Automatizar integração', progress: 61, target: '3 fluxos', period: 'Q3 2026', owner: 'Tecnologia' },
    { id: 'P-004', employee: 'Carolina Pinto', goal: 'Design system RH', progress: 93, target: '100%', period: 'Q3 2026', owner: 'Produto' },
  ],
  tasks: [
    { id: 'T-001', title: 'Concluir formação inicial de Beatriz', owner: 'Ana Martins', status: 'EM CURSO', due: '18/09', priority: 'Alta', module: 'Onboarding' },
    { id: 'T-002', title: 'Rever contratos a expirar', owner: 'Ana Martins', status: 'ABERTA', due: '20/09', priority: 'Média', module: 'Documentos' },
    { id: 'T-003', title: 'Validar cobertura da escala de sábado', owner: 'Miguel Silva', status: 'EM CURSO', due: '17/09', priority: 'Alta', module: 'Turnos' },
    { id: 'T-004', title: 'Agendar entrevista Inês Duarte', owner: 'Sofia Costa', status: 'ABERTA', due: '18/09', priority: 'Média', module: 'Recrutamento' },
  ],
  alerts: [
    { id: 'I-001', severity: 'ALTA', title: 'Contratos próximos da validade', message: '2 documentos expiram nos próximos 15 dias.', source: 'Documentos · validade', score: 91, status: 'ABERTO', assignee: 'Ana Martins' },
    { id: 'I-002', severity: 'ALTA', title: 'Cobertura insuficiente', message: 'Operações tarde tem 88% de cobertura para sábado.', source: 'Escalas · cobertura', score: 86, status: 'ABERTO', assignee: 'Miguel Silva' },
    { id: 'I-003', severity: 'MÉDIA', title: 'Padrão de atrasos', message: 'Miguel Silva registou 3 atrasos na última semana.', source: 'Ponto · últimos 7 dias', score: 72, status: 'ABERTO', assignee: 'Miguel Silva' },
    { id: 'I-004', severity: 'MÉDIA', title: 'Férias concentradas', message: 'Pessoas terá 4 ausências entre 25 e 30/09.', source: 'Férias · cobertura', score: 65, status: 'ABERTO', assignee: 'Ana Martins' },
    { id: 'I-005', severity: 'BAIXA', title: 'Rotatividade a acompanhar', message: '2 contratos terminam no próximo trimestre.', source: 'Pessoas · contratos', score: 41, status: 'ABERTO', assignee: '' },
  ],
  notifications: [
    { id: 'N-001', title: 'Atraso registado', message: 'Miguel Silva entrou às 09:14.', module: 'Ponto', urgent: true, read: false },
    { id: 'N-002', title: 'Documento a expirar', message: 'Contrato de Tiago Rocha expira em 13 dias.', module: 'Documentos', urgent: true, read: false },
    { id: 'N-003', title: 'Pedido de férias', message: 'Ana Martins submeteu férias para 25/09.', module: 'Férias', urgent: false, read: false },
    { id: 'N-004', title: 'Candidata em proposta', message: 'Marta Reis avançou para proposta.', module: 'Recrutamento', urgent: false, read: true },
  ],
  assistant: [],
};

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...seed, ...JSON.parse(raw) } : seed;
  } catch {
    return seed;
  }
}

function useLocalState() {
  const [store, setStore] = useState(loadInitial);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }, [store]);
  return [store, setStore];
}

const todayLabel = () => new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short' }).format(new Date());
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}`;

function formatNumber(value) { return new Intl.NumberFormat('pt-PT').format(value); }
function percent(value) { return `${Math.round(Number(value || 0))}%`; }
function csvDownload(filename, rows) {
  const text = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(';')).join('\n');
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

function AppButton({ children, variant = 'ghost', icon: Icon, onClick, disabled = false }) {
  return <button type="button" className={`demo-btn demo-btn-${variant}`} onClick={onClick} disabled={disabled}>{Icon && <Icon size={16} />}{children}</button>;
}

function StatCard({ label, value, detail, icon: Icon, tone = 'blue' }) {
  return <div className="demo-card demo-stat"><div className={`demo-icon demo-tone-${tone}`}><Icon size={18} /></div><div className="demo-stat-body"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

function Pill({ children, tone = 'neutral' }) { return <span className={`demo-pill demo-pill-${tone}`}>{children}</span>; }

function MiniBars({ values = [], labels = [] }) {
  const max = Math.max(...values, 1);
  return <div className="demo-chart-bars" role="img" aria-label="Assiduidade dos últimos dias">
    {values.map((value, index) => <div className="demo-bar-item" key={`${labels[index]}-${index}`}><div className="demo-bar-track"><div className="demo-bar-fill" style={{ height: `${Math.max(8, (value / max) * 100)}%` }} /></div><span>{labels[index]}</span></div>)}
  </div>;
}

function Modal({ title, children, onClose, width = 620 }) {
  return <div className="demo-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="demo-modal" style={{ maxWidth: width }}><div className="demo-modal-head"><div><h3>{title}</h3><span>Dados guardados localmente nesta demonstração.</span></div><button type="button" className="demo-icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>{children}</div></div>;
}

function TextInput({ label, value, onChange, type = 'text', placeholder }) { return <label className="demo-field"><span>{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>; }
function SelectInput({ label, value, onChange, options }) { return <label className="demo-field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }

function Dashboard({ store, setStore, go, toast }) {
  const active = store.employees.filter((e) => e.status !== 'AUSENTE').length;
  const present = store.attendance.filter((a) => a.date === '17/09' && a.entry && !a.exit).length + 3;
  const late = store.attendance.filter((a) => a.late > 5).length;
  const pending = store.tasks.filter((t) => t.status !== 'CONCLUÍDA').length + store.leaves.filter((l) => l.status === 'PENDENTE').length;
  const approvals = store.leaves.filter((l) => l.status === 'PENDENTE').length;
  const days = ['11', '12', '13', '14', '15', '16', '17'];
  const values = [96, 94, 97, 91, 95, 93, 94];
  const sync = () => { setStore((s) => ({ ...s, lastSync: new Date().toISOString() })); toast('Dados sincronizados com sucesso.'); };
  const exportReport = () => { csvDownload('te-connect-relatorio-rh.csv', [['Colaborador', 'Equipa', 'Estado', 'Assiduidade'], ...store.employees.map((e) => [e.name, e.team, e.status, `${e.attendance}%`])]); toast('Relatório exportado.'); };
  return <>
    <div className="demo-hero"><div><div className="demo-eyebrow"><Sparkles size={14} /> Executive People Command</div><h1>Tudo o que o RH precisa, numa só visão.</h1><p>Uma central humana, estratégica e tecnológica para conectar pessoas, talento e operações.</p></div><div className="demo-actions"><AppButton icon={Download} onClick={exportReport}>Exportar relatório</AppButton><AppButton icon={Activity} onClick={sync}>Sincronizar</AppButton><AppButton variant="primary" icon={UserPlus} onClick={() => go('employees', { openCreate: true })}>Criar colaborador</AppButton></div></div>
    <div className="demo-grid demo-grid-4"><StatCard icon={Users} label="Colaboradores ativos" value={formatNumber(active)} detail="de 8 no período"/><StatCard icon={UserCheck} label="Presentes agora" value={formatNumber(present)} detail="estado em tempo real" tone="green"/><StatCard icon={Clock3} label="Atrasos hoje" value={formatNumber(late)} detail="2 acima do limiar" tone="amber"/><StatCard icon={CalendarDays} label="Pendências" value={formatNumber(pending)} detail={`${approvals} aprovações`} tone="red"/></div>
    <div className="demo-grid demo-grid-main"><section className="demo-card demo-panel"><div className="demo-panel-head"><div><h2>Assiduidade</h2><span>Últimos 7 dias · meta ≥ 92%</span></div><Pill tone="success">94% atual</Pill></div><MiniBars values={values} labels={days} /><div className="demo-metric-row"><div><small>Horas extra</small><strong>12h 40m</strong></div><div><small>Faltas</small><strong>3</strong></div><div><small>Banco de horas</small><strong>+18h</strong></div></div></section><section className="demo-card demo-panel"><div className="demo-panel-head"><div><h2>Centro de alertas</h2><span>{store.alerts.length} sinais monitorizados</span></div><AppButton onClick={() => go('intelligence')}>Ver centro <ArrowRight size={14} /></AppButton></div>{store.alerts.slice(0, 4).map((alert) => <div className="demo-list-row" key={alert.id}><div className={`demo-severity demo-severity-${alert.severity.toLowerCase()}`} /><div className="demo-list-main"><strong>{alert.title}</strong><span>{alert.message}</span></div><button className="demo-link" onClick={() => go('intelligence')}>Investigar</button></div>)}</section></div>
    <div className="demo-grid demo-grid-3"><section className="demo-card demo-panel demo-gradient"><div className="demo-eyebrow"><Lightbulb size={14} /> Resumo executivo</div><h2>O foco de hoje</h2><p>Concentrar o esforço em documentação a expirar, cobertura da escala de sábado e integração de Beatriz Lopes.</p><div className="demo-reco"><strong>Prioridade 1</strong><span>Renovar 2 documentos até ao final da semana.</span></div><div className="demo-reco"><strong>Prioridade 2</strong><span>Reforçar cobertura da operação tarde.</span></div></section><section className="demo-card demo-panel"><div className="demo-panel-head"><h2>Tarefas de RH</h2><AppButton onClick={() => go('onboarding')}>Abrir</AppButton></div>{store.tasks.slice(0, 3).map((task) => <div className="demo-task-row" key={task.id}><span className={`demo-dot ${task.priority === 'Alta' ? 'red' : 'blue'}`} /><div><strong>{task.title}</strong><small>{task.owner} · {task.due}</small></div><Pill tone={task.status === 'EM CURSO' ? 'blue' : 'neutral'}>{task.status}</Pill></div>)}</section><section className="demo-card demo-panel"><div className="demo-panel-head"><h2>Notificações</h2><AppButton onClick={() => go('notifications')}>Abrir</AppButton></div>{store.notifications.slice(0, 3).map((n) => <div className="demo-task-row" key={n.id}><Bell size={15} /><div><strong>{n.title}</strong><small>{n.message}</small></div>{n.urgent && <Pill tone="danger">Urgente</Pill>}</div>)}</section></div>
  </>;
}

function Employees({ store, setStore, toast, request }) {
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('Todos'); const [page, setPage] = useState(1); const [selected, setSelected] = useState(null); const [editing, setEditing] = useState(false);
  useEffect(() => { if (request?.openCreate) setEditing({ new: true }); }, [request]);
  const filtered = store.employees.filter((e) => `${e.name} ${e.role} ${e.team}`.toLowerCase().includes(query.toLowerCase()) && (status === 'Todos' || e.status === status));
  const pageSize = 6; const pages = Math.max(1, Math.ceil(filtered.length / pageSize)); const items = filtered.slice((page - 1) * pageSize, page * pageSize);
  const save = (payload) => { setStore((s) => { const employee = payload.id ? payload : { ...payload, id: uid('E'), hire: new Date().toISOString().slice(0, 10), vacation: 22, attendance: 100, performance: 80, photo: payload.name.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase() }; return { ...s, employees: payload.id ? s.employees.map((e) => e.id === payload.id ? employee : e) : [...s.employees, employee] }; }); setEditing(false); toast('Colaborador guardado.'); };
  const archive = (employee) => { setStore((s) => ({ ...s, employees: s.employees.map((e) => e.id === employee.id ? { ...e, status: 'ARQUIVADO' } : e) })); toast('Colaborador arquivado.'); };
  return <><div className="demo-hero"><div><div className="demo-eyebrow"><Users size={14} /> Pessoas</div><h1>Colaboradores</h1><p>Pesquisa, filtros, perfis, histórico e estados numa única área.</p></div><AppButton variant="primary" icon={UserPlus} onClick={() => setEditing({ new: true })}>Novo colaborador</AppButton></div><div className="demo-toolbar"><label className="demo-search"><Search size={16} /><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Pesquisar nome, função ou equipa" /></label><label className="demo-select"><Filter size={15} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option>Todos</option>{['ATIVO', 'FÉRIAS', 'AUSENTE', 'PENDENTE', 'CONTRATO A TERMINAR', 'ARQUIVADO'].map((s) => <option key={s}>{s}</option>)}</select></label></div><section className="demo-card demo-panel"><div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>Colaborador</th><th>Função</th><th>Equipa</th><th>Estado</th><th>Assiduidade</th><th>Ações</th></tr></thead><tbody>{items.map((e) => <tr key={e.id}><td><button className="demo-person" onClick={() => setSelected(e)}><span className="demo-avatar">{e.photo}</span><span><strong>{e.name}</strong><small>{e.email}</small></span></button></td><td>{e.role}</td><td>{e.team}</td><td><Pill tone={e.status === 'ATIVO' ? 'success' : e.status === 'AUSENTE' ? 'danger' : 'warning'}>{e.status}</Pill></td><td><div className="demo-progress"><span style={{ width: `${e.attendance}%` }} /></div><small>{e.attendance}%</small></td><td><div className="demo-row-actions"><button className="demo-icon-btn" title="Editar" onClick={() => setEditing(e)}><Settings2 size={15} /></button><button className="demo-icon-btn" title="Arquivar" onClick={() => archive(e)}><Archive size={15} /></button></div></td></tr>)}</tbody></table></div><div className="demo-pagination"><span>{filtered.length} colaboradores encontrados</span><div><button className="demo-icon-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={15} /></button><span>Página {page} / {pages}</span><button className="demo-icon-btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={15} /></button></div></div></section>{selected && <EmployeeProfile employee={selected} onClose={() => setSelected(null)} />}{editing && <EmployeeForm initial={editing.new ? null : editing} onClose={() => setEditing(false)} onSave={save} />}</>;
}

function EmployeeProfile({ employee, onClose }) { return <Modal title={employee.name} onClose={onClose} width={840}><div className="demo-profile-head"><div className="demo-avatar demo-avatar-xl">{employee.photo}</div><div><h3>{employee.role}</h3><p>{employee.team} · {employee.contract}</p></div><Pill tone={employee.status === 'ATIVO' ? 'success' : 'warning'}>{employee.status}</Pill></div><div className="demo-profile-grid"><div><span>Contacto</span><strong>{employee.phone}</strong><small>{employee.email}</small></div><div><span>Admissão</span><strong>{employee.hire}</strong><small>{employee.vacation} dias de férias</small></div><div><span>Assiduidade</span><strong>{employee.attendance}%</strong><small>últimos 30 dias</small></div><div><span>Desempenho</span><strong>{employee.performance}%</strong><small>PDI em curso</small></div></div><div className="demo-profile-tabs"><div className="demo-mini-card"><FileText size={16} /><strong>Documentos</strong><span>4 válidos · 1 a expirar</span></div><div className="demo-mini-card"><CalendarDays size={16} /><strong>Férias</strong><span>{employee.vacation} dias disponíveis</span></div><div className="demo-mini-card"><Clock3 size={16} /><strong>Assiduidade</strong><span>98% · 2 pedidos de ajuste</span></div><div className="demo-mini-card"><GraduationCap size={16} /><strong>Desenvolvimento</strong><span>2 objetivos · 1 PDI</span></div></div></Modal>; }

function EmployeeForm({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || { name: '', role: '', team: 'Pessoas', contract: 'Sem termo', status: 'ATIVO', email: '', phone: '' });
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  return <Modal title={initial ? 'Editar colaborador' : 'Criar colaborador'} onClose={onClose}><div className="demo-form-grid"><TextInput label="Nome completo" value={form.name} onChange={(v) => update('name', v)} /><TextInput label="Função" value={form.role} onChange={(v) => update('role', v)} /><SelectInput label="Equipa" value={form.team} onChange={(v) => update('team', v)} options={['Pessoas', 'Operações', 'Tecnologia', 'Comercial', 'Produto', 'Financeiro']} /><SelectInput label="Contrato" value={form.contract} onChange={(v) => update('contract', v)} options={['Sem termo', 'Termo certo', 'Prestação de serviços']} /><SelectInput label="Estado" value={form.status} onChange={(v) => update('status', v)} options={['ATIVO', 'FÉRIAS', 'AUSENTE', 'PENDENTE', 'CONTRATO A TERMINAR']} /><TextInput label="Email" type="email" value={form.email} onChange={(v) => update('email', v)} /><TextInput label="Telefone" value={form.phone} onChange={(v) => update('phone', v)} /></div><div className="demo-modal-actions"><AppButton onClick={onClose}>Cancelar</AppButton><AppButton variant="primary" onClick={() => form.name && form.role ? onSave(form) : null}>Guardar</AppButton></div></Modal>;
}

function Recruitment({ store, setStore, toast }) {
  const [modal, setModal] = useState(false); const [candidate, setCandidate] = useState({ name: '', role: '', stage: 'CANDIDATURA', score: 80 });
  const stages = ['CANDIDATURA', 'TRIAGEM', 'ENTREVISTA', 'PROPOSTA', 'CONTRATADO', 'REJEITADO'];
  const add = () => { if (!candidate.name || !candidate.role) return; setStore((s) => ({ ...s, candidates: [...s.candidates, { ...candidate, id: uid('C'), criteria: ['Critérios definidos pelo gestor', 'Experiência relevante', 'Competências da função'], updated: 'Agora', owner: 'Ana Martins' }] })); setModal(false); setCandidate({ name: '', role: '', stage: 'CANDIDATURA', score: 80 }); toast('Candidatura adicionada.'); };
  const move = (id, stage) => setStore((s) => ({ ...s, candidates: s.candidates.map((c) => c.id === id ? { ...c, stage, updated: 'Agora' } : c) }));
  return <><div className="demo-hero"><div><div className="demo-eyebrow"><KanbanSquare size={14} /> Recrutamento e seleção</div><h1>Pipeline de talento</h1><p>Processo transparente e baseado apenas em critérios profissionais definidos para a função.</p></div><AppButton variant="primary" icon={Plus} onClick={() => setModal(true)}>Adicionar candidato</AppButton></div><div className="demo-kanban">{stages.map((stage) => <div className="demo-kanban-col" key={stage}><div className="demo-kanban-head"><strong>{stage}</strong><Pill>{store.candidates.filter((c) => c.stage === stage).length}</Pill></div>{store.candidates.filter((c) => c.stage === stage).map((c) => <div className="demo-candidate" key={c.id}><div className="demo-candidate-top"><span className="demo-avatar">{c.name.split(/\s+/).map((x) => x[0]).join('').slice(0, 2)}</span><div><strong>{c.name}</strong><small>{c.role}</small></div></div><div className="demo-score"><span>Compatibilidade profissional</span><strong>{c.score}%</strong></div><ul>{c.criteria.map((x) => <li key={x}>{x}</li>)}</ul><SelectInput label="Etapa" value={c.stage} onChange={(v) => move(c.id, v)} options={stages} /></div>)}</div>)}</div>{modal && <Modal title="Novo candidato" onClose={() => setModal(false)}><div className="demo-form-grid"><TextInput label="Nome" value={candidate.name} onChange={(v) => setCandidate({ ...candidate, name: v })} /><TextInput label="Função" value={candidate.role} onChange={(v) => setCandidate({ ...candidate, role: v })} /><SelectInput label="Etapa inicial" value={candidate.stage} onChange={(v) => setCandidate({ ...candidate, stage: v })} options={stages} /><TextInput label="Score profissional" type="number" value={candidate.score} onChange={(v) => setCandidate({ ...candidate, score: v })} /></div><p className="demo-helper"><ShieldCheck size={15} /> A avaliação não usa dados sensíveis nem atributos protegidos.</p><div className="demo-modal-actions"><AppButton onClick={() => setModal(false)}>Cancelar</AppButton><AppButton variant="primary" onClick={add}>Guardar candidato</AppButton></div></Modal>}</>;
}

function Onboarding({ store, setStore, toast }) {
  const [selected, setSelected] = useState(store.onboarding[0]?.id || ''); const item = store.onboarding.find((x) => x.id === selected) || store.onboarding[0];
  const toggle = (taskId) => setStore((s) => ({ ...s, onboarding: s.onboarding.map((o) => o.id === item.id ? { ...o, tasks: o.tasks.map((t) => t.id === taskId ? { ...t, done: !t.done } : t), progress: Math.round((o.tasks.filter((t) => t.id === taskId ? !t.done : t.done).length / o.tasks.length) * 100) } : o) }));
  const createTask = () => { setStore((s) => ({ ...s, tasks: [...s.tasks, { id: uid('T'), title: `Onboarding · ${item.employee}`, owner: 'Ana Martins', status: 'ABERTA', due: '20/09', priority: 'Média', module: 'Onboarding' }] })); toast('Tarefa de onboarding criada.'); };
  if (!item) return <EmptyState title="Sem onboardings" description="Adicione um colaborador para iniciar o checklist." />;
  return <><div className="demo-hero"><div><div className="demo-eyebrow"><UserCheck size={14} /> Onboarding</div><h1>Integração de pessoas</h1><p>Checklist colaborativo por colaborador, com responsáveis e progresso.</p></div><AppButton variant="primary" icon={Plus} onClick={createTask}>Criar tarefa</AppButton></div><div className="demo-grid demo-grid-3"><section className="demo-card demo-panel"><h2>Colaboradores</h2>{store.onboarding.map((o) => <button className={`demo-side-option ${o.id === item.id ? 'active' : ''}`} key={o.id} onClick={() => setSelected(o.id)}><span className="demo-avatar">{o.employee.split(/\s+/).map((x) => x[0]).join('').slice(0, 2)}</span><span><strong>{o.employee}</strong><small>{o.progress}% concluído</small></span><ChevronRight size={15} /></button>)}</section><section className="demo-card demo-panel demo-span-2"><div className="demo-panel-head"><div><h2>{item.employee}</h2><span>Progresso do onboarding</span></div><strong className="demo-big-percent">{item.progress}%</strong></div><div className="demo-progress demo-progress-lg"><span style={{ width: `${item.progress}%` }} /></div><div className="demo-checklist">{item.tasks.map((task) => <label key={task.id} className="demo-check-row"><input type="checkbox" checked={task.done} onChange={() => toggle(task.id)} /><span><strong>{task.title}</strong><small>Responsável: {task.owner}</small></span>{task.done ? <CheckCircle2 className="demo-icon-success" size={18} /> : <Clock3 size={18} />}</label>)}</div></section></div></>;
}

function Attendance({ store, setStore, toast }) {
  const [employee, setEmployee] = useState(store.employees[0]?.name || ''); const current = store.employees.find((e) => e.name === employee); const active = store.attendance.find((a) => a.employee === employee && a.date === '17/09' && !a.exit);
  const punch = (kind) => { const now = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }); setStore((s) => { const existingIndex = s.attendance.findIndex((a) => a.employee === employee && a.date === '17/09'); let attendance = [...s.attendance]; if (existingIndex < 0) attendance.unshift({ id: uid('A'), employee, date: '17/09', entry: kind === 'ENTRY' ? now : '', break: kind === 'BREAK' ? now : '', return: '', exit: kind === 'EXIT' ? now : '', late: kind === 'ENTRY' ? Math.max(0, Number(now.slice(0, 2)) * 60 + Number(now.slice(3)) - 540) : 0, overtime: 0, state: kind === 'EXIT' ? 'Completo' : 'Em curso' }); else { const item = { ...attendance[existingIndex] }; if (kind === 'BREAK') item.break = now; if (kind === 'RETURN') item.return = now; if (kind === 'EXIT') { item.exit = now; item.state = 'Completo'; } attendance[existingIndex] = item; } return { ...s, attendance }; }); toast(kind === 'ENTRY' ? `Entrada registada para ${employee}.` : kind === 'EXIT' ? `Saída registada para ${employee}.` : kind === 'BREAK' ? 'Pausa iniciada.' : 'Pausa terminada.'); };
  return <><div className="demo-hero"><div><div className="demo-eyebrow"><Clock3 size={14} /> Registo de ponto</div><h1>Assiduidade em tempo real</h1><p>Simulação funcional de entrada, saída e pausa com cálculos locais de atraso e horas extra.</p></div><Pill tone="success">Motor local ativo</Pill></div><div className="demo-grid demo-grid-3"><section className="demo-card demo-panel"><SelectInput label="Colaborador" value={employee} onChange={setEmployee} options={store.employees.map((e) => e.name)} /><div className="demo-clock-big">{new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</div><div className="demo-actions"><AppButton variant="primary" icon={ArrowDown} onClick={() => punch('ENTRY')}>Entrada</AppButton><AppButton icon={Menu} onClick={() => punch(active ? 'BREAK' : 'RETURN')}>{active?.break && !active.return ? 'Terminar pausa' : 'Pausa'}</AppButton><AppButton icon={ArrowUp} onClick={() => punch('EXIT')}>Saída</AppButton></div></section><section className="demo-card demo-panel demo-span-2"><div className="demo-panel-head"><h2>Resumo do dia</h2><Pill>{current?.team}</Pill></div><div className="demo-metric-row"><div><small>Estado</small><strong>{active ? 'Em curso' : 'Sem marcação'}</strong></div><div><small>Atrasos</small><strong>{store.attendance.filter((a) => a.employee === employee && a.late > 5).length}</strong></div><div><small>Horas extra</small><strong>1h 12m</strong></div><div><small>Banco de horas</small><strong>+3h</strong></div></div><div className="demo-geofence"><ShieldCheck size={18} /> <div><strong>Localização autorizada</strong><span>Simulação: escritório Lisboa · raio 150 m</span></div><Pill tone="success">Dentro do raio</Pill></div></section></div><section className="demo-card demo-panel"><div className="demo-panel-head"><div><h2>Registos recentes</h2><span>Filtros por data, colaborador e equipa disponíveis na versão comercial.</span></div></div><div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>Colaborador</th><th>Entrada</th><th>Pausa</th><th>Retorno</th><th>Saída</th><th>Atraso</th><th>Extra</th><th>Estado</th></tr></thead><tbody>{store.attendance.map((a) => <tr key={a.id}><td>{a.employee}</td><td>{a.entry || '—'}</td><td>{a.break || '—'}</td><td>{a.return || '—'}</td><td>{a.exit || '—'}</td><td>{a.late} min</td><td>{a.overtime} min</td><td><Pill tone={a.state === 'Completo' ? 'success' : 'blue'}>{a.state}</Pill></td></tr>)}</tbody></table></div></section></>;
}

function Shifts({ store, setStore, toast }) {
  const [modal, setModal] = useState(false); const [form, setForm] = useState({ name: '', team: 'Operações', days: 'Seg-Sex', start: '09:00', end: '18:00', break: '60 min' });
  const add = () => { if (!form.name) return; setStore((s) => ({ ...s, shifts: [...s.shifts, { ...form, id: uid('S'), coverage: 100, published: false, conflicts: 0 }] })); setModal(false); toast('Turno criado.'); };
  const duplicate = (shift) => setStore((s) => ({ ...s, shifts: [...s.shifts, { ...shift, id: uid('S'), name: `${shift.name} (cópia)`, published: false }] }));
  const publish = (id) => { setStore((s) => ({ ...s, shifts: s.shifts.map((x) => x.id === id ? { ...x, published: !x.published } : x) })); toast('Estado da escala atualizado.'); };
  return <><div className="demo-hero"><div><div className="demo-eyebrow"><CalendarDays size={14} /> Horários e turnos</div><h1>Escalas inteligentes</h1><p>Criação, duplicação, publicação e monitorização de cobertura.</p></div><AppButton variant="primary" icon={Plus} onClick={() => setModal(true)}>Criar turno</AppButton></div><section className="demo-card demo-panel"><div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>Turno</th><th>Equipa</th><th>Horário</th><th>Cobertura</th><th>Conflitos</th><th>Estado</th><th /></tr></thead><tbody>{store.shifts.map((s) => <tr key={s.id}><td><strong>{s.name}</strong><small>{s.days} · pausa {s.break}</small></td><td>{s.team}</td><td>{s.start} → {s.end}</td><td><div className="demo-progress"><span style={{ width: `${s.coverage}%` }} /></div><small>{s.coverage}%</small></td><td>{s.conflicts ? <Pill tone="warning">{s.conflicts} conflito(s)</Pill> : <Pill tone="success">Sem conflitos</Pill>}</td><td><Pill tone={s.published ? 'success' : 'neutral'}>{s.published ? 'Publicado' : 'Rascunho'}</Pill></td><td><div className="demo-row-actions"><button className="demo-icon-btn" title="Duplicar" onClick={() => duplicate(s)}><FolderOpen size={15} /></button><button className="demo-icon-btn" title="Publicar" onClick={() => publish(s.id)}><Check size={15} /></button></div></td></tr>)}</tbody></table></div></section>{modal && <Modal title="Novo turno" onClose={() => setModal(false)}><div className="demo-form-grid"><TextInput label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} /><SelectInput label="Equipa" value={form.team} onChange={(v) => setForm({ ...form, team: v })} options={['Pessoas', 'Operações', 'Tecnologia', 'Comercial', 'Produto']} /><TextInput label="Dias" value={form.days} onChange={(v) => setForm({ ...form, days: v })} /><TextInput label="Início" value={form.start} onChange={(v) => setForm({ ...form, start: v })} /><TextInput label="Fim" value={form.end} onChange={(v) => setForm({ ...form, end: v })} /><TextInput label="Pausa" value={form.break} onChange={(v) => setForm({ ...form, break: v })} /></div><div className="demo-modal-actions"><AppButton onClick={() => setModal(false)}>Cancelar</AppButton><AppButton variant="primary" onClick={add}>Guardar</AppButton></div></Modal>}</>;
}

function Leaves({ store, setStore, toast }) {
  const [modal, setModal] = useState(false); const [form, setForm] = useState({ employee: store.employees[0]?.name || '', type: 'Férias', start: '25/09', end: '30/09', days: 4 });
  const add = () => { setStore((s) => ({ ...s, leaves: [...s.leaves, { ...form, id: uid('L'), status: 'PENDENTE', coverage: 'A ANALISAR' }] })); setModal(false); toast('Pedido submetido para aprovação.'); };
  const approve = (id, accepted) => setStore((s) => ({ ...s, leaves: s.leaves.map((l) => l.id === id ? { ...l, status: accepted ? 'APROVADO' : 'REJEITADO' } : l) }));
  return <><div className="demo-hero"><div><div className="demo-eyebrow"><CalendarDays size={14} /> Férias e ausências</div><h1>Planeamento de ausências</h1><p>Pedidos, saldos, cobertura e aprovações num calendário operacional.</p></div><AppButton variant="primary" icon={Plus} onClick={() => setModal(true)}>Novo pedido</AppButton></div><div className="demo-grid demo-grid-3"><section className="demo-card demo-panel"><div className="demo-panel-head"><h2>Saldo global</h2><Pill tone="success">184 dias</Pill></div><div className="demo-big-number">184</div><small>Dias de férias disponíveis na equipa</small><div className="demo-mini-bars"><span style={{ width: '74%' }} /><span style={{ width: '52%' }} /><span style={{ width: '28%' }} /></div></section><section className="demo-card demo-panel demo-span-2"><div className="demo-panel-head"><h2>Visão de cobertura</h2><Pill tone="warning">2 sobreposições</Pill></div><div className="demo-calendar-grid">{Array.from({ length: 30 }, (_, i) => <div key={i} className={`demo-calendar-day ${[4, 8, 18, 19, 22].includes(i) ? 'busy' : ''}`}><small>{i + 1}</small>{[4, 8, 18, 19, 22].includes(i) && <span>{i % 2 ? '3 aus.' : '2 aus.'}</span>}</div>)}</div></section></div><section className="demo-card demo-panel"><div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>Colaborador</th><th>Tipo</th><th>Período</th><th>Dias</th><th>Cobertura</th><th>Estado</th><th /></tr></thead><tbody>{store.leaves.map((l) => <tr key={l.id}><td>{l.employee}</td><td>{l.type}</td><td>{l.start} → {l.end}</td><td>{l.days}</td><td><Pill tone={l.coverage === 'RISCO' ? 'danger' : l.coverage === 'ATENÇÃO' ? 'warning' : 'success'}>{l.coverage}</Pill></td><td><Pill tone={l.status === 'APROVADO' ? 'success' : l.status === 'PENDENTE' ? 'warning' : 'neutral'}>{l.status}</Pill></td><td>{l.status === 'PENDENTE' && <div className="demo-row-actions"><button className="demo-icon-btn" onClick={() => approve(l.id, true)} title="Aprovar"><Check size={15} /></button><button className="demo-icon-btn" onClick={() => approve(l.id, false)} title="Rejeitar"><X size={15} /></button></div>}</td></tr>)}</tbody></table></div></section>{modal && <Modal title="Novo pedido" onClose={() => setModal(false)}><div className="demo-form-grid"><SelectInput label="Colaborador" value={form.employee} onChange={(v) => setForm({ ...form, employee: v })} options={store.employees.map((e) => e.name)} /><SelectInput label="Tipo" value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={['Férias', 'Falta', 'Licença', 'Ausência']} /><TextInput label="Início" value={form.start} onChange={(v) => setForm({ ...form, start: v })} /><TextInput label="Fim" value={form.end} onChange={(v) => setForm({ ...form, end: v })} /><TextInput label="Dias" type="number" value={form.days} onChange={(v) => setForm({ ...form, days: v })} /></div><div className="demo-modal-actions"><AppButton onClick={() => setModal(false)}>Cancelar</AppButton><AppButton variant="primary" onClick={add}>Submeter pedido</AppButton></div></Modal>}</>;
}

function Documents({ store, setStore, toast }) {
  const [modal, setModal] = useState(false); const [filter, setFilter] = useState('Todos'); const [form, setForm] = useState({ employee: store.employees[0]?.name || '', type: 'Contrato de trabalho', expiry: '31/12/2027' });
  const docs = store.documents.filter((d) => filter === 'Todos' || d.status === filter);
  const add = () => { setStore((s) => ({ ...s, documents: [{ ...form, id: uid('D'), status: 'Válido', updated: todayLabel() }, ...s.documents] })); setModal(false); toast('Documento carregado (simulado).'); };
  return <><div className="demo-hero"><div><div className="demo-eyebrow"><FolderOpen size={14} /> Documentos e conformidade</div><h1>Documentos RH</h1><p>Contratos, certificados e políticas com validade, lembretes e auditoria.</p></div><AppButton variant="primary" icon={Plus} onClick={() => setModal(true)}>Upload simulado</AppButton></div><div className="demo-toolbar"><label className="demo-select"><Filter size={15} /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option>Todos</option><option>Válido</option><option>A expirar</option><option>Em falta</option></select></label></div><section className="demo-card demo-panel"><div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>Colaborador</th><th>Documento</th><th>Validade</th><th>Estado</th><th>Atualizado</th><th>Ações</th></tr></thead><tbody>{docs.map((d) => <tr key={d.id}><td>{d.employee}</td><td><strong>{d.type}</strong></td><td>{d.expiry}</td><td><Pill tone={d.status === 'Válido' ? 'success' : d.status === 'A expirar' ? 'warning' : 'danger'}>{d.status}</Pill></td><td>{d.updated}</td><td><AppButton onClick={() => toast('Detalhe do documento aberto.')}>Ver</AppButton></td></tr>)}</tbody></table></div></section>{modal && <Modal title="Novo documento" onClose={() => setModal(false)}><div className="demo-form-grid"><SelectInput label="Colaborador" value={form.employee} onChange={(v) => setForm({ ...form, employee: v })} options={store.employees.map((e) => e.name)} /><SelectInput label="Tipo" value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={['Contrato de trabalho', 'Recibo', 'Certificado', 'Política interna', 'Declaração']} /><TextInput label="Validade" value={form.expiry} onChange={(v) => setForm({ ...form, expiry: v })} /></div><div className="demo-modal-actions"><AppButton onClick={() => setModal(false)}>Cancelar</AppButton><AppButton variant="primary" onClick={add}>Guardar documento</AppButton></div></Modal>}</>;
}

function Performance({ store, setStore, toast }) {
  const [modal, setModal] = useState(false); const [form, setForm] = useState({ employee: store.employees[0]?.name || '', goal: '', target: '', progress: 0 });
  const add = () => { if (!form.goal) return; setStore((s) => ({ ...s, performance: [...s.performance, { ...form, id: uid('P'), period: 'Q3 2026', owner: 'Gestor' }] })); setModal(false); toast('Objetivo criado.'); };
  return <><div className="demo-hero"><div><div className="demo-eyebrow"><Target size={14} /> Desempenho e desenvolvimento</div><h1>Objetivos, feedback e PDI</h1><p>Visibilidade sobre progresso, competências e necessidades de desenvolvimento.</p></div><AppButton variant="primary" icon={Plus} onClick={() => setModal(true)}>Novo objetivo</AppButton></div><div className="demo-grid demo-grid-4">{store.performance.slice(0, 4).map((goal) => <div className="demo-card demo-panel" key={goal.id}><div className="demo-panel-head"><Pill>{goal.period}</Pill><MoreHorizontal size={17} /></div><h3>{goal.goal}</h3><span className="demo-muted">{goal.employee}</span><div className="demo-progress demo-progress-lg"><span style={{ width: `${goal.progress}%` }} /></div><div className="demo-goal-meta"><strong>{goal.progress}%</strong><span>{goal.target}</span></div><div className="demo-mini-card"><GraduationCap size={15} /><span>PDI: acompanhamento mensal</span></div></div>)}</div>{modal && <Modal title="Novo objetivo" onClose={() => setModal(false)}><div className="demo-form-grid"><SelectInput label="Colaborador" value={form.employee} onChange={(v) => setForm({ ...form, employee: v })} options={store.employees.map((e) => e.name)} /><TextInput label="Objetivo" value={form.goal} onChange={(v) => setForm({ ...form, goal: v })} /><TextInput label="Meta" value={form.target} onChange={(v) => setForm({ ...form, target: v })} /><TextInput label="Progresso (%)" type="number" value={form.progress} onChange={(v) => setForm({ ...form, progress: v })} /></div><div className="demo-modal-actions"><AppButton onClick={() => setModal(false)}>Cancelar</AppButton><AppButton variant="primary" onClick={add}>Guardar objetivo</AppButton></div></Modal>}</>;
}

function Intelligence({ store, setStore, toast }) {
  const act = (id, action) => { if (action === 'resolve') setStore((s) => ({ ...s, alerts: s.alerts.map((a) => a.id === id ? { ...a, status: 'RESOLVIDO' } : a) })); else if (action === 'task') setStore((s) => ({ ...s, tasks: [...s.tasks, { id: uid('T'), title: `Investigar alerta ${id}`, owner: 'Ana Martins', status: 'ABERTA', due: '19/09', priority: 'Alta', module: 'Intelligence' }] })); toast(action === 'resolve' ? 'Sinal marcado como resolvido.' : 'Ação criada e atribuída a RH.'); };
  const open = store.alerts.filter((a) => a.status === 'ABERTO');
  return <><div className="demo-hero"><div><div className="demo-eyebrow"><Sparkles size={14} /> Te-connect Intelligence Center</div><h1>Antecipe. Decida. Aja.</h1><p>Riscos de RH explicados pela origem dos dados, com ações práticas e auditáveis.</p></div><Pill tone="blue">Dados explicados</Pill></div><div className="demo-intelligence-summary"><div><span>Risco operacional</span><strong>42<span>/100</span></strong><small>Controlado, com 2 sinais prioritários.</small></div><div><span>Sinal mais forte</span><strong>91</strong><small>Documentos a expirar.</small></div><div><span>Fonte</span><strong>5 módulos</strong><small>Ponto · Escalas · Férias · Docs · Pessoas</small></div></div><section className="demo-card demo-panel"><div className="demo-panel-head"><div><h2>Radar de riscos</h2><span>{open.length} sinais abertos</span></div><AppButton onClick={() => toast('Radar atualizado com os dados da demonstração.')}>Atualizar radar</AppButton></div>{store.alerts.map((a) => <div className="demo-intel-row" key={a.id}><div className={`demo-risk-score demo-risk-${a.severity.toLowerCase()}`}>{a.score}</div><div className="demo-intel-main"><div><Pill tone={a.severity === 'ALTA' ? 'danger' : a.severity === 'MÉDIA' ? 'warning' : 'neutral'}>{a.severity}</Pill><strong>{a.title}</strong></div><p>{a.message}</p><small>Origem: {a.source} · Responsável: {a.assignee || 'Não atribuído'}</small></div><div className="demo-row-actions"><AppButton onClick={() => toast(`Investigação aberta: ${a.title}`)}>Investigar</AppButton><AppButton onClick={() => act(a.id, 'task')}>Criar ação</AppButton><AppButton onClick={() => act(a.id, 'resolve')}>Resolver</AppButton></div></div>)}</section></>;
}

function Assistant({ store, setStore, go, toast }) {
  const [input, setInput] = useState(''); const [loading, setLoading] = useState(false);
  const suggestions = ['Quem tem férias esta semana?', 'Mostra os atrasos recorrentes.', 'Quais documentos expiram este mês?', 'Resume os principais riscos de RH.', 'Quais equipas têm menos cobertura amanhã?', 'Prepara um relatório de assiduidade.'];
  const answer = (question) => { const q = question.toLowerCase(); let response; let actions = []; if (q.includes('férias')) { const people = store.leaves.filter((l) => l.type === 'Férias' && l.status !== 'REJEITADO').map((l) => l.employee).join(', '); response = { title: 'Férias desta semana', text: people || 'Sem férias registadas para esta semana.', cards: store.leaves.filter((l) => l.type === 'Férias').map((l) => ({ title: l.employee, value: `${l.start} → ${l.end}`, meta: `${l.days} dias` })) }; actions = [{ label: 'Abrir férias', module: 'leaves' }]; } else if (q.includes('atras')) { response = { title: 'Atrasos recorrentes', text: 'Miguel Silva apresenta 3 ocorrências acima de 5 minutos na última semana.', cards: store.attendance.filter((a) => a.late > 5).map((a) => ({ title: a.employee, value: `${a.late} min`, meta: a.date })) }; actions = [{ label: 'Abrir ponto', module: 'attendance' }, { label: 'Criar acompanhamento', task: true }]; } else if (q.includes('document')) { response = { title: 'Documentos a expirar', text: `${store.documents.filter((d) => d.status === 'A expirar').length} documentos precisam de atenção este mês.`, cards: store.documents.filter((d) => d.status === 'A expirar').map((d) => ({ title: d.employee, value: d.type, meta: d.expiry })) }; actions = [{ label: 'Abrir documentos', module: 'documents' }]; } else if (q.includes('risco')) { response = { title: 'Principais riscos de RH', text: 'Os sinais prioritários são documentação, cobertura de turnos e atrasos recorrentes.', cards: store.alerts.slice(0, 3).map((a) => ({ title: a.title, value: a.score, meta: a.source })) }; actions = [{ label: 'Abrir Intelligence', module: 'intelligence' }]; } else if (q.includes('cobertura')) { response = { title: 'Cobertura de amanhã', text: 'Operações tarde apresenta 88% de cobertura e 2 conflitos. Recomenda-se reforço de 1 pessoa.', cards: store.shifts.map((s) => ({ title: s.name, value: `${s.coverage}%`, meta: `${s.conflicts} conflitos` })) }; actions = [{ label: 'Abrir turnos', module: 'shifts' }]; } else { response = { title: 'Relatório de assiduidade', text: 'Assiduidade média de 94% nos últimos 7 dias. Atrasos concentrados em Operações.', cards: [{ title: 'Assiduidade', value: '94%', meta: '7 dias' }, { title: 'Atrasos', value: '6', meta: 'ocorrências' }, { title: 'Horas extra', value: '12h 40m', meta: 'semana' }] }; actions = [{ label: 'Abrir dashboard', module: 'dashboard' }, { label: 'Exportar CSV', export: true }]; }
    return { role: 'assistant', question, response, actions, id: uid('M') }; };
  const ask = (question) => { if (!question) return; setLoading(true); setTimeout(() => { const message = answer(question); setStore((s) => ({ ...s, assistant: [...s.assistant, message] })); setLoading(false); }, 300); setInput(''); };
  const last = store.assistant.at(-1);
  return <><div className="demo-hero"><div><div className="demo-eyebrow"><MessageCircle size={14} /> Te-connect Assist</div><h1>Assistente de RH integrado</h1><p>Pergunte pelos seus dados de demonstração e receba respostas com contexto, origem e ações.</p></div><Pill tone="blue">Demo local</Pill></div><section className="demo-assistant"><div className="demo-assistant-head"><div className="demo-avatar demo-avatar-xl"><Sparkles size={22} /></div><div><strong>Te-connect Assist</strong><span>Pronto para ajudar o responsável de RH.</span></div></div><div className="demo-assistant-suggestions">{suggestions.map((s) => <button key={s} onClick={() => ask(s)}>{s}</button>)}</div>{store.assistant.length === 0 ? <div className="demo-assistant-empty"><MessageCircle size={26} /><strong>Como posso ajudar?</strong><span>Experimente uma das perguntas acima ou escreva a sua.</span></div> : <div className="demo-chat">{last && <div className="demo-chat-message"><div className="demo-chat-question">{last.question}</div><div className="demo-chat-answer"><strong>{last.response.title}</strong><p>{last.response.text}</p><div className="demo-answer-cards">{last.response.cards?.map((card) => <div className="demo-answer-card" key={`${card.title}-${card.value}`}><strong>{card.title}</strong><span>{card.value}</span><small>{card.meta}</small></div>)}</div><div className="demo-actions">{last.actions?.map((action) => <button className="demo-btn demo-btn-ghost" key={action.label} onClick={() => action.module ? go(action.module) : action.export ? (csvDownload('te-connect-assiduidade.csv', [['Colaborador', 'Data', 'Atraso', 'Extra'], ...store.attendance.map((a) => [a.employee, a.date, `${a.late} min`, `${a.overtime} min`])]), toast('Relatório exportado.')) : (setStore((s) => ({ ...s, tasks: [...s.tasks, { id: uid('T'), title: 'Acompanhar atrasos recorrentes', owner: 'Ana Martins', status: 'ABERTA', due: '19/09', priority: 'Média', module: 'Ponto' }] })), toast('Tarefa criada.'))}>{action.label}</button>)}</div></div></div>}</div>}
    <form className="demo-assistant-compose" onSubmit={(e) => { e.preventDefault(); ask(input); }}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte ao Te-connect Assist…" /><AppButton variant="primary" icon={loading ? Activity : Send} onClick={() => ask(input)} disabled={loading}>{loading ? 'A analisar…' : 'Enviar'}</AppButton></form></section></>;
}

function Notifications({ store, setStore }) {
  const [filter, setFilter] = useState('Todas');
  const items = store.notifications.filter((n) => filter === 'Todas' || (filter === 'Não lidas' ? !n.read : n.module === filter));
  const markRead = (id) => setStore((s) => ({ ...s, notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) }));
  const resolve = (id) => setStore((s) => ({ ...s, notifications: s.notifications.filter((n) => n.id !== id) }));
  return <><div className="demo-hero"><div><div className="demo-eyebrow"><Bell size={14} /> Central de notificações</div><h1>Sinais, pedidos e alertas</h1><p>Tempo real simulado, com filtros por urgência, módulo e estado.</p></div></div><div className="demo-toolbar"><label className="demo-select"><Filter size={15} /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option>Todas</option><option>Não lidas</option><option>Ponto</option><option>Documentos</option><option>Férias</option><option>Recrutamento</option></select></label></div><section className="demo-card demo-panel">{items.map((n) => <div className={`demo-notification ${n.read ? '' : 'unread'}`} key={n.id}><div className={`demo-notification-icon ${n.urgent ? 'urgent' : ''}`}><Bell size={17} /></div><div className="demo-list-main"><strong>{n.title}</strong><span>{n.message}</span><small>{n.module}</small></div><div className="demo-row-actions">{!n.read && <AppButton onClick={() => markRead(n.id)}>Marcar lido</AppButton>}<AppButton onClick={() => resolve(n.id)}>Resolver</AppButton></div></div>)}</section></>;
}

function EmptyState({ title, description }) { return <div className="demo-empty"><Sparkles size={30} /><h3>{title}</h3><p>{description}</p></div>; }

export default function TeConnectDemo() {
  const [store, setStore] = useLocalState();
  const [module, setModule] = useState(store.activeModule || 'dashboard');
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [employeeRequest, setEmployeeRequest] = useState(null);
  const toastNow = (message) => { setToast(message); window.clearTimeout(window.__tcDemoToast); window.__tcDemoToast = window.setTimeout(() => setToast(null), 2800); };
  const go = (next, request = null) => { setModule(next); setStore((s) => ({ ...s, activeModule: next })); setEmployeeRequest(request); setMobileOpen(false); };
  useEffect(() => { document.documentElement.dataset.demoTheme = store.theme; }, [store.theme]);
  const setRole = (role) => setStore((s) => ({ ...s, role }));
  const reset = () => { setStore(seed); setModule('dashboard'); toastNow('Demonstração reposta com os dados iniciais.'); };
  const renderModule = () => {
    const common = { store, setStore, toast: toastNow };
    switch (module) {
      case 'dashboard': return <Dashboard {...common} go={go} />;
      case 'employees': return <Employees {...common} request={employeeRequest} />;
      case 'recruitment': return <Recruitment {...common} />;
      case 'onboarding': return <Onboarding {...common} />;
      case 'attendance': return <Attendance {...common} />;
      case 'shifts': return <Shifts {...common} />;
      case 'leaves': return <Leaves {...common} />;
      case 'documents': return <Documents {...common} />;
      case 'performance': return <Performance {...common} />;
      case 'intelligence': return <Intelligence {...common} />;
      case 'assistant': return <Assistant {...common} go={go} />;
      case 'notifications': return <Notifications {...common} />;
      default: return <Dashboard {...common} go={go} />;
    }
  };
  const unread = store.notifications.filter((n) => !n.read).length;
  const menu = useMemo(() => MODULES.map(([id, label, Icon]) => ({ id, label, Icon, count: id === 'notifications' ? unread : undefined })), [unread]);
  return <div className={`demo-shell demo-theme-${store.theme}`}>
    <aside className={`demo-sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="demo-brand"><div className="tc-brand-mark" /><div><strong>Te-connect</strong><span>Gestão em Recursos Humanos</span></div></div>
      <div className="demo-org"><div className="demo-org-icon">TC</div><div><strong>Te-connect Portugal</strong><span>People & Culture</span></div><ChevronRight size={15} /></div>
      <nav className="demo-nav">{menu.map(({ id, label, Icon, count }) => <button key={id} className={module === id ? 'active' : ''} onClick={() => go(id)}><Icon size={17} /><span>{label}</span>{count ? <Pill tone="danger">{count}</Pill> : null}</button>)}</nav>
      <div className="demo-sidebar-bottom"><div className="demo-role"><ShieldCheck size={16} /><div><span>Perfil ativo</span><strong>{ROLE_LABELS[store.role]}</strong></div><select aria-label="Perfil de acesso" value={store.role} onChange={(e) => setRole(e.target.value)}>{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><div className="demo-bottom-actions"><AppButton onClick={() => setStore((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))} icon={store.theme === 'dark' ? Sun : Moon}>{store.theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</AppButton><AppButton onClick={reset} icon={Trash2}>Repor demo</AppButton></div></div>
    </aside>
    <main className="demo-main"><header className="demo-topbar"><div className="demo-top-left"><button className="demo-icon-btn demo-mobile-menu" onClick={() => setMobileOpen((v) => !v)} aria-label="Abrir menu"><Menu size={18} /></button><div><span>Te-connect</span><ChevronRight size={14} /><strong>{MODULES.find(([id]) => id === module)?.[1]}</strong></div></div><div className="demo-top-right"><label className="demo-global-search"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar pessoas, tarefas ou documentos" /></label><Pill tone="success"><span className="demo-status-dot" /> Demo local ativa</Pill><button className="demo-icon-btn" onClick={() => go('notifications')} aria-label="Notificações"><Bell size={17} />{unread > 0 && <span className="demo-notification-count">{unread}</span>}</button></div></header><div className="demo-content">{search ? <div className="demo-search-results demo-card"><div className="demo-panel-head"><div><h2>Resultados para “{search}”</h2><span>Pesquisa global da demonstração.</span></div><AppButton onClick={() => setSearch('')}>Fechar</AppButton></div>{store.employees.filter((e) => `${e.name} ${e.role} ${e.team}`.toLowerCase().includes(search.toLowerCase())).slice(0, 6).map((e) => <button className="demo-search-item" key={e.id} onClick={() => { setSearch(''); go('employees'); }}><span className="demo-avatar">{e.photo}</span><div><strong>{e.name}</strong><span>{e.role} · {e.team}</span></div><ArrowRight size={15} /></button>)}{store.documents.filter((d) => `${d.employee} ${d.type}`.toLowerCase().includes(search.toLowerCase())).slice(0, 4).map((d) => <button className="demo-search-item" key={d.id} onClick={() => { setSearch(''); go('documents'); }}><FileText size={17} /><div><strong>{d.type}</strong><span>{d.employee} · {d.status}</span></div><ArrowRight size={15} /></button>)}</div> : renderModule()}</div></main>{toast && <div className="demo-toast"><CheckCircle2 size={17} />{toast}</div>}</div>;
}
