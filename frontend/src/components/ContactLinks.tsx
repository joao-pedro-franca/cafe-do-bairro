import { cafeConfig } from '../data/cafeConfig'

export function ContactLinks() {
  const { whatsapp, instagram } = cafeConfig.contato
  const whatsappUrl = whatsapp.confirmado && whatsapp.numero
    ? `https://wa.me/${whatsapp.numero}?text=${encodeURIComponent(whatsapp.mensagem)}`
    : null
  const instagramUrl = instagram.confirmado ? instagram.url : null

  return (
    <div className="contact-links" aria-label="Canais de contato">
      {whatsappUrl ? <a className="contact-link" href={whatsappUrl}>Encomendar pelo WhatsApp ↗</a> : (
        <details className="contact-demo">
          <summary>WhatsApp <span>· demo</span></summary>
          <p>Número ilustrativo: {whatsapp.exibicao}. O contato será liberado quando houver um número autorizado. Nenhuma encomenda é registrada aqui.</p>
        </details>
      )}
      {instagramUrl ? <a className="contact-link" href={instagramUrl}>Instagram ↗</a> : (
        <details className="contact-demo">
          <summary>Instagram <span>· demo</span></summary>
          <p>{instagram.exibicao}. O link será disponibilizado quando o perfil oficial for confirmado.</p>
        </details>
      )}
    </div>
  )
}
