import { cafeConfig } from '../data/cafeConfig'
import { CupIcon } from './CupIcon'

export function Header() {
  return (
    <header className="site-header" id="inicio">
      <div className="container header-content">
        <a className="brand" href="#inicio" aria-label={`${cafeConfig.nome} — início`}>
          <CupIcon /> <span>{cafeConfig.nome}</span>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#inicio">Início</a>
          <a href="#cardapio">Cardápio</a>
          <a href="#encomendas">Encomendas</a>
          <a href="#contato">Contato</a>
        </nav>
      </div>
    </header>
  )
}
