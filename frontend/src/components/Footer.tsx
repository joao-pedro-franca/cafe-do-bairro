import { cafeConfig } from '../data/cafeConfig'
import { ContactLinks } from './ContactLinks'
import { CupIcon } from './CupIcon'
import '../styles/contato.css'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-identity">
            <a className="brand" href="#inicio" aria-label={`${cafeConfig.nome} — voltar ao início`}><CupIcon /><span>{cafeConfig.nome}</span></a>
            <p>{cafeConfig.apresentacao}</p>
            <p className="footer-signature">Feito para acolher, do primeiro gole ao último pedaço.</p>
          </div>
          <nav className="footer-nav" aria-label="Navegação do rodapé">
            <a href="#inicio">Início</a>
            <a href="#cardapio">Cardápio</a>
            <a href="#encomendas">Encomendas</a>
            <a href="#contato">Contato</a>
          </nav>
          <div className="footer-contact">
            <p className="footer-contact-title">A conversa continua por aqui</p>
            <ContactLinks />
          </div>
        </div>
        <div className="footer-bottom">
          <p>{cafeConfig.nome} · Feito com carinho.</p>
          <a href="/creditos-imagens.html">Créditos das fotografias</a>
          <a className="admin-link" href="/admin">Área administrativa</a>
        </div>
      </div>
    </footer>
  )
}
