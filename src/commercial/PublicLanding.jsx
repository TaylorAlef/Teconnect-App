import { ArrowRight, CheckCircle2, Clock3, MapPin, ShieldCheck, UsersRound, BarChart3, Smartphone, PlayCircle } from 'lucide-react';

const features = [
  { icon: Clock3, title: 'Ponto e assiduidade', text: 'Entradas, pausas, saídas, atrasos e horas trabalhadas num único lugar.' },
  { icon: MapPin, title: 'GPS no local de trabalho', text: 'Valide a picagem dentro do raio configurado para cada local.' },
  { icon: Smartphone, title: 'Feito para o telemóvel', text: 'O colaborador consegue marcar o ponto rapidamente sem depender do RH.' },
  { icon: UsersRound, title: 'RH numa só plataforma', text: 'Colaboradores, férias, ausências, turnos, aprovações e People 360.' },
  { icon: BarChart3, title: 'Decisões com dados', text: 'Dashboards, alertas, auditoria e indicadores para a gestão.' },
  { icon: ShieldCheck, title: 'Separação por empresa', text: 'Autenticação, permissões e isolamento dos dados por organização.' },
];

export default function PublicLanding({ onLogin, onSignup }) {
  return (
    <main className="tc-public">
      <nav className="tc-public-nav">
        <div className="tc-public-brand">
          <img src="/teconnect-logo.svg" alt="Te-connect" />
          <div><strong>Te-connect</strong><span>People OS para empresas</span></div>
        </div>
        <div className="tc-public-nav-actions">
          <a href="/support.html">Suporte</a>
          <button type="button" className="tc-public-login" onClick={onLogin}>Entrar</button>
          <button type="button" className="tc-public-cta" onClick={onSignup}>Começar grátis <ArrowRight size={16}/></button>
        </div>
      </nav>

      <section className="tc-public-hero">
        <div className="tc-public-copy">
          <div className="tc-public-badge"><span className="tc-public-dot"/> 14 dias para testar a operação</div>
          <h1>O ponto da sua equipa. <span>Sem Excel, sem confusão.</span></h1>
          <p>O Te-connect junta assiduidade, ponto móvel, GPS, horários e gestão de pessoas numa plataforma feita para empresas portuguesas.</p>
          <div className="tc-public-actions">
            <button type="button" className="tc-public-primary" onClick={onSignup}>Criar a minha empresa <ArrowRight size={18}/></button>
            <button type="button" className="tc-public-secondary" onClick={onLogin}><PlayCircle size={18}/> Já tenho uma conta</button>
          </div>
          <div className="tc-public-proof">
            <span><CheckCircle2 size={15}/> Configuração guiada</span>
            <span><CheckCircle2 size={15}/> Ponto com GPS</span>
            <span><CheckCircle2 size={15}/> Sem instalação de hardware</span>
          </div>
        </div>
        <div className="tc-public-preview">
          <div className="tc-preview-window">
            <div className="tc-preview-top"><span/><span/><span/><b>Te-connect · Central de RH</b></div>
            <div className="tc-preview-grid">
              <aside><strong>Te-connect</strong><small>Central de RH</small><i className="active">Visão geral</i><i>Ponto</i><i>Colaboradores</i><i>People 360</i></aside>
              <div className="tc-preview-main">
                <div className="tc-preview-heading"><small>SEGUNDA, HOJE</small><h3>Bom dia, equipa.</h3></div>
                <div className="tc-preview-kpis"><div><small>Presentes</small><strong>24</strong><em>+4 hoje</em></div><div><small>Em atraso</small><strong>2</strong><em>atenção</em></div><div><small>Horas hoje</small><strong>186h</strong><em>em curso</em></div></div>
                <div className="tc-preview-panel"><div><b>Assiduidade em tempo real</b><span>GPS ativo</span></div><div className="tc-preview-row"><strong>08:02</strong><span>Entrada · Sede Lisboa</span><em>Dentro do raio</em></div><div className="tc-preview-row"><strong>08:11</strong><span>Entrada · Obra Norte</span><em>Dentro do raio</em></div><div className="tc-preview-row"><strong>08:24</strong><span>Entrada · Escritório</span><em>Em validação</em></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="tc-public-strip"><strong>Uma empresa não precisa de mais uma folha de Excel.</strong><span>Precisa de saber quem está a trabalhar, onde está o ponto e o que exige atenção.</span></section>

      <section className="tc-public-section">
        <div className="tc-public-section-heading"><span>O que resolve</span><h2>Do primeiro ponto ao fecho do dia.</h2><p>O fluxo foi pensado para reduzir trabalho administrativo e dar ao RH uma fonte única de informação.</p></div>
        <div className="tc-public-features">{features.map(({icon: Icon,title,text}) => <article key={title}><div className="tc-public-feature-icon"><Icon size={20}/></div><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="tc-public-value">
        <div><span>COMEÇAR É SIMPLES</span><h2>Configure uma empresa e coloque o primeiro colaborador a picar.</h2><p>O onboarding orienta a criação da empresa, estrutura, local GPS, turno e primeiro colaborador. Depois, o RH continua a operar sozinho.</p><button type="button" className="tc-public-primary" onClick={onSignup}>Experimentar o Te-connect <ArrowRight size={18}/></button></div>
        <div className="tc-public-price"><small>A partir de</small><strong>49€<span>/mês</span></strong><p>Planos empresariais com 14 dias de trial.</p><a href="/terms.html">Termos</a><a href="/privacy.html">Privacidade</a></div>
      </section>

      <footer className="tc-public-footer"><span>© 2026 Te-connect · People OS para empresas</span><div><a href="/support.html">Suporte</a><a href="/privacy.html">Privacidade</a><a href="/terms.html">Termos</a></div></footer>
    </main>
  );
}
