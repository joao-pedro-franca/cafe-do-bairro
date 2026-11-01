import { ContactLinks } from '../components/ContactLinks'
import { cafeConfig } from '../data/cafeConfig'

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-layout">
        <div className="hero-copy">
          <p className="eyebrow">De forno quentinho e coração aberto</p>
          <h1 id="hero-title">{cafeConfig.nome}<span className="handmade-heart" aria-hidden="true">♡</span></h1>
          <p className="hero-description">{cafeConfig.apresentacao}</p>
          <p className="hero-invitation">{cafeConfig.convite}</p>
          <dl className="cafe-info">
            <div><dt><span aria-hidden="true">◷</span> Nosso horário</dt><dd>{cafeConfig.horario.confirmado && cafeConfig.horario.dias && cafeConfig.horario.horas ? <>{cafeConfig.horario.dias}<br />{cafeConfig.horario.horas}</> : cafeConfig.horario.pendente}</dd></div>
            <div><dt><span aria-hidden="true">⌂</span> Nossa casa</dt><dd>{cafeConfig.endereco.confirmado && cafeConfig.endereco.rua && cafeConfig.endereco.localidade ? <>{cafeConfig.endereco.rua}<br />{cafeConfig.endereco.localidade}</> : cafeConfig.endereco.pendente}</dd></div>
          </dl>
          <ContactLinks />
          <div className="hero-actions">
            <a className="button button-primary" href="#cardapio">Conheça nosso cardápio <span aria-hidden="true">↓</span></a>
            <a className="button button-secondary" href="#encomendas">Faça sua encomenda <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <figure className="hero-figure">
          <img src={cafeConfig.hero.imagem} srcSet={`${cafeConfig.hero.imagemPequena} 768w, ${cafeConfig.hero.imagem} 1536w`} sizes="100vw" alt={cafeConfig.hero.descricaoImagem} width="1536" height="1024" fetchPriority="high" />
          <figcaption>{cafeConfig.hero.legenda}</figcaption>
        </figure>
      </div>
      <div className="gingham" aria-hidden="true" />
    </section>
  )
}
