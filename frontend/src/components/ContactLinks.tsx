import { cafeConfig } from '../data/cafeConfig'
import { linkInstagram, linkWhatsApp } from '../utils/contato'

export function ContactLinks() {
  const { whatsapp, instagram } = cafeConfig.contato
  const whatsappUrl = linkWhatsApp(whatsapp)
  const instagramUrl = linkInstagram(instagram)

  return (
    <div className="contact-links" aria-label="Canais de contato">
      {whatsappUrl ? <a className="contact-link" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Encomendar pelo WhatsApp <span className="contact-new-tab">(nova aba)</span></a> : (
        <details className="contact-demo">
          <summary>WhatsApp <span>· demo</span></summary>
          <p>Número ilustrativo: {whatsapp.exibicao}. O contato será liberado quando houver um número autorizado. Nenhuma encomenda é registrada aqui.</p>
        </details>
      )}
      {instagramUrl ? <a className="contact-link" href={instagramUrl} target="_blank" rel="noopener noreferrer">Instagram <span className="contact-new-tab">(nova aba)</span></a> : (
        <details className="contact-demo">
          <summary>Instagram <span>· demo</span></summary>
          <p>{instagram.exibicao}. O link será disponibilizado quando o perfil oficial for confirmado.</p>
        </details>
      )}
    </div>
  )
}
