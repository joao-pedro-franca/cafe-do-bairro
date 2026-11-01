import { ContactLinks } from '../components/ContactLinks'
import { cafeConfig } from '../data/cafeConfig'
import '../styles/contato.css'

export function InformacoesContato() {
  const { horario, endereco } = cafeConfig

  return (
    <section className="info-section" id="contato" aria-labelledby="contato-title" tabIndex={-1}>
      <div className="container">
        <header className="info-heading">
          <p className="eyebrow">Um cantinho para chamar de casa</p>
          <h2 id="contato-title">Informações do café <span aria-hidden="true">♡</span></h2>
          <p>Um café, boas conversas e um pouquinho de carinho.</p>
        </header>
        <div className="info-grid">
          <section className="info-block" aria-labelledby="horario-title">
            <span className="info-icon" aria-hidden="true">◷</span>
            <div>
              <h3 id="horario-title">Horário de funcionamento</h3>
              {horario.confirmado && horario.dias && horario.horas ? <dl><dt>{horario.dias}</dt><dd className="info-hours">{horario.horas}</dd></dl> : <p>{horario.pendente}</p>}
            </div>
          </section>
          <section className="info-block" aria-labelledby="endereco-title">
            <span className="info-icon" aria-hidden="true">⌂</span>
            <div>
              <h3 id="endereco-title">Onde fica nossa casa</h3>
              {endereco.confirmado && endereco.rua && endereco.localidade ? <address>{endereco.rua}<br />{endereco.localidade}</address> : <p>{endereco.pendente}</p>}
            </div>
          </section>
          <section className="info-block info-contact" aria-labelledby="canais-title">
            <span className="info-icon" aria-hidden="true">♡</span>
            <div>
              <h3 id="canais-title">Fale com a gente</h3>
              <ContactLinks />
            </div>
          </section>
        </div>
        <div className="contact-note">
          <p>Escolha seus sabores e a data no <a href="#encomendas">formulário de encomenda</a>. A disponibilidade é conferida antes da confirmação.</p>
          <p>O pagamento é na retirada. Conversas pelo WhatsApp não registram pedidos automaticamente.</p>
        </div>
        <svg className="contact-sprig" viewBox="0 0 100 180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
          <path d="M45 175Q70 95 45 10M51 145Q15 129 22 105Q50 108 51 145ZM58 110Q95 90 85 69Q56 77 58 110ZM53 74Q20 61 29 39Q52 46 53 74ZM45 10Q30 30 48 42Q65 26 45 10Z" />
        </svg>
      </div>
    </section>
  )
}
